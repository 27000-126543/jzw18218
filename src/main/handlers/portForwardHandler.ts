import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../ipc-channels'
import { sshSessionManager } from '../ssh/sshSessionManager'
import type { PortForwardRule } from '../../types'

export function registerPortForwardHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.PORT_FORWARD.START,
    async (
      _event,
      sessionId: string,
      rule: Omit<PortForwardRule, 'id' | 'status' | 'connectionId'>
    ): Promise<PortForwardRule> => {
      try {
        return await sshSessionManager.startPortForward(sessionId, rule)
      } catch (error) {
        console.error('Failed to start port forward:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PORT_FORWARD.STOP,
    async (_event, sessionId: string, ruleId: string): Promise<void> => {
      try {
        await sshSessionManager.stopPortForward(sessionId, ruleId)
      } catch (error) {
        console.error('Failed to stop port forward:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PORT_FORWARD.LIST,
    async (_event, sessionId: string): Promise<PortForwardRule[]> => {
      try {
        return sshSessionManager.listPortForwards(sessionId)
      } catch (error) {
        console.error('Failed to list port forwards:', error)
        throw error
      }
    }
  )
}
