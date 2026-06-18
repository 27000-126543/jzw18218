import React, { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Terminal,
  ChevronDown,
  ChevronRight,
  X,
  Save,
  FileText,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import type { CommandSnippet } from '@/../types'

interface SnippetFormData {
  name: string
  command: string
  description: string
  groupId: string
}

const initialFormData: SnippetFormData = {
  name: '',
  command: '',
  description: '',
  groupId: '',
}

export const SnippetPanel: React.FC = () => {
  const {
    snippets,
    groups,
    addSnippet,
    updateSnippet,
    removeSnippet,
    getActiveTab,
  } = useAppStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [editingSnippet, setEditingSnippet] = useState<CommandSnippet | null>(null)
  const [formData, setFormData] = useState<SnippetFormData>(initialFormData)

  useEffect(() => {
    if (groups.length > 0) {
      setExpandedGroups(new Set(groups.map((g) => g.id)))
    }
  }, [groups])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const handleCreate = () => {
    setEditingSnippet(null)
    setFormData(initialFormData)
    setShowModal(true)
  }

  const handleEdit = (snippet: CommandSnippet) => {
    setEditingSnippet(snippet)
    setFormData({
      name: snippet.name,
      command: snippet.command,
      description: snippet.description,
      groupId: snippet.groupId,
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个命令片段吗？')) return
    try {
      await removeSnippet(id)
    } catch (error) {
      console.error('Failed to delete snippet:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.command) return

    try {
      if (editingSnippet) {
        await updateSnippet(editingSnippet.id, formData)
      } else {
        await addSnippet(formData)
      }
      setShowModal(false)
      setFormData(initialFormData)
    } catch (error) {
      console.error('Failed to save snippet:', error)
    }
  }

  const handleInsert = (snippet: CommandSnippet) => {
    const activeTab = getActiveTab()
    if (!activeTab) {
      alert('请先打开一个终端连接')
      return
    }
    if (activeTab.isConnected) {
      window.electronAPI.ssh.write(activeTab.id, snippet.command + '\n')
    } else {
      alert('当前终端未连接')
    }
  }

  const filteredSnippets = snippets.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedSnippets = groups.reduce((acc, group) => {
    const groupSnippets = filteredSnippets.filter((s) => s.groupId === group.id)
    if (groupSnippets.length > 0 || !searchQuery) {
      acc[group.id] = groupSnippets
    }
    return acc
  }, {} as Record<string, CommandSnippet[]>)

  const ungroupedSnippets = filteredSnippets.filter((s) => !s.groupId)

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-200">命令片段</h2>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
          >
            <Plus size={14} />
            新建
          </button>
        </div>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="搜索片段..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredSnippets.length === 0 ? (
          <EmptyState
            icon={<FileText size={40} strokeWidth={1.5} />}
            title="暂无命令片段"
            description="点击上方新建按钮创建你的第一个命令片段"
          />
        ) : (
          <div className="p-2">
            {Object.entries(groupedSnippets).map(([groupId, groupSnippets]) => {
              const group = groups.find((g) => g.id === groupId)
              if (!group) return null
              const isExpanded = expandedGroups.has(groupId)

              return (
                <div key={groupId} className="mb-2">
                  <button
                    onClick={() => toggleGroup(groupId)}
                    className="flex items-center gap-1 w-full px-2 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                    <span>{group.name}</span>
                    <span className="text-gray-600">({groupSnippets.length})</span>
                  </button>
                  {isExpanded && (
                    <div className="ml-4 space-y-1 mt-1">
                      {groupSnippets.map((snippet) => (
                        <SnippetItem
                          key={snippet.id}
                          snippet={snippet}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onInsert={handleInsert}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {ungroupedSnippets.length > 0 && (
              <div className="mb-2">
                <button
                  onClick={() => toggleGroup('ungrouped')}
                  className="flex items-center gap-1 w-full px-2 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
                >
                  {expandedGroups.has('ungrouped') ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  <span>未分组</span>
                  <span className="text-gray-600">({ungroupedSnippets.length})</span>
                </button>
                {expandedGroups.has('ungrouped') && (
                  <div className="ml-4 space-y-1 mt-1">
                    {ungroupedSnippets.map((snippet) => (
                      <SnippetItem
                        key={snippet.id}
                        snippet={snippet}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onInsert={handleInsert}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-100">
                {editingSnippet ? '编辑命令片段' : '新建命令片段'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="输入片段名称"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">分组</label>
                <select
                  value={formData.groupId}
                  onChange={(e) =>
                    setFormData({ ...formData, groupId: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">未分组</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">命令</label>
                <textarea
                  value={formData.command}
                  onChange={(e) =>
                    setFormData({ ...formData, command: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-md text-gray-200 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="输入命令内容"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">描述</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="输入片段描述（可选）"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
                >
                  <Save size={14} />
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

interface SnippetItemProps {
  snippet: CommandSnippet
  onEdit: (snippet: CommandSnippet) => void
  onDelete: (id: string) => void
  onInsert: (snippet: CommandSnippet) => void
}

const SnippetItem: React.FC<SnippetItemProps> = ({
  snippet,
  onEdit,
  onDelete,
  onInsert,
}) => {
  return (
    <div
      className="group flex items-center gap-2 p-2 bg-gray-800 hover:bg-gray-750 rounded-md cursor-pointer border border-gray-700/50 hover:border-gray-600 transition-colors"
      onClick={() => onInsert(snippet)}
    >
      <Terminal size={14} className="text-green-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-200 font-medium truncate">
          {snippet.name}
        </div>
        {snippet.description && (
          <div className="text-xs text-gray-500 truncate">
            {snippet.description}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit(snippet)
          }}
          className="p-1 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors"
        >
          <Edit2 size={13} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(snippet.id)
          }}
          className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

export default SnippetPanel
