import type { IpcMain } from 'electron'
import { Client } from 'ssh2'
import { IPC_CHANNELS } from '../ipc-channels'
import { dataStore } from '../store/dataStore'
import type { SSHConnection } from '../../types'

export function registerConnectionHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.CONNECTION.GET_ALL, async () => {
    try {
      return dataStore.getConnections()
    } catch (error) {
      console.error('Failed to get connections:', error)
      throw error
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.CONNECTION.CREATE,
    async (
      _event,
      conn: Omit<SSHConnection, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      try {
        return dataStore.createConnection(conn)
      } catch (error) {
        console.error('Failed to create connection:', error)
        throw error
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.CONNECTION.UPDATE,
    async (_event, id: string, updates: Partial<SSHConnection>) => {
      try {
        return dataStore.updateConnection(id, updates)
      } catch (error) {
        console.error('Failed to update connection:', error)
        throw error
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.CONNECTION.DELETE, async (_event, id: string) => {
    try {
      dataStore.deleteConnection(id)
    } catch (error) {
      console.error('Failed to delete connection:', error)
      throw error
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.CONNECTION.TEST,
    async (_event, conn: SSHConnection) => {
      return new Promise<boolean>((resolve) => {
        const client = new Client()

        client.on('ready', () => {
          client.end()
          resolve(true)
        })

        client.on('error', (err) => {
          console.error('Connection test failed:', err)
          resolve(false)
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

        try {
          client.connect(connectConfig)
        } catch (err) {
          console.error('Connection test error:', err)
          resolve(false)
        }
      })
    }
  )
}
