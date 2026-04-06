// src/renderer/src/views/Reports/AuditLogs.tsx
import { useState, useEffect, useMemo } from 'react'
import { FiSearch, FiActivity, FiRefreshCw } from 'react-icons/fi'
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

  // Auto-load logs whenever the date boundaries change
  useEffect(() => {
    loadLogs()
  }, [startDate, endDate])

  // High-performance memory-based filtering
  const displayedLogs = useMemo(() => {
    let filtered = logs

    if (filterType !== 'ALL') {
      filtered = filtered.filter((log) => {
        if (filterType === 'VOIDS') return log.IsVoided === 1
        if (filterType === 'RETURNS') return log.Type === 4
        if (filterType === 'ADJUSTMENTS') return log.Type === 3
        return true
      })
    }

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

  // Logical helper for event categorization
  const getEventDetails = (log: any) => {
    const qty = parseFloat(log.Quantity) || 0
    const price = parseFloat(log.UnitPrice) || 0
    const cost = parseFloat(log.UnitCost) || 0

    if (log.IsVoided === 1) {
      return {
        badge: <span className={`${styles.badge} ${styles.badgeVoid}`}>VOIDED SALE</span>,
        impactLabel: 'Reversed Revenue',
        financial: qty * price,
        stockDir: '+',
        stockClass: styles.textSuccess
      }
    }
    if (log.Type === 4) {
      return {
        badge: <span className={`${styles.badge} ${styles.badgeReturn}`}>CUSTOMER RETURN</span>,
        impactLabel: 'Refund Given',
        financial: qty * price,
        stockDir: '+',
        stockClass: styles.textSuccess
      }
    }
    if (log.Type === 3) {
      return {
        badge: <span className={`${styles.badge} ${styles.badgeAdjust}`}>STOCK ADJUSTMENT</span>,
        impactLabel: 'Value Loss',
        financial: qty * cost,
        stockDir: '-',
        stockClass: styles.textDanger
      }
    }
    return {
      badge: <span className={styles.badge}>UNKNOWN</span>,
      impactLabel: '-',
      financial: 0,
      stockDir: '',
      stockClass: ''
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <h2 className={styles.pageTitle}>SECURITY & AUDIT LOGS</h2>

        {/* --- TOP SECTION: DATE FILTERS --- */}
        <div className={styles.topSection}>
          <div className={styles.headerInfo}>
            <p className={styles.subTitle}>
              History of Voids, Returns, and manual Inventory adjustments.
            </p>
          </div>

          <form onSubmit={loadLogs} className={styles.filterForm}>
            <div className={styles.dateGroup}>
              <div className={styles.inputWithIcon}>
                <input
                  type="date"
                  className={styles.classicInput}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <span className={styles.dateSeparator}>TO</span>
              <div className={styles.inputWithIcon}>
                <input
                  type="date"
                  className={styles.classicInput}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className={styles.loadBtn} disabled={loading}>
                <FiRefreshCw className={loading ? styles.spinning : ''} />
                {loading ? 'LOADING...' : 'REFRESH LOGS'}
              </button>
            </div>
          </form>
        </div>

        {/* --- MIDDLE SECTION: SEARCH & TABS --- */}
        <div className={styles.controlBar}>
          <div className={styles.searchWrapper}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search Product, Receipt ID, or Note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.tabGroup}>
            <button
              className={`${styles.tabBtn} ${filterType === 'ALL' ? styles.activeTab : ''}`}
              onClick={() => setFilterType('ALL')}
            >
              <FiActivity size={14} /> ALL EVENTS
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
                displayedLogs.map((log, idx) => {
                  const details = getEventDetails(log)
                  return (
                    <tr key={log.Id || idx}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>
                        {new Date(log.Date).toLocaleString()}
                      </td>
                      <td>{details.badge}</td>
                      <td style={{ fontWeight: 800 }}>{log.ProductName || 'System Event'}</td>
                      <td>
                        {log.ReceiptId && (
                          <div
                            style={{
                              color: 'var(--primary)',
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '13px'
                            }}
                          >
                            {log.ReceiptId}
                          </div>
                        )}
                        <span
                          style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '12px' }}
                        >
                          {log.Note || '-'}
                        </span>
                      </td>
                      <td
                        style={{ textAlign: 'center', fontWeight: 900, fontSize: '16px' }}
                        className={details.stockClass}
                      >
                        {details.stockDir}
                        {parseFloat(log.Quantity) || 0}{' '}
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 'normal',
                            color: 'var(--text-muted)'
                          }}
                        >
                          {log.Unit || ''}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            fontWeight: 800,
                            textTransform: 'uppercase'
                          }}
                        >
                          {details.impactLabel}
                        </div>
                        <div
                          style={{ fontWeight: 900, color: 'var(--text-main)', fontSize: '16px' }}
                        >
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
