// src/renderer/src/views/LoginView.tsx
import { useState } from 'react'
import { useAuth } from '../store/AuthContext'

export default function LoginView() {
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault() // Prevents page reload
    if (isBusy) return

    if (!username || !password) {
      setError('⚠️ Username and password are required.')
      return
    }

    setIsBusy(true)
    setError('Verifying credentials...')

    const result = await login(username, password)

    if (!result.success) {
      setError(result.error || 'Login failed.')
      setPassword('') // Clear password on fail
      setIsBusy(false)
    }
    // If successful, the AuthContext will update and App.tsx will change the screen!
  }

  const handleExit = () => {
    // Tells Node.js to close the window
    window.close()
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-color)'
      }}
    >
      <div
        style={{
          width: '400px',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔒</div>
          <h2
            style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--sidebar-bg)', margin: 0 }}
          >
            Welcome Back
          </h2>
          <p style={{ color: 'var(--text-light)', marginTop: '8px', fontSize: '15px' }}>
            Please sign in to continue
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: 'var(--text-light)',
                fontSize: '13px'
              }}
            >
              USERNAME
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError('')
              }}
              disabled={isBusy}
              autoFocus
              style={{
                width: '100%',
                height: '45px',
                padding: '0 15px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '15px',
                backgroundColor: '#F8FAFC',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: 'var(--text-light)',
                fontSize: '13px'
              }}
            >
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              disabled={isBusy}
              style={{
                width: '100%',
                height: '45px',
                padding: '0 15px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '15px',
                backgroundColor: '#F8FAFC',
                outline: 'none'
              }}
            />
          </div>

          {/* Error Message */}
          <div style={{ minHeight: '20px', textAlign: 'center' }}>
            {error && (
              <span
                style={{
                  color: error.includes('Verifying') ? '#3B82F6' : 'var(--danger-color)',
                  fontSize: '13px',
                  fontWeight: 'bold'
                }}
              >
                {error}
              </span>
            )}
          </div>

          {/* Buttons */}
          <button
            type="submit"
            disabled={isBusy}
            style={{
              width: '100%',
              height: '50px',
              backgroundColor: 'var(--sidebar-bg)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: isBusy ? 'wait' : 'pointer',
              marginTop: '10px'
            }}
          >
            {isBusy ? '...' : 'LOGIN'}
          </button>
        </form>

        {/* Exit Button */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={handleExit}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-light)',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Exit Application
          </button>
        </div>
      </div>
    </div>
  )
}
