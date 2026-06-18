import React, { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../store/appStore'
import { ConnectionTree } from '../ConnectionTree/ConnectionTree'
import { ConnectionModal } from '../ConnectionModal/ConnectionModal'
import { GroupModal } from '../GroupModal/GroupModal'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import type { SSHConnection, ConnectionGroup } from '../../../types'
import './Sidebar.css'

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  type: 'connection' | 'group' | 'empty'
  item?: SSHConnection | ConnectionGroup
}

export interface SidebarProps {
  onConnectionDoubleClick?: (connectionId: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onConnectionDoubleClick }) => {
  const {
    connections,
    groups,
    selectedConnectionId,
    setSelectedConnectionId,
    addConnection,
    updateConnection,
    removeConnection,
    addGroup,
    updateGroup,
    removeGroup,
  } = useAppStore()

  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([])
  const [connectionModalOpen, setConnectionModalOpen] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<SSHConnection | null>(null)
  const [editingGroup, setEditingGroup] = useState<ConnectionGroup | null>(null)
  const [parentGroupId, setParentGroupId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    type: 'empty',
  })

  const sidebarRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu((prev) => ({ ...prev, visible: false }))
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleGroup = (groupId: string) => {
    setExpandedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    )
  }

  const handleSelectConnection = (connection: SSHConnection) => {
    setSelectedConnectionId(connection.id)
  }

  const handleDoubleClickConnection = (connection: SSHConnection) => {
    setSelectedConnectionId(connection.id)
    onConnectionDoubleClick?.(connection.id)
  }

  const handleContextMenu = (
    type: 'connection' | 'group',
    item: SSHConnection | ConnectionGroup,
    event: React.MouseEvent
  ) => {
    event.preventDefault()
    const sidebarRect = sidebarRef.current?.getBoundingClientRect()
    if (!sidebarRect) return

    setContextMenu({
      visible: true,
      x: event.clientX - sidebarRect.left,
      y: event.clientY - sidebarRect.top,
      type,
      item,
    })
  }

  const handleNewConnection = () => {
    setEditingConnection(null)
    setParentGroupId(null)
    setConnectionModalOpen(true)
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleNewGroup = () => {
    setEditingGroup(null)
    setParentGroupId(null)
    setGroupModalOpen(true)
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleEditConnection = () => {
    if (contextMenu.item && contextMenu.type === 'connection') {
      setEditingConnection(contextMenu.item as SSHConnection)
      setConnectionModalOpen(true)
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleDeleteConnection = async () => {
    if (contextMenu.item && contextMenu.type === 'connection') {
      const conn = contextMenu.item as SSHConnection
      if (confirm(`确定要删除连接 "${conn.name}" 吗？`)) {
        try {
          await removeConnection(conn.id)
        } catch (error) {
          console.error('Failed to delete connection:', error)
          alert('删除连接失败')
        }
      }
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleTestConnection = async () => {
    if (contextMenu.item && contextMenu.type === 'connection') {
      const conn = contextMenu.item as SSHConnection
      try {
        const success = await window.electronAPI.connection.test(conn)
        alert(success ? '连接成功！' : '连接失败')
      } catch (error) {
        alert('连接测试失败')
      }
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleEditGroup = () => {
    if (contextMenu.item && contextMenu.type === 'group') {
      setEditingGroup(contextMenu.item as ConnectionGroup)
      setGroupModalOpen(true)
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleDeleteGroup = async () => {
    if (contextMenu.item && contextMenu.type === 'group') {
      const group = contextMenu.item as ConnectionGroup
      if (confirm(`确定要删除分组 "${group.name}" 吗？该分组下的连接不会被删除。`)) {
        try {
          await removeGroup(group.id)
        } catch (error) {
          console.error('Failed to delete group:', error)
          alert('删除分组失败')
        }
      }
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleNewConnectionInGroup = () => {
    if (contextMenu.item && contextMenu.type === 'group') {
      setParentGroupId(contextMenu.item.id)
      setEditingConnection(null)
      setConnectionModalOpen(true)
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleNewSubGroup = () => {
    if (contextMenu.item && contextMenu.type === 'group') {
      setParentGroupId(contextMenu.item.id)
      setEditingGroup(null)
      setGroupModalOpen(true)
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  const handleSaveConnection = async (
    data: Omit<SSHConnection, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      if (editingConnection) {
        await updateConnection(editingConnection.id, data)
      } else {
        const connData = {
          ...data,
          groupId: parentGroupId || data.groupId,
        }
        await addConnection(connData)
      }
      setConnectionModalOpen(false)
    } catch (error) {
      console.error('Failed to save connection:', error)
      alert('保存连接失败')
    }
  }

  const handleSaveGroup = async (data: Omit<ConnectionGroup, 'id' | 'createdAt'>) => {
    try {
      if (editingGroup) {
        await updateGroup(editingGroup.id, data)
      } else {
        const groupData = {
          ...data,
          parentId: parentGroupId || data.parentId,
        }
        await addGroup(groupData)
      }
      setGroupModalOpen(false)
    } catch (error) {
      console.error('Failed to save group:', error)
      alert('保存分组失败')
    }
  }

  const handleTestConnectionModal = async (
    data: Omit<SSHConnection, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<boolean> => {
    try {
      const testConn = {
        ...data,
        id: 'test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as SSHConnection
      return await window.electronAPI.connection.test(testConn)
    } catch (error) {
      console.error('Test connection failed:', error)
      return false
    }
  }

  const handleOpenSnippets = () => {}

  const handleOpenLogs = () => {}

  return (
    <div className="sidebar" ref={sidebarRef}>
      <div className="sidebar__header">
        <div className="sidebar__title">
          <Icon name="Terminal" size={20} className="sidebar__title-icon" />
          <span>SSH 连接管理器</span>
        </div>
      </div>

      <div className="sidebar__search">
        <div className="sidebar__search-input">
          <Icon name="Search" size={16} className="sidebar__search-icon" />
          <input type="text" placeholder="搜索连接、分组..." />
        </div>
      </div>

      <div className="sidebar__tree">
        <ConnectionTree
          groups={groups}
          connections={connections}
          selectedConnectionId={selectedConnectionId}
          expandedGroupIds={expandedGroupIds}
          onToggleGroup={handleToggleGroup}
          onSelectConnection={handleSelectConnection}
          onDoubleClickConnection={handleDoubleClickConnection}
          onContextMenu={handleContextMenu}
        />
      </div>

      <div className="sidebar__footer">
        <div className="sidebar__footer-actions">
          <Button
            variant="ghost"
            size="sm"
            block
            icon={<Icon name="Plus" size={14} />}
            onClick={handleNewConnection}
          >
            新建连接
          </Button>
          <Button
            variant="ghost"
            size="sm"
            block
            icon={<Icon name="FolderPlus" size={14} />}
            onClick={handleNewGroup}
          >
            新建分组
          </Button>
        </div>
        <div className="sidebar__footer-divider" />
        <div className="sidebar__footer-actions">
          <Button
            variant="ghost"
            size="sm"
            block
            icon={<Icon name="Code" size={14} />}
            onClick={handleOpenSnippets}
          >
            命令片段
          </Button>
          <Button
            variant="ghost"
            size="sm"
            block
            icon={<Icon name="FileText" size={14} />}
            onClick={handleOpenLogs}
          >
            连接日志
          </Button>
        </div>
      </div>

      {contextMenu.visible && (
        <div
          className="sidebar__context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          ref={contextMenuRef}
        >
          {contextMenu.type === 'connection' && (
            <>
              <div
                className="sidebar__context-item"
                onClick={handleEditConnection}
              >
                <Icon name="Edit" size={14} />
                <span>编辑连接</span>
              </div>
              <div
                className="sidebar__context-item"
                onClick={handleTestConnection}
              >
                <Icon name="Zap" size={14} />
                <span>测试连接</span>
              </div>
              <div className="sidebar__context-divider" />
              <div
                className="sidebar__context-item sidebar__context-item--danger"
                onClick={handleDeleteConnection}
              >
                <Icon name="Trash2" size={14} />
                <span>删除连接</span>
              </div>
            </>
          )}
          {contextMenu.type === 'group' && (
            <>
              <div
                className="sidebar__context-item"
                onClick={handleNewConnectionInGroup}
              >
                <Icon name="Plus" size={14} />
                <span>新建连接</span>
              </div>
              <div
                className="sidebar__context-item"
                onClick={handleNewSubGroup}
              >
                <Icon name="FolderPlus" size={14} />
                <span>新建子分组</span>
              </div>
              <div className="sidebar__context-divider" />
              <div className="sidebar__context-item" onClick={handleEditGroup}>
                <Icon name="Edit" size={14} />
                <span>编辑分组</span>
              </div>
              <div
                className="sidebar__context-item sidebar__context-item--danger"
                onClick={handleDeleteGroup}
              >
                <Icon name="Trash2" size={14} />
                <span>删除分组</span>
              </div>
            </>
          )}
        </div>
      )}

      <ConnectionModal
        open={connectionModalOpen}
        connection={editingConnection}
        groups={groups}
        onClose={() => setConnectionModalOpen(false)}
        onSave={handleSaveConnection}
        onTest={handleTestConnectionModal}
      />

      <GroupModal
        open={groupModalOpen}
        group={editingGroup}
        groups={groups}
        parentGroupId={parentGroupId}
        onClose={() => setGroupModalOpen(false)}
        onSave={handleSaveGroup}
      />
    </div>
  )
}

export default Sidebar
