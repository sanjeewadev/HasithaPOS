// src/renderer/src/components/layout/TopNavigationBar.tsx
import styles from './TopNavigationBar.module.css'
import { useAuth } from '../../store/AuthContext'

interface Props {
  currentMode: string
  setMode: (mode: string) => void
}

export default function TopNavigationBar({ currentMode, setMode }: Props) {
  const { currentUser, logout } = useAuth()

  // 🚀 RBAC LOGIC: Admins (1) and Root (0) see everything. Staff cannot see Settings.
  const isAdmin = currentUser?.Role === 0 || currentUser?.Role === 1
  const tabs = ['POS', 'Returns', 'Inventory', 'Reports']

  if (isAdmin) {
    tabs.push('Settings')
  }

  // 🚀 THE FIX: NO MORE NATIVE DIALOGS.
  const handleLogout = () => {
    // We completely removed window.confirm() to prevent Chromium from dropping focus!
    logout()
  }

  return (
    <header className={styles.headerContainer}>
      {/* LEFT: Branding */}
      <div className={styles.brand}>
        JH<span>HARDWARE</span>
      </div>

      {/* CENTER: Modern Pill Switcher */}
      <div className={`${styles.pillContainer} ${styles.noDrag}`}>
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`${styles.pillButton} ${currentMode === tab ? styles.pillActive : ''}`}
            onClick={() => setMode(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* RIGHT: User Info & Controls */}
      <div className={`${styles.userInfo} ${styles.noDrag}`}>
        <div>
          {currentUser?.FullName}{' '}
          <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>
            ({currentUser?.Role === 0 ? 'System Root' : currentUser?.Role === 1 ? 'Admin' : 'Staff'}
            )
          </span>
        </div>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Log Out
        </button>
      </div>
    </header>
  )
}
