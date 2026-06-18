import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../ipc-channels'
import { dataStore } from '../store/dataStore'
import type { ConnectionGroup } from '../../types'

export function registerGroupHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.GROUP.GET_ALL, async () => {
    try {
      return dataStore.getGroups()
    } catch (error) {
      console.error('Failed to get groups:', error)
      throw error
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.GROUP.CREATE,
    async (_event, group: Omit<ConnectionGroup, 'id' | 'createdAt'>) => {
      try {
        return dataStore.createGroup(group)
      } catch (error) {
        console.error('Failed to create group:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GROUP.UPDATE,
    async (_event, id: string, updates: Partial<ConnectionGroup>) => {
      try {
        return dataStore.updateGroup(id, updates)
      } catch (error) {
        console.error('Failed to update group:', error)
        throw error
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.GROUP.DELETE, async (_event, id: string) => {
    try {
      dataStore.deleteGroup(id)
    } catch (error) {
      console.error('Failed to delete group:', error)
      throw error
    }
  })
}
