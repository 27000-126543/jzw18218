import { useState, useEffect, useCallback, useRef } from 'react'
import {
  HardDrive,
  Server,
  Clock,
  Wifi,
  WifiOff,
  FileText,
  Code,
  ArrowRightLeft,
  FolderOpen,
} from 'lucide-react'
import classNames from 'classnames'
import { useAppStore } from './store/appStore'
import Sidebar from './components/Sidebar/Sidebar'
import TerminalPanel from './components/TerminalPanel/TerminalPanel'
import SFTPPanel from './components/SFTPPanel/SFTPPanel'
import SnippetPanel from './components/SnippetPanel/SnippetPanel'
import LogPanel from './components/LogPanel/LogPanel'
import PortForwardPanel from './components/PortForwardPanel/PortForwardPanel'
import './styles/global.css'

type RightPanelTab = 'sftp' | 'snippets' | 'logs' | 'portForward'

const App = () => {
  const {
    initialize,
    connections,
    tabs,
    activeTabId,
    getActiveTab,
    addTab,
    removeTab,
    updateTab,
    getConnectionById,
    addLog,
  } = useAppStore()

  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('sftp')
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const logIdMapRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    initialize()
  }, [initialize])

  const activeTab = getActiveTab()

  const handleConnectionDoubleClick = useCallback(
    (connectionId: string) => {
      const connection = getConnectionById(connectionId)
      if (!connection) return

      const newTab = addTab(connection)

      const logEntry = {
        connectionId: connection.id,
        connectionName: connection.name,
        startTime: Date.now(),
        status: 'connected' as const,
        commands: [],
      }

      window.electronAPI.ssh
        .connect(newTab.id, connection)
        .then(() => {
          updateTab(newTab.id, { isConnected: true })
          addLog({ ...logEntry, status: 'connected' }).then((log) => {
            logIdMapRef.current.set(newTab.id, log.id)
          })
        })
        .catch((err) => {
          updateTab(newTab.id, { isConnected: false })
          addLog({
            ...logEntry,
            status: 'failed',
            endTime: Date.now(),
            errorMessage: err.message || '连接失败',
          })
        })
    },
    [getConnectionById, addTab, updateTab, addLog]
  )

  const handleCloseTab = useCallback(
    (tabId: string) => {
      window.electronAPI.ssh.disconnect(tabId)
      const logId = logIdMapRef.current.get(tabId)
      if (logId) {
        useAppStore.getState().updateLog(logId, {
          status: 'disconnected',
          endTime: Date.now(),
        })
        logIdMapRef.current.delete(tabId)
      }
      removeTab(tabId)
    },
    [removeTab]
  )

  const connectedCount = tabs.filter((t) => t.isConnected).length

  const rightPanelTabs = [
    { key: 'sftp', label: '文件', icon: <FolderOpen size={14} /> },
    { key: 'snippets', label: '命令', icon: <Code size={14} /> },
    { key: 'portForward', label: '转发', icon: <ArrowRightLeft size={14} /> },
    { key: 'logs', label: '日志', icon: <FileText size={14} /> },
  ]

  const renderRightPanelContent = () => {
    switch (rightPanelTab) {
      case 'sftp':
        return (
          <SFTPPanel
            sessionId={activeTabId || ''}
            isOpen={rightPanelOpen}
            onToggle={() => setRightPanelOpen(!rightPanelOpen)}
          />
        )
      case 'snippets':
        return <SnippetPanel />
      case 'portForward':
        return <PortForwardPanel />
      case 'logs':
        return <LogPanel />
      default:
        return null
    }
  }

  return (
    <div className="app">
      <div className="app__main">
        <Sidebar onConnectionDoubleClick={handleConnectionDoubleClick} />

        <main className="content">
          <div className="content__main-area">
            <div className="content__terminal-area">
              <TerminalPanel onCloseTab={handleCloseTab} />
            </div>

            <div
              className={classNames('content__right-panel', {
                'content__right-panel--open': rightPanelOpen,
                'content__right-panel--closed': !rightPanelOpen,
              })}
            >
              <div className="right-panel__tabs">
                {rightPanelTabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={classNames('right-panel__tab', {
                      'right-panel__tab--active': rightPanelTab === tab.key,
                    })}
                    onClick={() => {
                      setRightPanelTab(tab.key as RightPanelTab)
                      if (!rightPanelOpen) setRightPanelOpen(true)
                    }}
                    title={tab.label}
                  >
                    {tab.icon}
                    <span className="right-panel__tab-label">{tab.label}</span>
                  </button>
                ))}
              </div>

              {rightPanelOpen && (
                <div className="right-panel__content">
                  {renderRightPanelContent()}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <footer className="statusbar">
        <div className="statusbar__left">
          <div className="statusbar__item">
            <HardDrive size={12} />
            <span>{connections.length} 个连接</span>
          </div>
          <div className="statusbar__item">
            <Server size={12} />
            <span>{connectedCount} 个已连接</span>
          </div>
        </div>
        <div className="statusbar__right">
          <div className="statusbar__item">
            {activeTab?.isConnected ? (
              <>
                <Wifi size={12} style={{ color: 'var(--color-success)' }} />
                <span>已连接</span>
              </>
            ) : (
              <>
                <WifiOff size={12} style={{ color: 'var(--color-text-muted)' }} />
                <span>未连接</span>
              </>
            )}
          </div>
          <div className="statusbar__item">
            <Clock size={12} />
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
