// src/renderer/src/App.tsx
import { useState } from 'react'
import { useAuth } from './store/AuthContext'

// --- Shell & Layout ---
import AppLayout from './components/layout/AppLayout'
import LoginView from './views/LoginView'

// --- Workspaces ---
import POSWorkspace from './views/POS/POSWorkspace'
import InventoryWorkspace from './views/Inventory/InventoryWorkspace'
import ReportsWorkspace from './views/Reports/ReportsWorkspace'
import SettingsWorkspace from './views/Settings/SettingsWorkspace'

function App() {
  const { currentUser } = useAuth()

  // This state remembers which tab is currently selected (Defaults to POS)
  const [currentMode, setCurrentMode] = useState('POS')

  // 1. Not logged in? Show Login Screen
  if (!currentUser) {
    return <LoginView />
  }

  // 2. The Router: Decides what goes in the middle of the screen
  const renderWorkspace = () => {
    switch (currentMode) {
      case 'POS':
        return <POSWorkspace />
      case 'Inventory':
        return <InventoryWorkspace />
      case 'Reports':
        return <ReportsWorkspace />
      case 'Settings':
        return <SettingsWorkspace />
      default:
        return <POSWorkspace />
    }
  }

  // 3. Logged in? Show the Master Shell and inject the correct workspace
  return (
    <AppLayout currentMode={currentMode} setMode={setCurrentMode}>
      {renderWorkspace()}
    </AppLayout>
  )
}

export default App
