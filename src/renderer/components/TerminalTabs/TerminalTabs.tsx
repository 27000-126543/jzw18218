import { X, Plus } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import './TerminalTabs.css'

interface TerminalTabsProps {
  onNewTab?: () => void
  onCloseTab?: (tabId: string) => void
}

export const TerminalTabs = ({ onNewTab, onCloseTab }: TerminalTabsProps) => {
  const { tabs, activeTabId, setActiveTabId, removeTab } = useAppStore()

  const handleTabClick = (tabId: string) => {
    setActiveTabId(tabId)
  }

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    if (onCloseTab) {
      onCloseTab(tabId)
    } else {
      window.electronAPI.ssh.disconnect(tabId)
      removeTab(tabId)
    }
  }

  const handleNewTab = () => {
    onNewTab?.()
  }

  return (
    <div className="terminal-tabs-container">
      <div className="terminal-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`terminal-tab ${activeTabId === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            <span
              className={`tab-status-dot ${tab.isConnected ? 'connected' : 'disconnected'}`}
            ></span>
            <span className="tab-title">{tab.connectionName}</span>
            <button
              className="tab-close-btn"
              onClick={(e) => handleCloseTab(e, tab.id)}
              title="关闭标签页"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <button className="new-tab-btn" onClick={handleNewTab} title="新建标签页">
        <Plus size={16} />
      </button>
    </div>
  )
}

export default TerminalTabs
