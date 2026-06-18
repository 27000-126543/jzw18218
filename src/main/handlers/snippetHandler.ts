import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../ipc-channels'
import { dataStore } from '../store/dataStore'
import type { CommandSnippet } from '../../types'

export function registerSnippetHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.SNIPPET.GET_ALL, async () => {
    try {
      return dataStore.getSnippets()
    } catch (error) {
      console.error('Failed to get snippets:', error)
      throw error
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.SNIPPET.CREATE,
    async (_event, snippet: Omit<CommandSnippet, 'id' | 'createdAt'>) => {
      try {
        return dataStore.createSnippet(snippet)
      } catch (error) {
        console.error('Failed to create snippet:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SNIPPET.UPDATE,
    async (_event, id: string, updates: Partial<CommandSnippet>) => {
      try {
        return dataStore.updateSnippet(id, updates)
      } catch (error) {
        console.error('Failed to update snippet:', error)
        throw error
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.SNIPPET.DELETE, async (_event, id: string) => {
    try {
      dataStore.deleteSnippet(id)
    } catch (error) {
      console.error('Failed to delete snippet:', error)
      throw error
    }
  })
}
