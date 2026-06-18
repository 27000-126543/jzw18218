import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from './ipc-channels'
import type {
  SSHConnection,
  ConnectionGroup,
  CommandSnippet,
  ConnectionLog,
  SFTPFile,
  PortForwardRule,
} from '../types'

const api = {
  connection: {
    getAll: (): Promise<SSHConnection[]> => {
      return ipcRenderer.invoke(IPC_CHANNELS.CONNECTION.GET_ALL)
    },
    create: (
      conn: Omit<SSHConnection, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<SSHConnection> => {
      return ipcRenderer.invoke(IPC_CHANNELS.CONNECTION.CREATE, conn)
    },
    update: (
      id: string,
      conn: Partial<SSHConnection>
    ): Promise<SSHConnection> => {
      return ipcRenderer.invoke(IPC_CHANNELS.CONNECTION.UPDATE, id, conn)
    },
    remove: (id: string): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.CONNECTION.DELETE, id)
    },
    test: (conn: SSHConnection): Promise<boolean> => {
      return ipcRenderer.invoke(IPC_CHANNELS.CONNECTION.TEST, conn)
    },
  },
  group: {
    getAll: (): Promise<ConnectionGroup[]> => {
      return ipcRenderer.invoke(IPC_CHANNELS.GROUP.GET_ALL)
    },
    create: (
      group: Omit<ConnectionGroup, 'id' | 'createdAt'>
    ): Promise<ConnectionGroup> => {
      return ipcRenderer.invoke(IPC_CHANNELS.GROUP.CREATE, group)
    },
    update: (
      id: string,
      group: Partial<ConnectionGroup>
    ): Promise<ConnectionGroup> => {
      return ipcRenderer.invoke(IPC_CHANNELS.GROUP.UPDATE, id, group)
    },
    remove: (id: string): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.GROUP.DELETE, id)
    },
  },
  snippet: {
    getAll: (): Promise<CommandSnippet[]> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.GET_ALL)
    },
    create: (
      snippet: Omit<CommandSnippet, 'id' | 'createdAt'>
    ): Promise<CommandSnippet> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.CREATE, snippet)
    },
    update: (
      id: string,
      snippet: Partial<CommandSnippet>
    ): Promise<CommandSnippet> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.UPDATE, id, snippet)
    },
    remove: (id: string): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.DELETE, id)
    },
  },
  log: {
    getAll: (): Promise<ConnectionLog[]> => {
      return ipcRenderer.invoke(IPC_CHANNELS.LOG.GET_ALL)
    },
    getByConnection: (connectionId: string): Promise<ConnectionLog[]> => {
      return ipcRenderer.invoke(IPC_CHANNELS.LOG.GET_BY_CONNECTION, connectionId)
    },
    create: (log: Omit<ConnectionLog, 'id'>): Promise<ConnectionLog> => {
      return ipcRenderer.invoke(IPC_CHANNELS.LOG.CREATE, log)
    },
    update: (
      id: string,
      log: Partial<ConnectionLog>
    ): Promise<ConnectionLog> => {
      return ipcRenderer.invoke(IPC_CHANNELS.LOG.UPDATE, id, log)
    },
    clear: (): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.LOG.CLEAR)
    },
  },
  ssh: {
    connect: (sessionId: string, conn: SSHConnection): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SSH.CONNECT, sessionId, conn)
    },
    disconnect: (sessionId: string): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SSH.DISCONNECT, sessionId)
    },
    write: (sessionId: string, data: string): void => {
      ipcRenderer.send(IPC_CHANNELS.SSH.EXEC, sessionId, data)
    },
    resize: (sessionId: string, cols: number, rows: number): void => {
      ipcRenderer.send(IPC_CHANNELS.SSH.RESIZE, sessionId, cols, rows)
    },
    onData: (
      sessionId: string,
      callback: (data: string) => void
    ): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, sid: string, data: string) => {
        if (sid === sessionId) {
          callback(data)
        }
      }
      ipcRenderer.on(IPC_CHANNELS.SSH.DATA, handler)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.SSH.DATA, handler)
      }
    },
  },
  sftp: {
    list: (sessionId: string, path: string): Promise<SFTPFile[]> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SFTP.LIST, sessionId, path)
    },
    upload: (
      sessionId: string,
      localPath: string,
      remotePath: string
    ): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SFTP.UPLOAD, sessionId, localPath, remotePath)
    },
    download: (
      sessionId: string,
      remotePath: string,
      localPath: string
    ): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SFTP.DOWNLOAD, sessionId, remotePath, localPath)
    },
    delete: (sessionId: string, remotePath: string): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SFTP.DELETE, sessionId, remotePath)
    },
    mkdir: (sessionId: string, remotePath: string): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SFTP.MKDIR, sessionId, remotePath)
    },
    rename: (
      sessionId: string,
      oldPath: string,
      newPath: string
    ): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.SFTP.RENAME, sessionId, oldPath, newPath)
    },
  },
  portForward: {
    start: (
      sessionId: string,
      rule: Omit<PortForwardRule, 'id' | 'status' | 'connectionId'>
    ): Promise<PortForwardRule> => {
      return ipcRenderer.invoke(IPC_CHANNELS.PORT_FORWARD.START, sessionId, rule)
    },
    stop: (sessionId: string, ruleId: string): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNELS.PORT_FORWARD.STOP, sessionId, ruleId)
    },
    list: (sessionId: string): Promise<PortForwardRule[]> => {
      return ipcRenderer.invoke(IPC_CHANNELS.PORT_FORWARD.LIST, sessionId)
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
