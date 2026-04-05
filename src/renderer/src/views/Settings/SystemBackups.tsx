// src/renderer/src/views/Settings/SystemBackups.tsx
import { useState, useEffect } from 'react'
import Swal from 'sweetalert2' // 🚀 IMPORT SWEETALERT
import styles from './SystemBackups.module.css'

export default function SystemBackups() {
  const [printers, setPrinters] = useState<any[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Danger Zone State
  const [resetText, setResetText] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    loadPrinters()
    // Load saved printer from local storage
    const savedPrinter = localStorage.getItem('pos_printer_name')
    if (savedPrinter) setSelectedPrinter(savedPrinter)
  }, [])

  const loadPrinters = async () => {
    try {
      // @ts-ignore
      const printerList = await window.api.getPrinters()
      setPrinters(printerList || [])
    } catch (err) {
      console.error('Failed to load printers:', err)
    }
  }

  const handleSavePrinter = () => {
    localStorage.setItem('pos_printer_name', selectedPrinter)
    Swal.fire('Success', `✅ Printer configuration saved: ${selectedPrinter}`, 'success')
  }

  const handleBackup = async () => {
    setIsProcessing(true)
    try {
      // @ts-ignore
      const result = await window.api.exportDatabase()
      if (result && result.success) {
        Swal.fire('Backup Saved', '✅ Database backup saved successfully!', 'success')
      }
    } catch (err: any) {
      Swal.fire('Backup Failed', `❌ ${err.message}`, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRestore = async () => {
    const confirmResult = await Swal.fire({
      title: '🚨 CRITICAL WARNING',
      text: 'Restoring a backup will permanently overwrite ALL current data in the system. The application will restart automatically.\n\nAre you sure you want to proceed?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, OVERWRITE my data!'
    })

    if (!confirmResult.isConfirmed) {
      return
    }

    setIsProcessing(true)
    try {
      // @ts-ignore
      const result = await window.api.importDatabase()
      if (result && !result.success && !result.canceled) {
        Swal.fire('Restore Failed', '❌ Restore failed. Check logs.', 'error')
      }
      // Note: If successful, the app restarts so this won't even execute!
    } catch (err: any) {
      Swal.fire('Restore Failed', `❌ ${err.message}`, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFactoryReset = async () => {
    if (resetText !== 'DELETE ALL DATA') {
      // 🚀 FIXED: Call Swal, then return
      Swal.fire('Action Denied', 'You must type EXACTLY "DELETE ALL DATA" to proceed.', 'error')
      return
    }

    setIsProcessing(true)
    try {
      // @ts-ignore
      await window.api.factoryReset()
      // App will automatically restart here
    } catch (err: any) {
      Swal.fire('Factory Reset Failed', `❌ ${err.message}`, 'error')
      setIsProcessing(false)
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>SYSTEM PREFERENCES & DATA VAULT</h2>

      <div className={styles.grid}>
        {/* --- MODULE 1: HARDWARE (PRINTERS) --- */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>🖨️ Receipt Printer Configuration</h3>
            <p>Select the default thermal printer for point-of-sale receipts.</p>
          </div>
          <div className={styles.cardBody}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                className={styles.classicSelect}
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
              >
                <option value="">-- Select a Printer --</option>
                {printers.map((p, idx) => (
                  <option key={idx} value={p.name}>
                    {p.name} {p.isDefault ? '(Default OS Printer)' : ''}
                  </option>
                ))}
              </select>
              <button className={styles.secondaryBtn} onClick={loadPrinters}>
                🔄 Refresh
              </button>
            </div>
            <button
              className={styles.primaryBtn}
              onClick={handleSavePrinter}
              style={{ marginTop: '15px' }}
            >
              SAVE HARDWARE SETTINGS
            </button>
          </div>
        </div>

        {/* --- MODULE 2: DATABASE BACKUP & RESTORE --- */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>💾 Database Vault</h3>
            <p>Securely backup your financial data to a USB drive, or restore an old backup.</p>
          </div>
          <div className={styles.cardBody} style={{ display: 'flex', gap: '15px' }}>
            <button className={styles.backupBtn} onClick={handleBackup} disabled={isProcessing}>
              <span style={{ fontSize: '24px' }}>📥</span>
              <br />
              EXPORT BACKUP
            </button>
            <button className={styles.restoreBtn} onClick={handleRestore} disabled={isProcessing}>
              <span style={{ fontSize: '24px' }}>📤</span>
              <br />
              RESTORE DATA
            </button>
          </div>
        </div>

        {/* --- MODULE 3: DANGER ZONE (FACTORY RESET) --- */}
        <div className={`${styles.card} ${styles.dangerCard}`}>
          <div className={styles.cardHeader}>
            <h3 style={{ color: 'var(--danger)' }}>🚨 DANGER ZONE: Factory Reset</h3>
            <p>
              This will permanently wipe ALL inventory, suppliers, sales, and credit logs. Only
              Admin accounts will remain.
            </p>
          </div>
          <div className={styles.cardBody}>
            {!showResetConfirm ? (
              <button className={styles.dangerBtnOutline} onClick={() => setShowResetConfirm(true)}>
                INITIATE FACTORY RESET
              </button>
            ) : (
              <div className={styles.resetConfirmBox}>
                <label>
                  To proceed, type <strong>DELETE ALL DATA</strong> below:
                </label>
                <input
                  type="text"
                  className={styles.classicInput}
                  placeholder="DELETE ALL DATA"
                  value={resetText}
                  onChange={(e) => setResetText(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    className={styles.secondaryBtn}
                    onClick={() => {
                      setShowResetConfirm(false)
                      setResetText('')
                    }}
                  >
                    CANCEL
                  </button>
                  <button
                    className={styles.dangerBtnSolid}
                    onClick={handleFactoryReset}
                    disabled={resetText !== 'DELETE ALL DATA' || isProcessing}
                  >
                    CONFIRM PURGE
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
