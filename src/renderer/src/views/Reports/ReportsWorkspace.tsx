// src/renderer/src/views/Reports/ReportsWorkspace.tsx
import { useState } from 'react'
import styles from '../../styles/SharedSidebar.module.css'
import Dashboard from './Dashboard'
import InventoryAlerts from './InventoryAlerts'
import TodaySales from './TodaySales'
import SalesHistory from './SalesHistory'
import CreditAccounts from './CreditAccounts'
import AuditLogs from './AuditLogs'

// 🚀 IMPORT THE RETURNS CENTER (Note the path goes up to the POS folder)
import ReturnsCenter from './ReturnsCenter'

export default function ReportsWorkspace() {
  const [activeTab, setActiveTab] = useState('Dashboard')

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <Dashboard />
      case 'Alerts':
        return <InventoryAlerts />
      case 'TodaySales':
        return <TodaySales />
      case 'SalesHistory':
        return <SalesHistory />
      case 'Returns':
        return <ReturnsCenter /> // 🚀 Now loads the Returns Center!
      case 'Credit':
        return <CreditAccounts />
      case 'Audit':
        return <AuditLogs />
      default:
        return null
    }
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        {/* Renamed slightly to reflect that this is now the Backoffice Hub */}
        <div className={styles.menuHeader}>Management & Logs</div>

        <button
          className={`${styles.navButton} ${activeTab === 'Dashboard' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('Dashboard')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="9"></rect>
            <rect x="14" y="3" width="7" height="5"></rect>
            <rect x="14" y="12" width="7" height="9"></rect>
            <rect x="3" y="16" width="7" height="5"></rect>
          </svg>
          Dashboard
        </button>

        <button
          className={`${styles.navButton} ${activeTab === 'Alerts' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('Alerts')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          Inventory Alerts
        </button>

        <button
          className={`${styles.navButton} ${activeTab === 'TodaySales' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('TodaySales')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Today's Sales
        </button>

        <button
          className={`${styles.navButton} ${activeTab === 'SalesHistory' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('SalesHistory')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Sales History
        </button>

        {/* 🚀 NEW BUTTON: RETURNS CENTER */}
        <button
          className={`${styles.navButton} ${activeTab === 'Returns' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('Returns')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 14 4 9 9 4"></polyline>
            <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
          </svg>
          Returns Center
        </button>

        <button
          className={`${styles.navButton} ${activeTab === 'Credit' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('Credit')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
          Credit Accounts
        </button>

        <button
          className={`${styles.navButton} ${activeTab === 'Audit' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('Audit')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          Audit Logs
        </button>
      </aside>

      <section className={styles.contentArea}>{renderContent()}</section>
    </div>
  )
}
