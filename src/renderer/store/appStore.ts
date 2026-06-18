import { create } from 'zustand'
import type {
  SSHConnection,
  ConnectionGroup,
  CommandSnippet,
  ConnectionLog,
  TerminalTab,
} from '../../types'
import { generateId } from '../utils/id'

interface AppState {
  connections: SSHConnection[]
  groups: ConnectionGroup[]
  snippets: CommandSnippet[]
  logs: ConnectionLog[]
  tabs: TerminalTab[]
  activeTabId: string | null
  selectedConnectionId: string | null
  isLoading: boolean

  initialize: () => Promise<void>

  addConnection: (conn: Omit<SSHConnection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SSHConnection>
  updateConnection: (id: string, conn: Partial<SSHConnection>) => Promise<SSHConnection>
  removeConnection: (id: string) => Promise<void>
  setSelectedConnectionId: (id: string | null) => void

  addGroup: (group: Omit<ConnectionGroup, 'id' | 'createdAt'>) => Promise<ConnectionGroup>
  updateGroup: (id: string, group: Partial<ConnectionGroup>) => Promise<ConnectionGroup>
  removeGroup: (id: string) => Promise<void>

  addSnippet: (snippet: Omit<CommandSnippet, 'id' | 'createdAt'>) => Promise<CommandSnippet>
  updateSnippet: (id: string, snippet: Partial<CommandSnippet>) => Promise<CommandSnippet>
  removeSnippet: (id: string) => Promise<void>

  addLog: (log: Omit<ConnectionLog, 'id'>) => Promise<ConnectionLog>
  updateLog: (id: string, log: Partial<ConnectionLog>) => Promise<ConnectionLog>
  clearLogs: () => Promise<void>

  addTab: (connection: SSHConnection) => TerminalTab
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string | null) => void
  setActiveTabId: (tabId: string | null) => void
  updateTab: (tabId: string, updates: Partial<TerminalTab>) => void

  getConnectionById: (id: string) => SSHConnection | undefined
  getGroupById: (id: string) => ConnectionGroup | undefined
  getActiveTab: () => TerminalTab | undefined
}

