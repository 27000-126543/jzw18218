import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../ipc-channels'
import { sshSessionManager } from '../ssh/sshSessionManager'
import type { SFTPFile } from '../../types'

export function registerSftpHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.SFTP.LIST,
    async (_event, sessionId: string, path: string): Promise<SFTPFile[]> => {
      try {
        return await sshSessionManager.listFiles(sessionId, path)
      } catch (error) {
        console.error('Failed to list files:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SFTP.UPLOAD,
    async (
      _event,
      sessionId: string,
      localPath: string,
      remotePath: string
    ): Promise<void> => {
      try {
        await sshSessionManager.uploadFile(sessionId, localPath, remotePath)
      } catch (error) {
        console.error('Failed to upload file:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SFTP.DOWNLOAD,
    async (
      _event,
      sessionId: string,
      remotePath: string,
      localPath: string
    ): Promise<void> => {
      try {
        await sshSessionManager.downloadFile(sessionId, remotePath, localPath)
      } catch (error) {
        console.error('Failed to download file:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SFTP.DELETE,
    async (_event, sessionId: string, remotePath: string): Promise<void> => {
      try {
        await sshSessionManager.deleteFile(sessionId, remotePath)
      } catch (error) {
        console.error('Failed to delete file:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SFTP.MKDIR,
    async (_event, sessionId: string, remotePath: string): Promise<void> => {
      try {
        await sshSessionManager.mkdir(sessionId, remotePath)
      } catch (error) {
        console.error('Failed to create directory:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SFTP.RENAME,
    async (
      _event,
      sessionId: string,
      oldPath: string,
      newPath: string
    ): Promise<void> => {
      try {
        await sshSessionManager.rename(sessionId, oldPath, newPath)
      } catch (error) {
        console.error('Failed to rename file:', error)
        throw error
      }
    }
  )
}
