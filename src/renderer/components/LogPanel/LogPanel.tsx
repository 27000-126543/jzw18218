import React, { useState } from 'react'
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Trash2,
  Filter,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { EmptyState } from '@/components/EmptyState/EmptyState'
import type { ConnectionLog } from '@/../types'

const formatDuration = (startTime: number, endTime?: number): string => {
  if (!endTime) return '进行中'
  const diff = endTime - startTime
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`
  }
  if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`
  }
  return `${seconds}秒`
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export const LogPanel: React.FC = () => {
  const { logs, connections, clearLogs } = useAppStore()
  const [filterConnectionId, setFilterConnectionId] = useState<string>('')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [selectedLog, setSelectedLog] = useState<ConnectionLog | null>(null)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const handleClearLogs = async () => {
    if (!confirm('确定要清空所有日志吗？此操作不可恢复。')) return
    try {
      await clearLogs()
      setSelectedLog(null)
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }

  const filteredLogs = filterConnectionId
    ? logs.filter((log) => log.connectionId === filterConnectionId)
    : logs

  const getStatusConfig = (status: ConnectionLog['status']) => {
    switch (status) {
      case 'connected':
        return {
          icon: <CheckCircle size={12} />,
          label: '连接成功',
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
        }
      case 'disconnected':
        return {
          icon: <XCircle size={12} />,
          label: '已断开',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/30',
        }
      case 'failed':
        return {
          icon: <XCircle size={12} />,
          label: '连接失败',
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
        }
      default:
        return {
          icon: <Loader size={12} className="animate-spin" />,
          label: '连接中',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
        }
    }
  }

  const filterConnection = connections.find((c) => c.id === filterConnectionId)

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-200">连接日志</h2>
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
          >
            <Trash2 size={14} />
            清空
          </button>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md text-gray-200 hover:border-gray-600 transition-colors"
          >
            <Filter size={14} className="text-gray-500" />
            <span className="flex-1 text-left">
              {filterConnection ? filterConnection.name : '全部连接'}
            </span>
            <ChevronDown size={14} className="text-gray-500" />
          </button>
          {showFilterDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 max-h-48 overflow-auto">
              <button
                onClick={() => {
                  setFilterConnectionId('')
                  setShowFilterDropdown(false)
                }}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-700 transition-colors ${
                  !filterConnectionId ? 'text-blue-400 bg-blue-500/10' : 'text-gray-300'
                }`}
              >
                全部连接
              </button>
              {connections.map((conn) => (
                <button
                  key={conn.id}
                  onClick={() => {
                    setFilterConnectionId(conn.id)
                    setShowFilterDropdown(false)
                  }}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-700 transition-colors ${
                    filterConnectionId === conn.id
                      ? 'text-blue-400 bg-blue-500/10'
                      : 'text-gray-300'
                  }`}
                >
                  {conn.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredLogs.length === 0 ? (
          <EmptyState
            icon={<FileText size={40} strokeWidth={1.5} />}
            title="暂无日志记录"
            description={
              filterConnectionId
                ? '该连接暂无日志记录'
                : '连接成功后会在这里显示日志'
            }
          />
        ) : (
          <div className="p-2 space-y-2">
            {filteredLogs.map((log) => {
              const statusConfig = getStatusConfig(log.status)
              const isExpanded = expandedLogId === log.id

              return (
                <div
                  key={log.id}
                  className={`border rounded-lg overflow-hidden transition-colors ${statusConfig.borderColor} ${statusConfig.bgColor}`}
                >
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-800/50 transition-colors"
                    onClick={() =>
                      setExpandedLogId(isExpanded ? null : log.id)
                    }
                  >
                    <div className={statusConfig.color}>
                      {statusConfig.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-200 truncate">
                          {log.connectionName}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${statusConfig.color} ${statusConfig.bgColor}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatTime(log.startTime)}
                        </span>
                        <span>
                          时长: {formatDuration(log.startTime, log.endTime)}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-500" />
                    )}
                  </div>
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-gray-700/50">
                      <div className="pt-3 space-y-2">
                        <div className="text-xs text-gray-500">
                          <span className="text-gray-400">开始时间：</span>
                          {new Date(log.startTime).toLocaleString('zh-CN')}
                        </div>
                        {log.endTime && (
                          <div className="text-xs text-gray-500">
                            <span className="text-gray-400">结束时间：</span>
                            {new Date(log.endTime).toLocaleString('zh-CN')}
                          </div>
                        )}
                        {log.errorMessage && (
                          <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                            <span className="text-red-300">错误信息：</span>
                            {log.errorMessage}
                          </div>
                        )}
                        {log.commands && log.commands.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">
                              执行命令 ({log.commands.length})：
                            </div>
                            <div className="bg-gray-900/50 rounded p-2 max-h-32 overflow-auto">
                              {log.commands.map((cmd, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs text-gray-300 font-mono py-0.5"
                                >
                                  $ {cmd}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-xs text-blue-400 hover:text-blue-300 mt-2"
                        >
                          查看详情
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-lg mx-4 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-100">日志详情</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div>
                <label className="text-xs text-gray-500">连接名称</label>
                <p className="text-sm text-gray-200 mt-1">
                  {selectedLog.connectionName}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">状态</label>
                <p className="text-sm mt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${
                      getStatusConfig(selectedLog.status).color
                    } ${getStatusConfig(selectedLog.status).bgColor}`}
                  >
                    {getStatusConfig(selectedLog.status).icon}
                    {getStatusConfig(selectedLog.status).label}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">开始时间</label>
                <p className="text-sm text-gray-200 mt-1">
                  {new Date(selectedLog.startTime).toLocaleString('zh-CN')}
                </p>
              </div>
              {selectedLog.endTime && (
                <div>
                  <label className="text-xs text-gray-500">结束时间</label>
                  <p className="text-sm text-gray-200 mt-1">
                    {new Date(selectedLog.endTime).toLocaleString('zh-CN')}
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500">连接时长</label>
                <p className="text-sm text-gray-200 mt-1">
                  {formatDuration(selectedLog.startTime, selectedLog.endTime)}
                </p>
              </div>
              {selectedLog.errorMessage && (
                <div>
                  <label className="text-xs text-gray-500">错误信息</label>
                  <p className="text-sm text-red-400 mt-1 bg-red-500/10 p-2 rounded">
                    {selectedLog.errorMessage}
                  </p>
                </div>
              )}
              {selectedLog.commands && selectedLog.commands.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500">
                    执行命令 ({selectedLog.commands.length})
                  </label>
                  <div className="mt-2 bg-gray-900 rounded p-3 max-h-60 overflow-auto font-mono text-xs">
                    {selectedLog.commands.map((cmd, idx) => (
                      <div key={idx} className="text-gray-300 py-0.5">
                        <span className="text-green-500">$</span> {cmd}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LogPanel
