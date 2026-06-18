import React, { useState, useEffect } from 'react'
import classNames from 'classnames'
import { Icon } from '../Icon/Icon'
import type { SSHConnection, ConnectionGroup } from '../../../types'
import './ConnectionTree.css'

export interface ContextMenuItem {
  key: string
  label: string
  icon?: string
  danger?: boolean
  divider?: boolean
}

export interface ConnectionTreeProps {
  groups: ConnectionGroup[]
  connections: SSHConnection[]
  selectedConnectionId?: string | null
  expandedGroupIds?: string[]
  onToggleGroup?: (groupId: string) => void
  onSelectConnection?: (connection: SSHConnection) => void
  onDoubleClickConnection?: (connection: SSHConnection) => void
  onContextMenu?: (type: 'connection' | 'group', item: SSHConnection | ConnectionGroup, event: React.MouseEvent) => void
  className?: string
}

interface TreeNode {
  id: string
  type: 'group' | 'connection'
  parentId: string | null
  name: string
  level: number
  data: ConnectionGroup | SSHConnection
}

const buildTree = (
  groups: ConnectionGroup[],
  connections: SSHConnection[]
): TreeNode[] => {
  const nodes: TreeNode[] = []

  const rootGroups = groups.filter((g) => !g.parentId)
  rootGroups.forEach((group) => {
    nodes.push({
      id: group.id,
      type: 'group',
      parentId: group.parentId,
      name: group.name,
      level: 0,
      data: group,
    })
  })

  const ungroupedConnections = connections.filter((c) => !c.groupId)
  ungroupedConnections.forEach((conn) => {
    nodes.push({
      id: conn.id,
      type: 'connection',
      parentId: null,
      name: conn.name,
      level: 0,
      data: conn,
    })
  })

  return nodes.sort((a, b) => {
    if (a.type === 'group' && b.type === 'connection') return -1
    if (a.type === 'connection' && b.type === 'group') return 1
    return a.name.localeCompare(b.name)
  })
}

const getChildNodes = (
  parentId: string,
  groups: ConnectionGroup[],
  connections: SSHConnection[],
  level: number
): TreeNode[] => {
  const nodes: TreeNode[] = []

  const childGroups = groups.filter((g) => g.parentId === parentId)
  childGroups.forEach((group) => {
    nodes.push({
      id: group.id,
      type: 'group',
      parentId: group.parentId,
      name: group.name,
      level,
      data: group,
    })
  })

  const childConnections = connections.filter((c) => c.groupId === parentId)
  childConnections.forEach((conn) => {
    nodes.push({
      id: conn.id,
      type: 'connection',
      parentId: conn.groupId,
      name: conn.name,
      level,
      data: conn,
    })
  })

  return nodes.sort((a, b) => {
    if (a.type === 'group' && b.type === 'connection') return -1
    if (a.type === 'connection' && b.type === 'group') return 1
    return a.name.localeCompare(b.name)
  })
}

export const ConnectionTree: React.FC<ConnectionTreeProps> = ({
  groups,
  connections,
  selectedConnectionId,
  expandedGroupIds = [],
  onToggleGroup,
  onSelectConnection,
  onDoubleClickConnection,
  onContextMenu,
  className,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(expandedGroupIds)
  )

  useEffect(() => {
    setExpandedIds(new Set(expandedGroupIds))
  }, [expandedGroupIds])

  const handleToggle = (groupId: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedIds(newExpanded)
    onToggleGroup?.(groupId)
  }

  const handleContextMenu = (
    type: 'connection' | 'group',
    item: SSHConnection | ConnectionGroup,
    event: React.MouseEvent
  ) => {
    event.preventDefault()
    onContextMenu?.(type, item, event)
  }

  const renderNode = (node: TreeNode): React.ReactNode => {
    const isExpanded = expandedIds.has(node.id)
    const isSelected =
      node.type === 'connection' && selectedConnectionId === node.id
    const childNodes =
      node.type === 'group'
        ? getChildNodes(node.id, groups, connections, node.level + 1)
        : []

    return (
      <div key={node.id}>
        <div
          className={classNames('tree-node', `tree-node--${node.type}`, {
            'tree-node--selected': isSelected,
            'tree-node--expanded': isExpanded,
          })}
          style={{ paddingLeft: `${node.level * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'group') {
              handleToggle(node.id)
            } else {
              onSelectConnection?.(node.data as SSHConnection)
            }
          }}
          onDoubleClick={() => {
            if (node.type === 'connection') {
              onDoubleClickConnection?.(node.data as SSHConnection)
            }
          }}
          onContextMenu={(e) => handleContextMenu(node.type, node.data, e)}
        >
          {node.type === 'group' && (
            <span className="tree-node__expand-icon">
              <Icon
                name={isExpanded ? 'ChevronDown' : 'ChevronRight'}
                size={14}
              />
            </span>
          )}
          {node.type === 'group' && (
            <span className="tree-node__icon tree-node__icon--group">
              <Icon name={isExpanded ? 'FolderOpen' : 'Folder'} size={16} />
            </span>
          )}
          {node.type === 'connection' && (
            <span className="tree-node__icon tree-node__icon--connection">
              <Icon name="Server" size={16} />
            </span>
          )}
          <span className="tree-node__label">{node.name}</span>
        </div>
        {node.type === 'group' && isExpanded && childNodes.length > 0 && (
          <div className="tree-node__children">
            {childNodes.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    )
  }

  const rootNodes = buildTree(groups, connections)

  return (
    <div className={classNames('connection-tree', className)}>
      {rootNodes.map((node) => renderNode(node))}
    </div>
  )
}

export default ConnectionTree
