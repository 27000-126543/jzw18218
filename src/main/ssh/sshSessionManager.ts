import { Client, ClientChannel } from 'ssh2'
import * as net from 'net'
import type { SSHConnection, SFTPFile, PortForwardRule } from '../../types'

interface ShellStream {
  write: (data: string | Buffer) => void
  setWindow: (rows: number, cols: number, height: number, width: number) => void
  close: () => void
}

interface PortForwardEntry {
  rule: PortForwardRule
  server?: net.Server
  activeSockets?: Set<net.Socket>
  tcpConnectionHandler?: (info: any, accept: any) => void
  boundRemotePort?: number
  boundRemoteHost?: string
}

interface SSHSession {
  client: Client
  connection: SSHConnection
  isConnected: boolean
  shell: ShellStream | null
  portForwards: Map<string, PortForwardEntry>
}

class SSHSessionManager {
  private sessions: Map<string, SSHSession> = new Map()

  async connect(sessionId: string, conn: SSHConnection): Promise<void> {
    const existing = this.sessions.get(sessionId)
    if (existing?.isConnected) {
      return
    }

    const client = new Client()

    return new Promise((resolve, reject) => {
      client.on('ready', () => {
        const session: SSHSession = {
          client,
          connection: conn,
          isConnected: true,
          shell: null,
          portForwards: new Map(),
        }
        this.sessions.set(sessionId, session)
        resolve()
      })

      client.on('error', (err) => {
        reject(err)
      })

      client.on('close', () => {
        const s = this.sessions.get(sessionId)
        if (s) {
          s.isConnected = false
          s.shell = null
        }
      })

      const connectConfig: any = {
        host: conn.host,
        port: conn.port,
        username: conn.username,
        readyTimeout: 15000,
      }

      if (conn.authType === 'password') {
        connectConfig.password = conn.password
      } else if (conn.authType === 'privateKey') {
        connectConfig.privateKey = conn.privateKey
        if (conn.passphrase) {
          connectConfig.passphrase = conn.passphrase
        }
      }

      client.connect(connectConfig)
    })
  }

  startShell(
    sessionId: string,
    onData: (data: string) => void
  ): void {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) {
      throw new Error('Session not connected')
    }

    if (session.shell) {
      return
    }

