// src/renderer/src/views/Login/LoginView.tsx
import React, { useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import styles from './LoginView.module.css'

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
    <div className={styles.container}>
      <div className={styles.loginCard}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.icon}>JH</div>
          <h2 className={styles.title}>JH HARDWARE</h2>
          <p className={styles.subtitle}>Please sign in to access the system</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>USERNAME</label>
            <input
              type="text"
              className={styles.input}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError('')
              }}
              disabled={isBusy}
              autoFocus
              placeholder="Enter your username"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>PASSWORD</label>
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              disabled={isBusy}
              placeholder="••••••••"
            />
          </div>

          {/* Error Message */}
          <div className={styles.errorContainer}>
            {error && (
              <span className={error.includes('Verifying') ? styles.infoText : styles.errorText}>
                {error}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={isBusy} className={styles.submitBtn}>
            {isBusy ? 'AUTHENTICATING...' : 'SECURE LOGIN'}
          </button>
        </form>

        {/* Exit Button */}
        <div className={styles.exitContainer}>
          <button onClick={handleExit} className={styles.exitBtn}>
            Exit Application
          </button>
        </div>
      </div>
    </div>
  )
}
