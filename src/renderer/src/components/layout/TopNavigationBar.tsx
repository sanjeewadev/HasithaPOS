import styles from './TopNavigationBar.module.css'
import { useAuth } from '../../store/AuthContext'

interface Props {
  currentMode: string
  setMode: (mode: string) => void
}

export default function TopNavigationBar({ currentMode, setMode }: Props) {
  const { currentUser, logout } = useAuth()

  const tabs = ['POS', 'Inventory', 'Reports', 'Settings']

  return (
    <header className={styles.headerContainer}>
      {/* LEFT: Branding */}
      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '18px' }}>
        JH<span style={{ color: '#3B82F6' }}>POS</span>
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
          <span style={{ color: '#94A3B8' }}>({currentUser?.Role === 0 ? 'Admin' : 'Staff'})</span>
        </div>
        <button className={styles.logoutBtn} onClick={logout}>
          Exit
        </button>
      </div>
    </header>
  )
}