    session.client.shell(
      { term: 'xterm-256color', cols: 80, rows: 24 },
      (err, stream) => {
        if (err) {
          console.error('Shell error:', err)
          return
        }

        session.shell = stream

        stream.on('data', (data: Buffer) => {
          onData(data.toString())
        })

        stream.stderr?.on('data', (data: Buffer) => {
          onData(data.toString())
        })

        stream.on('close', () => {
          session.isConnected = false
          session.shell = null
        })

        stream.on('error', (err: Error) => {
          console.error('Stream error:', err)
        })
      }
    )
  }

  async disconnect(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return
    }

    for (const [ruleId] of session.portForwards) {
      try {
        await this.stopPortForward(sessionId, ruleId)
      } catch (_e) {
        // ignore
      }
    }

    if (session.shell) {
      try { session.shell.close() } catch (_e) { /* ignore */ }
      session.shell = null
    }

    return new Promise((resolve) => {
      const onClose = () => {
        session.isConnected = false
        this.sessions.delete(sessionId)
        resolve()
      }

      client_safe_end(session.client, onClose)
    })
  }

  isConnected(sessionId: string): boolean {
    return this.sessions.get(sessionId)?.isConnected ?? false
  }

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected || !session.shell) {
      return
    }
    session.shell.write(data)
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected || !session.shell) {
      return
    }
    session.shell.setWindow(rows, cols, 0, 0)
  }

  getClient(sessionId: string): Client | undefined {
    return this.sessions.get(sessionId)?.client
  }

  async listFiles(sessionId: string, remotePath: string): Promise<SFTPFile[]> {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) {
      throw new Error('Not connected')
    }

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) { reject(err); return }

        sftp.readdir(remotePath, (err, list) => {
          if (err) { reject(err); return }

          const files: SFTPFile[] = list.map((item: any) => ({
            name: item.filename,
            isDirectory: item.longname?.startsWith('d') ?? false,
            isFile: item.longname?.startsWith('-') ?? false,
            size: item.attrs.size ?? 0,
            modifyTime: (item.attrs.mtime ?? 0) * 1000,
            accessTime: (item.attrs.atime ?? 0) * 1000,
            rights: {
              user: item.attrs.mode ? this.parseRights(item.attrs.mode >> 6) : '---',
              group: item.attrs.mode ? this.parseRights((item.attrs.mode >> 3) & 7) : '---',
              other: item.attrs.mode ? this.parseRights(item.attrs.mode & 7) : '---',
            },
            owner: item.attrs.uid ?? 0,
            group: item.attrs.gid ?? 0,
          }))

          resolve(files)
        })
      })
    })
  }

  async uploadFile(sessionId: string, localPath: string, remotePath: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) throw new Error('Not connected')

    const fs = require('fs')

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) { reject(err); return }

        const readStream = fs.createReadStream(localPath)
        const writeStream = sftp.createWriteStream(remotePath)

        writeStream.on('close', () => resolve())
        writeStream.on('error', (e: Error) => reject(e))
        readStream.on('error', (e: Error) => reject(e))
        readStream.pipe(writeStream)
      })
    })
  }

  async downloadFile(sessionId: string, remotePath: string, localPath: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) throw new Error('Not connected')

    const fs = require('fs')

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) { reject(err); return }

        const readStream = sftp.createReadStream(remotePath)
        const writeStream = fs.createWriteStream(localPath)

        writeStream.on('finish', () => resolve())
        writeStream.on('error', (e: Error) => reject(e))
        readStream.on('error', (e: Error) => reject(e))
        readStream.pipe(writeStream)
      })
    })
  }

  async deleteFile(sessionId: string, remotePath: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) throw new Error('Not connected')

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) { reject(err); return }
        sftp.unlink(remotePath, (e: any) => e ? reject(e) : resolve())
      })
    })
  }

  async mkdir(sessionId: string, remotePath: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) throw new Error('Not connected')

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) { reject(err); return }
        sftp.mkdir(remotePath, (e: any) => e ? reject(e) : resolve())
      })
    })
  }

  async rename(sessionId: string, oldPath: string, newPath: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) throw new Error('Not connected')

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) { reject(err); return }
        sftp.rename(oldPath, newPath, (e: any) => e ? reject(e) : resolve())
      })
    })
  }

  private startLocalForward(
    session: SSHSession,
    ruleId: string,
    portForwardRule: PortForwardRule,
    resolve: (r: PortForwardRule) => void,
    reject: (e: any) => void
  ): void {
    const activeSockets = new Set<net.Socket>()
    const server = net.createServer((socket: net.Socket) => {
      activeSockets.add(socket)
      socket.on('close', () => activeSockets.delete(socket))

      session.client.forwardOut(
        socket.remoteAddress ?? '127.0.0.1',
        socket.remotePort ?? 0,
        portForwardRule.remoteHost,
        portForwardRule.remotePort,
        (err, stream) => {
          if (err) {
            socket.destroy()
            return
          }

          const s = stream as ClientChannel
          socket.pipe(s)
          s.pipe(socket)

          const cleanup = () => {
            try { s.close() } catch (_e) { /* */ }
            try { socket.destroy() } catch (_e) { /* */ }
          }
          socket.on('error', cleanup)
          s.on('error', cleanup)
          socket.on('close', cleanup)
          s.on('close', cleanup)
        }
      )
    })

    server.listen(portForwardRule.localPort, '127.0.0.1', () => {
      session.portForwards.set(ruleId, { rule: portForwardRule, server, activeSockets })
      resolve(portForwardRule)
    })

    server.on('error', (err: Error) => {
      reject(err)
    })
  }

  private startRemoteForward(
    session: SSHSession,
    ruleId: string,
    portForwardRule: PortForwardRule,
    resolve: (r: PortForwardRule) => void,
    reject: (e: any) => void
  ): void {
    const tcpConnectionHandler = (info: any, accept: any) => {
      try {
        const stream = accept() as ClientChannel
        const localSocket = net.connect(portForwardRule.localPort, '127.0.0.1')

        const cleanup = () => {
          try { stream.close() } catch (_e) { /* */ }
          try { localSocket.destroy() } catch (_e) { /* */ }
        }

        localSocket.on('connect', () => {
          localSocket.pipe(stream)
          stream.pipe(localSocket)
        })
        localSocket.on('error', cleanup)
        stream.on('error', cleanup)
        localSocket.on('close', cleanup)
        stream.on('close', cleanup)
      } catch (_e) { /* ignore */ }
    }

    session.client.forwardIn(portForwardRule.remoteHost, portForwardRule.remotePort, (err, boundPort) => {
      if (err) { reject(err); return }

      session.client.on('tcp connection', tcpConnectionHandler)

      session.portForwards.set(ruleId, {
        rule: portForwardRule,
        tcpConnectionHandler,
        boundRemoteHost: portForwardRule.remoteHost,
        boundRemotePort: boundPort ?? portForwardRule.remotePort,
      })

      resolve(portForwardRule)
    })
  }

  private startDynamicForward(
    session: SSHSession,
    ruleId: string,
    portForwardRule: PortForwardRule,
    resolve: (r: PortForwardRule) => void,
    reject: (e: any) => void
  ): void {
    const activeSockets = new Set<net.Socket>()
    const server = net.createServer()

    server.on('connection', (socket: net.Socket) => {
      activeSockets.add(socket)
      socket.on('close', () => activeSockets.delete(socket))
      socket.on('error', () => { try { socket.destroy() } catch (_e) { /* */ } })

      let buf: Buffer[] = []
      let state: 'handshake' | 'request' | 'established' = 'handshake'

      const handleData = (data: Buffer) => {
        if (state === 'established') return

        buf.push(data)
        const total = Buffer.concat(buf)

        if (state === 'handshake') {
          if (total.length < 2) return
          if (total[0] !== 0x05) {
            try { socket.destroy() } catch (_e) { /* */ }
            return
          }
          const numMethods = total[1]
          if (total.length < 2 + numMethods) return

          const reply = Buffer.alloc(2)
          reply[0] = 0x05
          reply[1] = 0x00
          socket.write(reply)

          state = 'request'
          buf = []
        } else if (state === 'request') {
          if (total.length < 4) return
          if (total[0] !== 0x05 || total[1] !== 0x01) {
            socket.write(Buffer.from([0x05, 0x07]))
            try { socket.destroy() } catch (_e) { /* */ }
            return
          }

          const atyp = total[3]
          let host: string
          let port: number
          let needBytes = 4

          if (atyp === 0x01) {
            needBytes = 10
            if (total.length < needBytes) return
            host = `${total[4]}.${total[5]}.${total[6]}.${total[7]}`
            port = (total[8] << 8) | total[9]
          } else if (atyp === 0x03) {
            if (total.length < 5) return
            const hostLen = total[4]
            needBytes = 5 + hostLen + 2
            if (total.length < needBytes) return
            host = total.slice(5, 5 + hostLen).toString()
            port = (total[5 + hostLen] << 8) | total[5 + hostLen + 1]
          } else {
            socket.write(Buffer.from([0x05, 0x08]))
            try { socket.destroy() } catch (_e) { /* */ }
            return
          }

          socket.removeListener('data', handleData)

          session.client.forwardOut(
            '127.0.0.1', 0, host, port,
            (err, stream) => {
              if (err) {
                try {
                  const resp = Buffer.alloc(atyp === 0x03 ? needBytes : 10)
                  resp[0] = 0x05
                  resp[1] = 0x05
                  socket.write(resp)
                } catch (_e) { /* */ }
                try { socket.destroy() } catch (_e) { /* */ }
                return
              }

              const s = stream as ClientChannel

              try {
                const resp = Buffer.alloc(atyp === 0x03 ? needBytes : 10)
                resp[0] = 0x05
                resp[1] = 0x00
                resp[2] = 0x00
                resp[3] = atyp
                if (atyp === 0x01) {
                  resp[4] = total[4]
                  resp[5] = total[5]
                  resp[6] = total[6]
                  resp[7] = total[7]
                  resp[8] = total[8]
                  resp[9] = total[9]
                } else {
                  for (let i = 4; i < needBytes; i++) resp[i] = total[i]
                }
                socket.write(resp)
              } catch (_e) { /* */ }

              state = 'established'

              if (total.length > needBytes) {
                try { s.write(total.slice(needBytes)) } catch (_e) { /* */ }
              }

              socket.pipe(s)
              s.pipe(socket)

              const cleanup = () => {
                try { s.close() } catch (_e) { /* */ }
                try { socket.destroy() } catch (_e) { /* */ }
              }
              socket.on('error', cleanup)
              s.on('error', cleanup)
              socket.on('close', cleanup)
              s.on('close', cleanup)
            }
          )
        }
      }

      socket.on('data', handleData)
    })

    server.listen(portForwardRule.localPort, '127.0.0.1', () => {
      session.portForwards.set(ruleId, { rule: portForwardRule, server, activeSockets })
      resolve(portForwardRule)
    })

    server.on('error', (err: Error) => {
      reject(err)
    })
  }

  async startPortForward(
    sessionId: string,
    rule: Omit<PortForwardRule, 'id' | 'status' | 'connectionId'>
  ): Promise<PortForwardRule> {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) throw new Error('Not connected')

    const ruleId = this.generateId()
    const portForwardRule: PortForwardRule = {
      id: ruleId,
      connectionId: session.connection.id,
      type: rule.type,
      localPort: rule.localPort,
      remoteHost: rule.remoteHost,
      remotePort: rule.remotePort,
      status: 'running',
    }

    return new Promise((resolve, reject) => {
      if (rule.type === 'local') {
        this.startLocalForward(session, ruleId, portForwardRule, resolve, reject)
      } else if (rule.type === 'remote') {
        this.startRemoteForward(session, ruleId, portForwardRule, resolve, reject)
      } else if (rule.type === 'dynamic') {
        this.startDynamicForward(session, ruleId, portForwardRule, resolve, reject)
      } else {
        reject(new Error('Unsupported port forward type'))
      }
    })
  }

  async stopPortForward(sessionId: string, ruleId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const entry = session.portForwards.get(ruleId)
    if (!entry) return

    if (entry.activeSockets) {
      for (const sock of entry.activeSockets) {
        try {
          sock.removeAllListeners()
          sock.destroy()
        } catch (_e) {
          // ignore
        }
      }
      entry.activeSockets.clear()
    }

    if (entry.server) {
      await new Promise<void>((resolve) => {
        try {
          ;(entry.server as any).closeAllConnections?.()
        } catch (_e) { /* */ }

        const t = setTimeout(() => resolve(), 1000)
        try {
          entry.server!.close(() => {
            clearTimeout(t)
            resolve()
          })
        } catch (_e) {
          clearTimeout(t)
          resolve()
        }
      })
      entry.server.removeAllListeners()
    }

    if (entry.tcpConnectionHandler && session.client) {
      session.client.removeListener('tcp connection', entry.tcpConnectionHandler)
    }

    if (entry.rule.type === 'remote' && session.client) {
      await new Promise<void>((resolve) => {
        const t = setTimeout(() => resolve(), 1000)
        try {
          session.client.unforwardIn(
            entry.boundRemoteHost ?? entry.rule.remoteHost,
            entry.boundRemotePort ?? entry.rule.remotePort,
            () => {
              clearTimeout(t)
              resolve()
            }
          )
        } catch (_e) {
          clearTimeout(t)
          resolve()
        }
      })
    }

    session.portForwards.delete(ruleId)
  }

  listPortForwards(sessionId: string): PortForwardRule[] {
    const session = this.sessions.get(sessionId)
    if (!session) return []
    return Array.from(session.portForwards.values()).map((e) => ({ ...e.rule }))
  }

  closeAll(): void {
    for (const sessionId of this.sessions.keys()) {
      try {
        const session = this.sessions.get(sessionId)!
        if (session.shell) {
          try { session.shell.close() } catch (_e) { /* */ }
        }
        for (const [ruleId] of session.portForwards) {
          try { this.stopPortForwardSync(sessionId, ruleId) } catch (_e) { /* */ }
        }
        try { session.client.end() } catch (_e) { /* */ }
      } catch (_e) { /* */ }
    }
    this.sessions.clear()
  }

  private stopPortForwardSync(sessionId: string, ruleId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    const entry = session.portForwards.get(ruleId)
    if (!entry) return

    if (entry.activeSockets) {
      for (const sock of entry.activeSockets) {
        try { sock.destroy() } catch (_e) { /* */ }
      }
    }
    if (entry.server) {
      try {
        ;(entry.server as any).closeAllConnections?.()
        entry.server.close()
      } catch (_e) { /* */ }
    }
    if (entry.tcpConnectionHandler && session.client) {
      try { session.client.removeListener('tcp connection', entry.tcpConnectionHandler) } catch (_e) { /* */ }
    }
    if (entry.rule.type === 'remote' && session.client) {
      try {
        session.client.unforwardIn(
          entry.boundRemoteHost ?? entry.rule.remoteHost,
          entry.boundRemotePort ?? entry.rule.remotePort,
          () => {}
        )
      } catch (_e) { /* */ }
    }
    session.portForwards.delete(ruleId)
  }

  private parseRights(mode: number): string {
    let rights = ''
    rights += mode & 4 ? 'r' : '-'
    rights += mode & 2 ? 'w' : '-'
    rights += mode & 1 ? 'x' : '-'
    return rights
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

function client_safe_end(client: Client, onClose: () => void) {
  let closed = false
  const done = () => {
    if (!closed) { closed = true; onClose() }
  }
  client.on('close', done)
  try { client.end() } catch (_e) { done() }
  setTimeout(done, 3000)
}

export const sshSessionManager = new SSHSessionManager()
export default SSHSessionManager
