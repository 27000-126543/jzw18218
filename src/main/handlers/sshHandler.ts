import type { IpcMain, WebContents } from 'electron'
import { IPC_CHANNELS } from '../ipc-channels'
import { sshSessionManager } from '../ssh/sshSessionManager'
import type { SSHConnection } from '../../types'

export function registerSshHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.SSH.CONNECT,
    async (event, sessionId: string, conn: SSHConnection) => {
      try {
        const webContents = event.sender

        await sshSessionManager.connect(sessionId, conn)

        sshSessionManager.startShell(sessionId, (data: string) => {
          if (!webContents.isDestroyed()) {
            webContents.send(IPC_CHANNELS.SSH.DATA, sessionId, data)
          }
        })
      } catch (error) {
        console.error('Failed to connect SSH:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SSH.DISCONNECT,
    async (_event, sessionId: string) => {
      try {
        await sshSessionManager.disconnect(sessionId)
      } catch (error) {
        console.error('Failed to disconnect SSH:', error)
        throw error
      }
    }
  )

  ipcMain.on(
    IPC_CHANNELS.SSH.EXEC,
    (_event, sessionId: string, data: string) => {
      try {
        sshSessionManager.write(sessionId, data)
      } catch (error) {
        console.error('Failed to execute SSH command:', error)
      }
    }
  )

  ipcMain.on(
    IPC_CHANNELS.SSH.RESIZE,
    (_event, sessionId: string, cols: number, rows: number) => {
      try {
        sshSessionManager.resize(sessionId, cols, rows)
      } catch (error) {
        console.error('Failed to resize terminal:', error)
      }
    }
  )
}