export const useAppStore = create<AppState>((set, get) => ({
  connections: [],
  groups: [],
  snippets: [],
  logs: [],
  tabs: [],
  activeTabId: null,
  selectedConnectionId: null,
  isLoading: false,

  initialize: async () => {
    set({ isLoading: true })
    try {
      const [connections, groups, snippets, logs] = await Promise.all([
        window.electronAPI.connection.getAll(),
        window.electronAPI.group.getAll(),
        window.electronAPI.snippet.getAll(),
        window.electronAPI.log.getAll(),
      ])
      set({ connections, groups, snippets, logs })
    } catch (error) {
      console.error('Failed to initialize store:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  addConnection: async (conn) => {
    const newConn = await window.electronAPI.connection.create(conn)
    set((state) => ({
      connections: [...state.connections, newConn],
    }))
    return newConn
  },

  updateConnection: async (id, conn) => {
    const updatedConn = await window.electronAPI.connection.update(id, conn)
    set((state) => ({
      connections: state.connections.map((c) =>
        c.id === id ? updatedConn : c
      ),
    }))
    return updatedConn
  },

  removeConnection: async (id) => {
    await window.electronAPI.connection.remove(id)
    set((state) => {
      const tabsToRemove = state.tabs.filter((t) => t.connectionId === id)
      const newTabs = state.tabs.filter((t) => t.connectionId !== id)
      let newActiveTabId = state.activeTabId
      if (tabsToRemove.some((t) => t.id === state.activeTabId)) {
        newActiveTabId = newTabs.length > 0 ? newTabs[0].id : null
      }
      return {
        connections: state.connections.filter((c) => c.id !== id),
        tabs: newTabs,
        activeTabId: newActiveTabId,
        selectedConnectionId:
          state.selectedConnectionId === id ? null : state.selectedConnectionId,
      }
    })
  },

  setSelectedConnectionId: (id) => {
    set({ selectedConnectionId: id })
  },

  addGroup: async (group) => {
    const newGroup = await window.electronAPI.group.create(group)
    set((state) => ({
      groups: [...state.groups, newGroup],
    }))
    return newGroup
  },

  updateGroup: async (id, group) => {
    const updatedGroup = await window.electronAPI.group.update(id, group)
    set((state) => ({
      groups: state.groups.map((g) => (g.id === id ? updatedGroup : g)),
    }))
    return updatedGroup
  },

  removeGroup: async (id) => {
    const state = get()
    const descendantIds: string[] = []
    const findDescendants = (parentId: string) => {
      const children = state.groups.filter((g) => g.parentId === parentId)
      for (const child of children) {
        descendantIds.push(child.id)
        findDescendants(child.id)
      }
    }
    findDescendants(id)
    const allGroupIds = [id, ...descendantIds]

    await window.electronAPI.group.remove(id)

    set((s) => {
      const affectedConnections = s.connections.filter(
        (c) => allGroupIds.includes(c.groupId || '')
      )
      const affectedConnIds = new Set(affectedConnections.map((c) => c.id))
      const newTabs = s.tabs.filter((t) => !affectedConnIds.has(t.connectionId))
      let newActiveTabId = s.activeTabId
      if (newTabs.every((t) => t.id !== s.activeTabId)) {
        newActiveTabId = newTabs.length > 0 ? newTabs[0].id : null
      }

      return {
        groups: s.groups.filter((g) => !allGroupIds.includes(g.id)),
        connections: s.connections.filter(
          (c) => !allGroupIds.includes(c.groupId || '')
        ),
        tabs: newTabs,
        activeTabId: newActiveTabId,
        selectedConnectionId: allGroupIds.includes(
          s.connections.find((c) => c.id === s.selectedConnectionId)?.groupId || ''
        )
          ? null
          : s.selectedConnectionId,
      }
    })
  },

  addSnippet: async (snippet) => {
    const newSnippet = await window.electronAPI.snippet.create(snippet)
    set((state) => ({
      snippets: [...state.snippets, newSnippet],
    }))
    return newSnippet
  },

  updateSnippet: async (id, snippet) => {
    const updatedSnippet = await window.electronAPI.snippet.update(id, snippet)
    set((state) => ({
      snippets: state.snippets.map((s) =>
        s.id === id ? updatedSnippet : s
      ),
    }))
    return updatedSnippet
  },

  removeSnippet: async (id) => {
    await window.electronAPI.snippet.remove(id)
    set((state) => ({
      snippets: state.snippets.filter((s) => s.id !== id),
    }))
  },

  addLog: async (log) => {
    const newLog = await window.electronAPI.log.create(log)
    set((state) => ({
      logs: [...state.logs, newLog],
    }))
    return newLog
  },

  updateLog: async (id, log) => {
    const updatedLog = await window.electronAPI.log.update(id, log)
    set((state) => ({
      logs: state.logs.map((l) => (l.id === id ? updatedLog : l)),
    }))
    return updatedLog
  },

  clearLogs: async () => {
    await window.electronAPI.log.clear()
    set({ logs: [] })
  },

  addTab: (connection) => {
    const newTab: TerminalTab = {
      id: generateId(),
      connectionId: connection.id,
      connectionName: connection.name,
      isConnected: false,
      isSFTPOpen: false,
      currentPath: '/',
    }

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }))

    return newTab
  },

  removeTab: (tabId) => {
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== tabId)
      let newActiveTabId = state.activeTabId
      if (state.activeTabId === tabId) {
        newActiveTabId = newTabs.length > 0 ? newTabs[0].id : null
      }
      return {
        tabs: newTabs,
        activeTabId: newActiveTabId,
      }
    })
  },

  setActiveTab: (tabId) => {
    set({ activeTabId: tabId })
  },

  setActiveTabId: (tabId) => {
    set({ activeTabId: tabId })
  },

  updateTab: (tabId, updates) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, ...updates } : t
      ),
    }))
  },

  getConnectionById: (id) => {
    return get().connections.find((c) => c.id === id)
  },

  getGroupById: (id) => {
    return get().groups.find((g) => g.id === id)
  },

  getActiveTab: () => {
    const state = get()
    return state.tabs.find((t) => t.id === state.activeTabId)
  },
}))
