// src/renderer/src/views/Settings/SettingsWorkspace.tsx
import { useState } from 'react'
// REUSING the CSS from Reports to keep code perfectly DRY (Don't Repeat Yourself)
import styles from '../Reports/ReportsWorkspace.module.css'
import { useAuth } from '../../store/AuthContext'

import UserManager from './UserManager'

export default function SettingsWorkspace() {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('Users')

  const renderContent = () => {
    switch (activeTab) {
      case 'Users':
        return <UserManager />
      case 'System':
        return (
          <div className={styles.classicCard}>
            <h2 style={{ marginTop: 0, color: '#1E293B' }}>System Preferences</h2>
            <p style={{ color: '#64748B' }}>
              Printer configs, Cloud Sync, and Local Backups will go here...
            </p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.menuHeader}>Administration</div>

        {/* Only Admin/SuperAdmin should normally see Users, but we'll secure the data later */}
        <button
          className={`${styles.navButton} ${activeTab === 'Users' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('Users')}
        >
          <span>👥</span> User Accounts
        </button>
        <button
          className={`${styles.navButton} ${activeTab === 'System' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('System')}
        >
          <span>⚙️</span> System & Backups
        </button>
      </aside>

      <section className={styles.contentArea}>{renderContent()}</section>
    </div>
  )
}
