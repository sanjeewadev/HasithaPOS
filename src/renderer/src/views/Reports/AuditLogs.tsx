// src/renderer/src/views/Reports/AuditLogs.tsx
import React, { useState, useEffect, useMemo } from 'react'
import styles from './AuditLogs.module.css'

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('ALL') // ALL, VOIDS, RETURNS, ADJUSTMENTS

  const loadLogs = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    try {
      // @ts-ignore
      const data = await window.api.getAuditLogs(startDate, endDate)
      setLogs(data || [])
    } catch (err) {
      console.error('Failed to load audit logs', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  // Process and Filter the Logs
  const displayedLogs = useMemo(() => {
    let filtered = logs

    // 1. Filter by Event Type
    if (filterType !== 'ALL') {
      filtered = filtered.filter((log) => {
        if (filterType === 'VOIDS') return log.IsVoided === 1
        if (filterType === 'RETURNS') return log.Type === 4
        if (filterType === 'ADJUSTMENTS') return log.Type === 3
        return true
      })
    }

    // 2. Filter by Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (log) =>
          (log.ReceiptId && log.ReceiptId.toLowerCase().includes(q)) ||
          (log.ProductName && log.ProductName.toLowerCase().includes(q)) ||
          (log.Note && log.Note.toLowerCase().includes(q))
      )
    }

    return filtered
  }, [logs, filterType, searchQuery])

  // Helper to determine the badge and math
  const getEventDetails = (log: any) => {
    if (log.IsVoided === 1) {
      return {
        badge: <span className={`${styles.badge} ${styles.badgeVoid}`}>VOIDED SALE</span>,
        impactLabel: 'Reversed Revenue',
        financial: log.Quantity * log.UnitPrice,
        stockDir: '+',
        stockClass: styles.textSuccess
      }
    }
    if (log.Type === 4) {
      return {
        badge: <span className={`${styles.badge} ${styles.badgeReturn}`}>CUSTOMER RETURN</span>,
        impactLabel: 'Refund Given',
        financial: log.Quantity * log.UnitPrice,
        stockDir: '+',
        stockClass: styles.textSuccess
      }
    }
    if (log.Type === 3) {
      return {
        badge: <span className={`${styles.badge} ${styles.badgeAdjust}`}>STOCK ADJUSTMENT</span>,
        impactLabel: 'Loss / Value',
        financial: log.Quantity * log.UnitCost, // Adjustments lose cost value, not retail
        stockDir: '-',
        stockClass: styles.textDanger
      }
    }
    return {
      badge: <span>UNKNOWN</span>,
      impactLabel: '-',
      financial: 0,
      stockDir: '',
      stockClass: ''
    }
  }

  return (
    <div className={styles.container}>
      {/* --- TOP PANEL: FILTERS --- */}
      <div className={styles.topPanel}>
        <div className={styles.headerInfo}>
          <h2 className={styles.panelTitle}>SECURITY & AUDIT LOGS</h2>
          <p className={styles.subTitle}>Tracking Voids, Returns, and Manual Adjustments</p>
        </div>

        <form onSubmit={loadLogs} className={styles.filterForm}>
          <div className={styles.dateGroup}>
            <input
              type="date"
              className={styles.dateInput}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>TO</span>
            <input
              type="date"
              className={styles.dateInput}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
            <button type="submit" className={styles.loadBtn} disabled={loading}>
              {loading ? 'LOADING...' : 'RUN REPORT'}
            </button>
          </div>
        </form>
      </div>

      {/* --- MIDDLE PANEL: SEARCH & TABS --- */}
      <div className={styles.controlBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search Product, Receipt ID, or Note..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className={styles.tabGroup}>
          <button
            className={`${styles.tabBtn} ${filterType === 'ALL' ? styles.activeTab : ''}`}
            onClick={() => setFilterType('ALL')}
          >
            ALL EVENTS
          </button>
          <button
            className={`${styles.tabBtn} ${filterType === 'VOIDS' ? styles.activeTab : ''}`}
            onClick={() => setFilterType('VOIDS')}
          >
            VOIDS
          </button>
          <button
            className={`${styles.tabBtn} ${filterType === 'RETURNS' ? styles.activeTab : ''}`}
            onClick={() => setFilterType('RETURNS')}
          >
            RETURNS
          </button>
          <button
            className={`${styles.tabBtn} ${filterType === 'ADJUSTMENTS' ? styles.activeTab : ''}`}
            onClick={() => setFilterType('ADJUSTMENTS')}
          >
            ADJUSTMENTS
          </button>
        </div>
      </div>

      {/* --- MAIN TABLE --- */}
      <div className={styles.mainPanel}>
        <div className={styles.tableWrapper}>
          <table className={styles.classicTable}>
            <thead>
              <tr>
                <th>DATE & TIME</th>
                <th>EVENT TYPE</th>
                <th>PRODUCT</th>
                <th>REFERENCE / NOTE</th>
                <th style={{ textAlign: 'center' }}>QTY IMPACT</th>
                <th style={{ textAlign: 'right' }}>FINANCIAL IMPACT</th>
              </tr>
            </thead>
            <tbody>
              {displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyMsg}>
                    No security events found for the selected filters.
                  </td>
                </tr>
              ) : (
                displayedLogs.map((log) => {
                  const details = getEventDetails(log)
                  return (
                    <tr key={log.Id}>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {new Date(log.Date).toLocaleString()}
                      </td>
                      <td>{details.badge}</td>
                      <td style={{ fontWeight: 700 }}>{log.ProductName}</td>
                      <td style={{ fontSize: '12px' }}>
                        {log.ReceiptId && (
                          <strong>
                            {log.ReceiptId} <br />
                          </strong>
                        )}
                        <span style={{ color: 'var(--text-muted)' }}>{log.Note || '-'}</span>
                      </td>
                      <td
                        style={{ textAlign: 'center', fontWeight: 900, fontSize: '16px' }}
                        className={details.stockClass}
                      >
                        {details.stockDir}
                        {log.Quantity} <span style={{ fontSize: '11px' }}>{log.Unit}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            fontWeight: 800
                          }}
                        >
                          {details.impactLabel}
                        </div>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                          Rs {details.financial.toFixed(2)}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
