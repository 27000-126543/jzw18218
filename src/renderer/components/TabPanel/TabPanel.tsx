import React, { useState } from 'react'
import classNames from 'classnames'

export interface TabItem {
  key: string
  label: string
  icon?: React.ReactNode
  content: React.ReactNode
}

interface TabPanelProps {
  tabs: TabItem[]
  defaultActiveKey?: string
  activeKey?: string
  onChange?: (key: string) => void
  className?: string
}

export const TabPanel: React.FC<TabPanelProps> = ({
  tabs,
  defaultActiveKey,
  activeKey: controlledActiveKey,
  onChange,
  className,
}) => {
  const [internalActiveKey, setInternalActiveKey] = useState(
    defaultActiveKey || tabs[0]?.key || ''
  )

  const activeKey = controlledActiveKey ?? internalActiveKey

  const handleTabClick = (key: string) => {
    if (controlledActiveKey === undefined) {
      setInternalActiveKey(key)
    }
    onChange?.(key)
  }

  const activeTab = tabs.find((tab) => tab.key === activeKey)

  return (
    <div className={classNames('flex flex-col h-full bg-gray-900', className)}>
      <div className="flex border-b border-gray-700 bg-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className={classNames(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeKey === tab.key
                ? 'text-blue-400 border-blue-500 bg-gray-900/50'
                : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-700/50'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {activeTab?.content}
      </div>
    </div>
  )
}

export default TabPanel
