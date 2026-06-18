import { useCallback } from 'react'
import TerminalTabs from '@/components/TerminalTabs/TerminalTabs'
import TerminalComponent from '@/components/Terminal/Terminal'
import { useAppStore } from '@/store/appStore'
import './TerminalPanel.css'

interface TerminalPanelProps {
  onCloseTab?: (tabId: string) => void
}

export const TerminalPanel = ({ onCloseTab }: TerminalPanelProps) => {
  const { tabs, activeTabId, addTab, updateTab, selectedConnectionId, getConnectionById } = useAppStore()

  const activeTab = tabs.find((t) => t.id === activeTabId)

  const handleNewTab = useCallback(() => {
    if (!selectedConnectionId) {
      alert('请先在左侧选择一个连接')
      return
    }

    const connection = getConnectionById(selectedConnectionId)
    if (!connection) return

    const newTab = addTab(connection)

    window.electronAPI.ssh
      .connect(newTab.id, connection)
      .then(() => {
        updateTab(newTab.id, { isConnected: true })
      })
      .catch(() => {
        updateTab(newTab.id, { isConnected: false })
      })
  }, [selectedConnectionId, getConnectionById, addTab, updateTab])

  return (
    <div className="terminal-panel">
      <TerminalTabs onNewTab={handleNewTab} onCloseTab={onCloseTab} />
      <div className="terminal-content">
        {tabs.length === 0 ? (
          <div className="empty-terminal">
            <p>暂无终端会话</p>
            <p className="hint">双击左侧连接或点击 + 按钮新建终端</p>
          </div>
        ) : activeTab ? (
          <TerminalComponent
            key={activeTab.id}
            sessionId={activeTab.id}
            isConnected={activeTab.isConnected}
          />
        ) : null}
      </div>
    </div>
  )
}

export default TerminalPanel
