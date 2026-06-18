import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../ipc-channels'
import { dataStore } from '../store/dataStore'
import type { ConnectionLog } from '../../types'

export function registerLogHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.LOG.GET_ALL, async () => {
    try {
      return dataStore.getLogs()
    } catch (error) {
      console.error('Failed to get logs:', error)
      throw error
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.LOG.GET_BY_CONNECTION,
    async (_event, connectionId: string) => {
      try {
        return dataStore.getLogsByConnection(connectionId)
      } catch (error) {
        console.error('Failed to get logs by connection:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.LOG.CREATE,
    async (_event, log: Omit<ConnectionLog, 'id'>) => {
      try {
        return dataStore.createLog(log)
      } catch (error) {
        console.error('Failed to create log:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.LOG.UPDATE,
    async (_event, id: string, updates: Partial<ConnectionLog>) => {
      try {
        return dataStore.updateLog(id, updates)
      } catch (error) {
        console.error('Failed to update log:', error)
        throw error
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.LOG.CLEAR, async () => {
    try {
      dataStore.clearLogs()
    } catch (error) {
      console.error('Failed to clear logs:', error)
      throw error
    }
  })
}
