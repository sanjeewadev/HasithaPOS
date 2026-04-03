// src/renderer/src/App.tsx
import { useState } from 'react'
import { useAuth } from './store/AuthContext'

// --- Shell & Layout ---
import AppLayout from './components/layout/AppLayout'
import LoginView from './views/Login/LoginView'

// --- Workspaces ---
import POSWorkspace from './views/POS/POSWorkspace'
import ReturnsCenter from './views/Returns/ReturnsCenter'
import InventoryWorkspace from './views/Inventory/InventoryWorkspace'
import ReportsWorkspace from './views/Reports/ReportsWorkspace'
import SettingsWorkspace from './views/Settings/SettingsWorkspace'

function App() {
  const { currentUser } = useAuth()
  const [currentMode, setCurrentMode] = useState('POS')

  if (!currentUser) {
    return <LoginView />
  }

  const renderWorkspace = () => {
    switch (currentMode) {
      case 'POS':
        return <POSWorkspace />
      case 'Returns':
        return <ReturnsCenter />
      case 'Inventory':
        return <InventoryWorkspace />
      case 'Reports':
        return <ReportsWorkspace />
      case 'Settings':
        // 🚀 RBAC LOGIC: Hard stop for staff trying to access Settings
        if (currentUser.Role !== 1)
          return (
            <div style={{ padding: '50px', textAlign: 'center', fontWeight: 'bold', color: 'red' }}>
              ACCESS DENIED
            </div>
          )
        return <SettingsWorkspace />
      default:
        return <POSWorkspace />
    }
  }

  return (
    <AppLayout currentMode={currentMode} setMode={setCurrentMode}>
      {renderWorkspace()}
    </AppLayout>
  )
}

export default App
