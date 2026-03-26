// src/renderer/src/views/Reports/ReportsWorkspace.tsx
import { useState } from 'react'
import styles from './ReportsWorkspace.module.css'
import SalesHistory from './SalesHistory'
import Dashboard from './Dashboard'

export default function ReportsWorkspace() {
  const [activeTab, setActiveTab] = useState('Dashboard')

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <Dashboard />
      case 'SalesHistory':
        return <SalesHistory />
      case 'Credit':
        return (
          <div className={styles.classicCard}>
            <h2 style={{ marginTop: 0, color: '#1E293B' }}>Credit & Debtors Management</h2>
            <p style={{ color: '#64748B' }}>Unpaid bills and payment collection will go here...</p>
          </div>
        )
      case 'Audit':
        return (
          <div className={styles.classicCard}>
            <h2 style={{ marginTop: 0, color: '#1E293B' }}>Audit Log (Voids & Returns)</h2>
            <p style={{ color: '#64748B' }}>Security logs for cancelled items will go here...</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.menuHeader}>Reports & Logs</div>

        <button
          className={`${styles.navButton} ${activeTab === 'Dashboard' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('Dashboard')}
        >
          <span>📊</span> Dashboard
        </button>
        <button
          className={`${styles.navButton} ${activeTab === 'SalesHistory' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('SalesHistory')}
        >
          <span>🧾</span> Sales History
        </button>
        <button
          className={`${styles.navButton} ${activeTab === 'Credit' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('Credit')}
        >
          <span>💳</span> Credit Accounts
        </button>
        <button
          className={`${styles.navButton} ${activeTab === 'Audit' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('Audit')}
        >
          <span>🛡️</span> Audit Logs
        </button>
      </aside>

      <section className={styles.contentArea}>{renderContent()}</section>
    </div>
  )
}
