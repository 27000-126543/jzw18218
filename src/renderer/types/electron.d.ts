/// <reference path="../../types/index.ts" />

interface ElectronAPI {
  connection: {
    getAll: () => Promise<import('../../types').SSHConnection[]>
    create: (conn: Omit<import('../../types').SSHConnection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<import('../../types').SSHConnection>
    update: (id: string, conn: Partial<import('../../types').SSHConnection>) => Promise<import('../../types').SSHConnection>
    remove: (id: string) => Promise<void>
    test: (conn: import('../../types').SSHConnection) => Promise<boolean>
  }
  group: {
    getAll: () => Promise<import('../../types').ConnectionGroup[]>
    create: (group: Omit<import('../../types').ConnectionGroup, 'id' | 'createdAt'>) => Promise<import('../../types').ConnectionGroup>
    update: (id: string, group: Partial<import('../../types').ConnectionGroup>) => Promise<import('../../types').ConnectionGroup>
    remove: (id: string) => Promise<void>
  }
  snippet: {
    getAll: () => Promise<import('../../types').CommandSnippet[]>
    create: (snippet: Omit<import('../../types').CommandSnippet, 'id' | 'createdAt'>) => Promise<import('../../types').CommandSnippet>
    update: (id: string, snippet: Partial<import('../../types').CommandSnippet>) => Promise<import('../../types').CommandSnippet>
    remove: (id: string) => Promise<void>
  }
  log: {
    getAll: () => Promise<import('../../types').ConnectionLog[]>
    getByConnection: (connectionId: string) => Promise<import('../../types').ConnectionLog[]>
    create: (log: Omit<import('../../types').ConnectionLog, 'id'>) => Promise<import('../../types').ConnectionLog>
    update: (id: string, log: Partial<import('../../types').ConnectionLog>) => Promise<import('../../types').ConnectionLog>
    clear: () => Promise<void>
  }
  ssh: {
    connect: (sessionId: string, conn: import('../../types').SSHConnection) => Promise<void>
    disconnect: (sessionId: string) => Promise<void>
    write: (sessionId: string, data: string) => void
    resize: (sessionId: string, cols: number, rows: number) => void
    onData: (sessionId: string, callback: (data: string) => void) => () => void
  }
  sftp: {
    list: (sessionId: string, path: string) => Promise<import('../../types').SFTPFile[]>
    upload: (sessionId: string, localPath: string, remotePath: string) => Promise<void>
    download: (sessionId: string, remotePath: string, localPath: string) => Promise<void>
    delete: (sessionId: string, remotePath: string) => Promise<void>
    mkdir: (sessionId: string, remotePath: string) => Promise<void>
    rename: (sessionId: string, oldPath: string, newPath: string) => Promise<void>
  }
  portForward: {
    start: (sessionId: string, rule: Omit<import('../../types').PortForwardRule, 'id' | 'status' | 'connectionId'>) => Promise<import('../../types').PortForwardRule>
    stop: (sessionId: string, ruleId: string) => Promise<void>
    list: (sessionId: string) => Promise<import('../../types').PortForwardRule[]>
  }
}

interface Window {
  electronAPI: ElectronAPI
}
