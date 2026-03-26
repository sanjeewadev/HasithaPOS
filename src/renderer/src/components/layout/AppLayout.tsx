// src/renderer/src/components/layout/AppLayout.tsx
import { ReactNode } from 'react'
import TopNavigationBar from './TopNavigationBar'
import styles from './AppLayout.module.css'

interface Props {
  currentMode: string
  setMode: (mode: string) => void
  children: ReactNode // This allows us to inject the POS or Inventory screen inside
}

export default function AppLayout({ currentMode, setMode, children }: Props) {
  return (
    <div className={styles.appContainer}>
      <TopNavigationBar currentMode={currentMode} setMode={setMode} />

      <main className={styles.mainContent}>{children}</main>
    </div>
  )
}
