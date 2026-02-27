import { type PropsWithChildren } from 'react'

export interface TabItem {
  id: string
  label: string
}

type TabsProps = PropsWithChildren<{
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
}>

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="tabs">
      <div className="tabs-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
