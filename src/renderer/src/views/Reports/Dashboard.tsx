// src/renderer/src/views/Reports/Dashboard.tsx
import { useState, useEffect } from 'react'
import { Product } from '../../types/models'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([])

  // State for our live database metrics
  const [metrics, setMetrics] = useState({ todaySales: 0, billsToday: 0, pendingCredit: 0 })
  const [recentTx, setRecentTx] = useState<any[]>([])

  const loadData = async () => {
    try {
      // @ts-ignore
      const prodData = await window.api.getProducts()
      // @ts-ignore
      const metricsData = await window.api.getDashboardMetrics()
      // @ts-ignore
      const txData = await window.api.getRecentTransactions(5) // Get latest 5 sales

      setProducts(prodData)
      setMetrics(metricsData)
      setRecentTx(txData)
    } catch (error) {
      console.error('Failed to load dashboard data', error)
    }
  }

  useEffect(() => {
    loadData()
    // Auto-refresh the dashboard every 30 seconds so it's always live
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Calculate Low Stock Alerts (Products with less than 10 quantity)
  const lowStockItems = products.filter((p) => p.Quantity < 10 && p.Quantity > 0)
  const outOfStockItems = products.filter((p) => p.Quantity <= 0)

  return (
    <div className={styles.container}>
      {/* --- KPI CARDS --- */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.success}`}>
          <div className={styles.kpiTitle}>Today's Sales (Cash)</div>
          <div className={`${styles.kpiValue} ${styles.success}`}>
            Rs {(metrics.todaySales || 0).toFixed(2)}
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTitle}>Total Bills Cut Today</div>
          <div className={styles.kpiValue}>{metrics.billsToday || 0}</div>
        </div>

        <div className={`${styles.kpiCard} ${styles.warning}`}>
          <div className={styles.kpiTitle}>Pending Credit Collections</div>
          <div className={styles.kpiValue} style={{ color: '#D97706' }}>
            Rs {(metrics.pendingCredit || 0).toFixed(2)}
          </div>
        </div>

        <div className={`${styles.kpiCard} ${styles.danger}`}>
          <div className={styles.kpiTitle}>Out of Stock Items</div>
          <div className={`${styles.kpiValue} ${styles.danger}`}>{outOfStockItems.length}</div>
        </div>
      </div>

      {/* --- BOTTOM SECTIONS --- */}
      <div className={styles.bottomGrid}>
        {/* Left: Recent Transactions Table */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span>RECENT TRANSACTIONS (LIVE)</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.classicTable}>
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>RECEIPT ID</th>
                  <th>CUSTOMER</th>
                  <th>TOTAL</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}
                    >
                      No sales yet today.
                    </td>
                  </tr>
                ) : (
                  recentTx.map((tx) => {
                    // Format the timestamp nicely (e.g., "10:45 AM")
                    const time = new Date(tx.TransactionDate).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })

                    return (
                      <tr key={tx.ReceiptId}>
                        <td style={{ color: '#64748B' }}>{time}</td>
                        <td style={{ fontWeight: 'bold' }}>{tx.ReceiptId}</td>
                        <td>{tx.CustomerName || 'Walk-in'}</td>
                        <td style={{ fontWeight: 'bold' }}>Rs {tx.TotalAmount.toFixed(2)}</td>
                        <td>
                          {tx.Status === 0 ? (
                            <span className={styles.statusPaid}>PAID</span>
                          ) : (
                            <span
                              style={{
                                background: '#FEF3C7',
                                color: '#D97706',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontSize: '12px'
                              }}
                            >
                              PENDING
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Low Stock Alerts */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span style={{ color: '#DC2626' }}>⚠️ INVENTORY ALERTS</span>
          </div>
          <div className={styles.tableWrapper}>
            {outOfStockItems.map((p) => (
              <div key={`out-${p.Id}`} className={styles.alertItem}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1E293B', fontSize: '14px' }}>
                    {p.Name}
                  </div>
                  <div style={{ color: '#64748B', fontSize: '12px' }}>{p.Barcode}</div>
                </div>
                <div
                  style={{
                    background: '#FEE2E2',
                    color: '#DC2626',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}
                >
                  EMPTY
                </div>
              </div>
            ))}

            {lowStockItems.map((p) => (
              <div key={`low-${p.Id}`} className={styles.alertItem}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1E293B', fontSize: '14px' }}>
                    {p.Name}
                  </div>
                  <div style={{ color: '#64748B', fontSize: '12px' }}>{p.Barcode}</div>
                </div>
                <div
                  style={{
                    background: '#FEF3C7',
                    color: '#D97706',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}
                >
                  ONLY {p.Quantity} LEFT
                </div>
              </div>
            ))}

            {outOfStockItems.length === 0 && lowStockItems.length === 0 && (
              <div
                style={{
                  padding: '30px',
                  textAlign: 'center',
                  color: '#16A34A',
                  fontWeight: 'bold'
                }}
              >
                All stock levels are healthy!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
