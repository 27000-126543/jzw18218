import { Client } from 'ssh2'
import type { SSHConnection, SFTPFile, PortForwardRule } from '../../types'

interface SSHSession {
  client: Client
  connection: SSHConnection
  isConnected: boolean
  dataCallbacks: Map<string, (data: string) => void>
  portForwards: Map<string, PortForwardRule>
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
          dataCallbacks: new Map(),
          portForwards: new Map(),
        }
        this.sessions.set(sessionId, session)
        resolve()
      })

      client.on('error', (err) => {
        reject(err)
      })

      const connectConfig: any = {
        host: conn.host,
        port: conn.port,
        username: conn.username,
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

  async disconnect(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return
    }

    for (const rule of session.portForwards.values()) {
      try {
        await this.stopPortForward(sessionId, rule.id)
      } catch (e) {
        // ignore
      }
    }

    return new Promise((resolve) => {
      session.client.end()
      session.client.on('close', () => {
        session.isConnected = false
        this.sessions.delete(sessionId)
        resolve()
      })
    })
  }

  isConnected(sessionId: string): boolean {
    return this.sessions.get(sessionId)?.isConnected ?? false
  }

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) {
      return
    }
    session.client.shell((err, stream) => {
      if (err) return
      stream.write(data)
    })
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) {
      return
    }
    session.client.shell((err, stream) => {
      if (err) return
      stream.setWindow(rows, cols, 0, 0)
    })
  }

  startShell(
    sessionId: string,
    onData: (data: string) => void
  ): void {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) {
      return
    }

    session.client.shell((err, stream) => {
      if (err) {
        console.error('Shell error:', err)
        return
      }

      stream.on('data', (data: Buffer) => {
        onData(data.toString())
      })

      stream.on('close', () => {
        session.isConnected = false
      })

      stream.on('error', (err: Error) => {
        console.error('Stream error:', err)
      })
    })
  }

  registerDataCallback(
    sessionId: string,
    callbackId: string,
    callback: (data: string) => void
  ): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.dataCallbacks.set(callbackId, callback)
    }
  }

  unregisterDataCallback(sessionId: string, callbackId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.dataCallbacks.delete(callbackId)
    }
  }

  getClient(sessionId: string): Client | undefined {
    return this.sessions.get(sessionId)?.client
  }

  async listFiles(sessionId: string, path: string): Promise<SFTPFile[]> {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) {
      throw new Error('Not connected')
    }

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) {
          reject(err)
          return
        }

        sftp.readdir(path, (err, list) => {
          if (err) {
            reject(err)
            return
          }

          const files: SFTPFile[] = list.map((item: any) => ({
            name: item.filename,
            isDirectory: item.longname.startsWith('d'),
            isFile: item.longname.startsWith('-'),
            size: item.attrs.size,
            modifyTime: item.attrs.mtime * 1000,
            accessTime: item.attrs.atime * 1000,
            rights: {
              user: item.attrs.mode ? this.parseRights(item.attrs.mode >> 6) : '---',
              group: item.attrs.mode ? this.parseRights(item.attrs.mode >> 3) : '---',
              other: item.attrs.mode ? this.parseRights(item.attrs.mode) : '---',
            },
            owner: item.attrs.uid,
            group: item.attrs.gid,
          }))

          resolve(files)
        })
      })
    })
  }

  async uploadFile(
    sessionId: string,
    localPath: string,
    remotePath: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) {
      throw new Error('Not connected')
    }

    const fs = require('fs')

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) {
          reject(err)
          return
        }

        const readStream = fs.createReadStream(localPath)
        const writeStream = sftp.createWriteStream(remotePath)

        writeStream.on('close', () => {
          resolve()
        })

        writeStream.on('error', (err: Error) => {
          reject(err)
        })

        readStream.pipe(writeStream)
      })
    })
  }

  async downloadFile(
    sessionId: string,
    remotePath: string,
    localPath: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) {
      throw new Error('Not connected')
    }

    const fs = require('fs')

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) {
          reject(err)
          return
        }

        const readStream = sftp.createReadStream(remotePath)
        const writeStream = fs.createWriteStream(localPath)

        writeStream.on('finish', () => {
          resolve()
        })

        writeStream.on('error', (err: Error) => {
          reject(err)
        })

        readStream.pipe(writeStream)
      })
    })
  }

  async deleteFile(sessionId: string, remotePath: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) {
      throw new Error('Not connected')
    }

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) {
          reject(err)
          return
        }

        sftp.unlink(remotePath, (err) => {
          if (err) {
            reject(err)
            return
          }
          resolve()
        })
      })
    })
  }

  async mkdir(sessionId: string, remotePath: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) {
      throw new Error('Not connected')
    }

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) {
          reject(err)
          return
        }

        sftp.mkdir(remotePath, (err) => {
          if (err) {
            reject(err)
            return
          }
          resolve()
        })
      })
    })
  }

  async rename(
    sessionId: string,
    oldPath: string,
    newPath: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) {
      throw new Error('Not connected')
    }

    return new Promise((resolve, reject) => {
      session.client.sftp((err, sftp) => {
        if (err) {
          reject(err)
          return
        }

        sftp.rename(oldPath, newPath, (err) => {
          if (err) {
            reject(err)
            return
          }
          resolve()
        })
      })
    })
  }

  async startPortForward(
    sessionId: string,
    rule: Omit<PortForwardRule, 'id' | 'status' | 'connectionId'>
  ): Promise<PortForwardRule> {
    const session = this.sessions.get(sessionId)
    if (!session?.isConnected) {
      throw new Error('Not connected')
    }

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
        const net = require('net')
        const server = net.createServer((socket: any) => {
          session.client.forwardOut(
            '127.0.0.1',
            0,
            rule.remoteHost,
            rule.remotePort,
            (err, stream) => {
              if (err) {
                socket.destroy()
                return
              }
              socket.pipe(stream)
              stream.pipe(socket)
            }
          )
        })

        server.listen(rule.localPort, '127.0.0.1', () => {
          session.portForwards.set(ruleId, portForwardRule)
          resolve(portForwardRule)
        })

        server.on('error', (err: Error) => {
          reject(err)
        })
      } else if (rule.type === 'remote') {
        session.client.forwardIn(
          rule.remoteHost,
          rule.remotePort,
          (err) => {
            if (err) {
              reject(err)
              return
            }
            session.portForwards.set(ruleId, portForwardRule)
            resolve(portForwardRule)
          }
        )
      } else {
        reject(new Error('Unsupported port forward type'))
      }
    })
  }

  async stopPortForward(sessionId: string, ruleId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return
    }

    const rule = session.portForwards.get(ruleId)
    if (!rule) {
      return
    }

    if (rule.type === 'remote') {
      return new Promise((resolve) => {
        session.client.unforwardIn(rule.remoteHost, rule.remotePort, () => {
          session.portForwards.delete(ruleId)
          resolve()
        })
      })
    }

    session.portForwards.delete(ruleId)
    rule.status = 'stopped'
  }

  listPortForwards(sessionId: string): PortForwardRule[] {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return []
    }
    return Array.from(session.portForwards.values())
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

export const sshSessionManager = new SSHSessionManager()
export default SSHSessionManager
