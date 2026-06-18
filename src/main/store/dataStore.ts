import Store from 'electron-store'
import type {
  SSHConnection,
  ConnectionGroup,
  CommandSnippet,
  ConnectionLog,
} from '../../types'

interface StoreSchema {
  connections: SSHConnection[]
  groups: ConnectionGroup[]
  snippets: CommandSnippet[]
  logs: ConnectionLog[]
}

class DataStore {
  private store: Store<StoreSchema>

  constructor() {
    this.store = new Store<StoreSchema>({
      defaults: {
        connections: [],
        groups: [],
        snippets: [],
        logs: [],
      },
    })
  }

  getConnections(): SSHConnection[] {
    return this.store.get('connections', [])
  }

  createConnection(
    conn: Omit<SSHConnection, 'id' | 'createdAt' | 'updatedAt'>
  ): SSHConnection {
    const connections = this.getConnections()
    const now = Date.now()
    const newConn: SSHConnection = {
      ...conn,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    }
    connections.push(newConn)
    this.store.set('connections', connections)
    return newConn
  }

  updateConnection(id: string, updates: Partial<SSHConnection>): SSHConnection {
    const connections = this.getConnections()
    const index = connections.findIndex((c) => c.id === id)
    if (index === -1) {
      throw new Error(`Connection not found: ${id}`)
    }
    const updated: SSHConnection = {
      ...connections[index],
      ...updates,
      id,
      updatedAt: Date.now(),
    }
    connections[index] = updated
    this.store.set('connections', connections)
    return updated
  }

  deleteConnection(id: string): void {
    const connections = this.getConnections().filter((c) => c.id !== id)
    this.store.set('connections', connections)
  }

  getGroups(): ConnectionGroup[] {
    return this.store.get('groups', [])
  }

  createGroup(
    group: Omit<ConnectionGroup, 'id' | 'createdAt'>
  ): ConnectionGroup {
    const groups = this.getGroups()
    const newGroup: ConnectionGroup = {
      ...group,
      id: this.generateId(),
      createdAt: Date.now(),
    }
    groups.push(newGroup)
    this.store.set('groups', groups)
    return newGroup
  }

  updateGroup(id: string, updates: Partial<ConnectionGroup>): ConnectionGroup {
    const groups = this.getGroups()
    const index = groups.findIndex((g) => g.id === id)
    if (index === -1) {
      throw new Error(`Group not found: ${id}`)
    }
    const updated: ConnectionGroup = {
      ...groups[index],
      ...updates,
      id,
    }
    groups[index] = updated
    this.store.set('groups', groups)
    return updated
  }

  deleteGroup(id: string): void {
    const groups = this.getGroups().filter((g) => g.id !== id)
    this.store.set('groups', groups)
  }

  getSnippets(): CommandSnippet[] {
    return this.store.get('snippets', [])
  }

  createSnippet(
    snippet: Omit<CommandSnippet, 'id' | 'createdAt'>
  ): CommandSnippet {
    const snippets = this.getSnippets()
    const newSnippet: CommandSnippet = {
      ...snippet,
      id: this.generateId(),
      createdAt: Date.now(),
    }
    snippets.push(newSnippet)
    this.store.set('snippets', snippets)
    return newSnippet
  }

  updateSnippet(
    id: string,
    updates: Partial<CommandSnippet>
  ): CommandSnippet {
    const snippets = this.getSnippets()
    const index = snippets.findIndex((s) => s.id === id)
    if (index === -1) {
      throw new Error(`Snippet not found: ${id}`)
    }
    const updated: CommandSnippet = {
      ...snippets[index],
      ...updates,
      id,
    }
    snippets[index] = updated
    this.store.set('snippets', snippets)
    return updated
  }

  deleteSnippet(id: string): void {
    const snippets = this.getSnippets().filter((s) => s.id !== id)
    this.store.set('snippets', snippets)
  }

  getLogs(): ConnectionLog[] {
    return this.store.get('logs', [])
  }

  getLogsByConnection(connectionId: string): ConnectionLog[] {
    return this.getLogs().filter((l) => l.connectionId === connectionId)
  }

  createLog(log: Omit<ConnectionLog, 'id'>): ConnectionLog {
    const logs = this.getLogs()
    const newLog: ConnectionLog = {
      ...log,
      id: this.generateId(),
    }
    logs.push(newLog)
    this.store.set('logs', logs)
    return newLog
  }

  updateLog(id: string, updates: Partial<ConnectionLog>): ConnectionLog {
    const logs = this.getLogs()
    const index = logs.findIndex((l) => l.id === id)
    if (index === -1) {
      throw new Error(`Log not found: ${id}`)
    }
    const updated: ConnectionLog = {
      ...logs[index],
      ...updates,
      id,
    }
    logs[index] = updated
    this.store.set('logs', logs)
    return updated
  }

  clearLogs(): void {
    this.store.set('logs', [])
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export const dataStore = new DataStore()
export default DataStore
