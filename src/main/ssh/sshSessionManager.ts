import { Client } from 'ssh2'
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

    for (const [ruleId, entry] of session.portForwards) {
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
        const server = net.createServer((socket: net.Socket) => {
          session.client.forwardOut(
            socket.remoteAddress ?? '127.0.0.1',
            socket.remotePort ?? 0,
            rule.remoteHost,
            rule.remotePort,
            (err, stream) => {
              if (err) {
                socket.destroy()
                return
              }
              socket.pipe(stream as any)
              ;(stream as any).pipe(socket)
              socket.on('error', () => { try { (stream as any).close() } catch(_e){} })
              ;(stream as any).on('error', () => { try { socket.destroy() } catch(_e){} })
            }
          )
        })

        server.listen(rule.localPort, '127.0.0.1', () => {
          session.portForwards.set(ruleId, { rule: portForwardRule, server })
          resolve(portForwardRule)
        })

        server.on('error', (err: Error) => {
          reject(err)
        })
      } else if (rule.type === 'remote') {
        session.client.forwardIn(rule.remoteHost, rule.remotePort, (err) => {
          if (err) { reject(err); return }

          session.client.on('tcp connection', (info, accept) => {
            const stream = accept()
            const localSocket = net.connect(rule.localPort, '127.0.0.1')
            localSocket.pipe(stream)
            stream.pipe(localSocket)
            localSocket.on('error', () => { try { stream.close() } catch(_e){} })
            stream.on('error', () => { try { localSocket.destroy() } catch(_e){} })
          })

          session.portForwards.set(ruleId, { rule: portForwardRule })
          resolve(portForwardRule)
        })
      } else if (rule.type === 'dynamic') {
        const server = net.createServer((socket: net.Socket) => {
          socket.on('data', (data: Buffer) => {
            try {
              const version = data[0]
              if (version === 5) {
                const cmd = data[1]
                if (cmd === 1) {
                  const addrType = data[3]
                  let host: string
                  let port: number
                  let offset: number

                  if (addrType === 1) {
                    host = `${data[4]}.${data[5]}.${data[6]}.${data[7]}`
                    port = data[8] * 256 + data[9]
                    offset = 10
                  } else if (addrType === 3) {
                    const addrLen = data[4]
                    host = data.slice(5, 5 + addrLen).toString()
                    port = data[5 + addrLen] * 256 + data[6 + addrLen]
                    offset = 7 + addrLen
                  } else {
                    socket.destroy()
                    return
                  }

                  session.client.forwardOut(
                    '127.0.0.1',
                    0,
                    host,
                    port,
                    (err, stream) => {
                      if (err) {
                        const resp = Buffer.alloc(10)
                        resp[0] = 5; resp[1] = 1
                        socket.write(resp)
                        socket.destroy()
                        return
                      }

                      const resp = Buffer.alloc(offset)
                      data.copy(resp)
                      resp[1] = 0
                      socket.write(resp)

                      socket.pipe(stream as any)
                      ;(stream as any).pipe(socket)
                      socket.on('error', () => { try { (stream as any).close() } catch(_e){} })
                      ;(stream as any).on('error', () => { try { socket.destroy() } catch(_e){} })
                    }
                  )
                } else if (cmd === 0) {
                  const resp = Buffer.alloc(data.length >= 3 ? 3 : 2)
                  resp[0] = 5; resp[1] = 0
                  if (data.length >= 3) {
                    resp[2] = 0
                  }
                  socket.write(resp)
                }
              } else if (version === 4) {
                const host = `${data[4]}.${data[5]}.${data[6]}.${data[7]}`
                const port = data[2] * 256 + data[3]

                session.client.forwardOut(
                  '127.0.0.1',
                  0,
                  host,
                  port,
                  (err, stream) => {
                    if (err) {
                      const resp = Buffer.alloc(8)
                      resp[0] = 0; resp[1] = 0x5b
                      socket.write(resp)
                      socket.destroy()
                      return
                    }
                    const resp = Buffer.alloc(8)
                    resp[0] = 0; resp[1] = 0x5a
                    resp.writeUInt16BE(port, 2)
                    socket.write(resp)

                    socket.pipe(stream as any)
                    ;(stream as any).pipe(socket)
                  }
                )
              }
            } catch (_e) {
              socket.destroy()
            }
          })
        })

        server.listen(rule.localPort, '127.0.0.1', () => {
          session.portForwards.set(ruleId, { rule: portForwardRule, server })
          resolve(portForwardRule)
        })

        server.on('error', (err: Error) => {
          reject(err)
        })
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

    const rule = entry.rule

    if (entry.server) {
      await new Promise<void>((resolve) => {
        entry.server!.close(() => resolve())
        try { (entry.server as any).closeAllConnections() } catch (_e) { /* */ }
      })
    }

    if (rule.type === 'remote' && session.client) {
      await new Promise<void>((resolve) => {
        session.client.unforwardIn(rule.remoteHost, rule.remotePort, () => resolve())
      })
    }

    entry.rule.status = 'stopped'
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

    if (entry.server) {
      try { entry.server.close() } catch (_e) { /* */ }
    }

    if (entry.rule.type === 'remote' && session.client) {
      try { session.client.unforwardIn(entry.rule.remoteHost, entry.rule.remotePort, () => {}) } catch (_e) { /* */ }
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
