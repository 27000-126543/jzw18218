import React, { useState, useEffect } from 'react'
import {
  Plus,
  Play,
  Square,
  Trash2,
  X,
  Save,
  ArrowRightLeft,
  Server,
  Wifi,
  Globe,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import type { PortForwardRule } from '@/../types'

interface PortForwardFormData {
  type: 'local' | 'remote' | 'dynamic'
  localPort: number | ''
  remoteHost: string
  remotePort: number | ''
}

const initialFormData: PortForwardFormData = {
  type: 'local',
  localPort: '',
  remoteHost: 'localhost',
  remotePort: '',
}

const typeOptions = [
  { value: 'local', label: '本地转发', icon: <Server size={14} />, description: '本地端口 -> 远程地址' },
  { value: 'remote', label: '远程转发', icon: <Wifi size={14} />, description: '远程端口 -> 本地地址' },
  { value: 'dynamic', label: '动态转发', icon: <Globe size={14} />, description: 'SOCKS 代理' },
]

export const PortForwardPanel: React.FC = () => {
  const { getActiveTab } = useAppStore()

  const [rules, setRules] = useState<PortForwardRule[]>([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<PortForwardFormData>(initialFormData)

  const activeTab = getActiveTab()
  const isConnected = activeTab?.isConnected || false
  const sessionId = activeTab?.id || ''

  useEffect(() => {
    if (sessionId && isConnected) {
      loadPortForwards()
    } else {
      setRules([])
    }
  }, [sessionId, isConnected])

  const loadPortForwards = async () => {
    if (!sessionId) return
    try {
      const data = await window.electronAPI.portForward.list(sessionId)
      setRules(data)
    } catch (error) {
      console.error('Failed to load port forwards:', error)
    }
  }

  const handleCreate = () => {
    setFormData(initialFormData)
    setShowModal(true)
  }

  const handleStart = async (rule: PortForwardRule) => {
    if (!sessionId) {
      alert('请先打开一个终端连接')
      return
    }
    try {
      const updatedRule = await window.electronAPI.portForward.start(sessionId, {
        type: rule.type,
        localPort: rule.localPort,
        remoteHost: rule.remoteHost,
        remotePort: rule.remotePort,
      })
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...updatedRule, status: 'running' } : r))
      )
    } catch (error) {
      console.error('Failed to start port forward:', error)
      alert('启动端口转发失败')
    }
  }

  const handleStop = async (ruleId: string) => {
    if (!sessionId) return
    try {
      await window.electronAPI.portForward.stop(sessionId, ruleId)
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, status: 'stopped' } : r))
      )
    } catch (error) {
      console.error('Failed to stop port forward:', error)
      alert('停止端口转发失败')
    }
  }

  const handleDelete = (ruleId: string) => {
    if (!confirm('确定要删除这条转发规则吗？')) return
    const rule = rules.find((r) => r.id === ruleId)
    if (rule && rule.status === 'running' && sessionId) {
      window.electronAPI.portForward.stop(sessionId, ruleId).catch(() => {})
    }
    setRules((prev) => prev.filter((r) => r.id !== ruleId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionId) {
      alert('请先打开一个终端连接')
      return
    }
    if (!formData.localPort) {
      alert('请输入本地端口')
      return
    }
    if (formData.type !== 'dynamic' && !formData.remotePort) {
      alert('请输入远程端口')
      return
    }

    try {
      const newRule = await window.electronAPI.portForward.start(sessionId, {
        type: formData.type,
        localPort: Number(formData.localPort),
        remoteHost: formData.remoteHost,
        remotePort: Number(formData.remotePort) || 0,
      })
      setRules((prev) => [...prev, newRule])
      setShowModal(false)
      setFormData(initialFormData)
    } catch (error) {
      console.error('Failed to create port forward:', error)
      alert('创建端口转发失败')
    }
  }

  const getTypeLabel = (type: string) => {
    const option = typeOptions.find((o) => o.value === type)
    return option?.label || type
  }

  const getTypeIcon = (type: string) => {
    const option = typeOptions.find((o) => o.value === type)
    return option?.icon || <Server size={14} />
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-200">端口转发</h2>
          <button
            onClick={handleCreate}
            disabled={!isConnected}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              isConnected
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus size={14} />
            新建
          </button>
        </div>
        {!isConnected && (
          <p className="text-xs text-yellow-500 mt-2">
            请先连接到 SSH 服务器后再使用端口转发
          </p>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {rules.length === 0 ? (
          <EmptyState
            icon={<ArrowRightLeft size={40} strokeWidth={1.5} />}
            title="暂无转发规则"
            description={
              isConnected
                ? '点击上方新建按钮创建端口转发规则'
                : '连接到 SSH 服务器后可创建端口转发规则'
            }
          />
        ) : (
          <div className="p-2 space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1 rounded ${
                        rule.status === 'running'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {getTypeIcon(rule.type)}
                    </span>
                    <span className="text-sm font-medium text-gray-200">
                      {getTypeLabel(rule.type)}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        rule.status === 'running'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {rule.status === 'running' ? '运行中' : '已停止'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {rule.status === 'running' ? (
                      <button
                        onClick={() => handleStop(rule.id)}
                        className="p-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded transition-colors"
                        title="停止转发"
                      >
                        <Square size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStart(rule)}
                        disabled={!isConnected}
                        className={`p-1.5 rounded transition-colors ${
                          isConnected
                            ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                            : 'text-gray-600 cursor-not-allowed'
                        }`}
                        title="启动转发"
                      >
                        <Play size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {rule.type === 'dynamic' ? (
                    <span className="font-mono">
                      本地 {rule.localPort} → SOCKS代理
                    </span>
                  ) : (
                    <span className="font-mono">
                      本地 {rule.localPort} → {rule.remoteHost}:{rule.remotePort}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-100">
                新建端口转发
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
                <label className="block text-xs text-gray-400 mb-2">转发类型</label>
                <div className="grid grid-cols-3 gap-2">
                  {typeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          type: option.value as 'local' | 'remote' | 'dynamic',
                        })
                      }
                      className={`flex flex-col items-center gap-1 p-3 rounded-md border transition-colors ${
                        formData.type === option.value
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {option.icon}
                      <span className="text-xs font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">本地端口</label>
                <input
                  type="number"
                  value={formData.localPort}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      localPort: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="例如: 8080"
                />
              </div>

              {formData.type !== 'dynamic' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      远程主机
                    </label>
                    <input
                      type="text"
                      value={formData.remoteHost}
                      onChange={(e) =>
                        setFormData({ ...formData, remoteHost: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="例如: localhost"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      远程端口
                    </label>
                    <input
                      type="number"
                      value={formData.remotePort}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          remotePort: e.target.value ? Number(e.target.value) : '',
                        })
                      }
                      className="w-full px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="例如: 3306"
                    />
                  </div>
                </>
              )}

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
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PortForwardPanel
