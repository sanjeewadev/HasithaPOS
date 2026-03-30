// src/renderer/src/views/Reports/SalesHistory.tsx
import React, { useState, useEffect, useMemo } from 'react'
import styles from './SalesHistory.module.css'

export default function SalesHistory() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Filters: Default to the current month!
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  // Modal State
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null)
  const [receiptItems, setReceiptItems] = useState<any[]>([])

  const loadSalesHistory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    try {
      // 🚀 Passing our 3 arguments to the upgraded backend!
      // @ts-ignore
      const data = await window.api.getSalesHistory(startDate, endDate, searchQuery.trim())
      setSales(data || [])
    } catch (err) {
      console.error('Failed to load sales history', err)
    } finally {
      setLoading(false)
    }
  }

  // Load data automatically when the page opens
  useEffect(() => {
    loadSalesHistory()
  }, [])

  const handleViewItems = async (txn: any) => {
    setViewingReceipt(txn)
    try {
      // @ts-ignore
      const items = await window.api.getReceiptItems(txn.ReceiptId)
      setReceiptItems(items || [])
    } catch (err) {
      setReceiptItems([])
    }
  }

  // Calculate totals for the loaded period
  const periodTotals = useMemo(() => {
    let validSales = 0
    let voidedSales = 0
    sales.forEach((s) => {
      if (s.Status === 3) voidedSales += s.TotalAmount
      else validSales += s.TotalAmount
    })
    return { validSales, voidedSales }
  }, [sales])

  return (
    <div className={styles.container}>
      {/* --- TOP: FILTER & SUMMARY BAR --- */}
      <div className={styles.topPanel}>
        <form onSubmit={loadSalesHistory} className={styles.filterGroup}>
          <div className={styles.dateFilters}>
            <label>From:</label>
            <input
              type="date"
              className={styles.dateInput}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <label>To:</label>
            <input
              type="date"
              className={styles.dateInput}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
            <button type="submit" className={styles.loadBtn} disabled={loading}>
              {loading ? 'LOADING...' : 'LOAD DATA'}
            </button>
          </div>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Optional: Search by Receipt ID or Customer Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <div className={styles.summaryGroup}>
          <div className={styles.summaryBox}>
            <span className={styles.summaryLabel}>Valid Sales (Period)</span>
            <span className={styles.summaryValueSuccess}>
              Rs {periodTotals.validSales.toFixed(2)}
            </span>
          </div>
          <div className={styles.summaryBox}>
            <span className={styles.summaryLabel}>Voided (Period)</span>
            <span className={styles.summaryValueDanger}>
              Rs {periodTotals.voidedSales.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* --- BOTTOM: MAIN TABLE --- */}
      <div className={styles.mainPanel}>
        <div className={styles.tableWrapper}>
          <table className={styles.classicTable}>
            <thead>
              <tr>
                <th>DATE & TIME</th>
                <th>RECEIPT ID</th>
                <th>CUSTOMER</th>
                <th>PAYMENT</th>
                <th>TOTAL AMOUNT</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyMsg}>
                    No sales found for this period or search.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.ReceiptId} className={s.Status === 3 ? styles.voidedRow : ''}>
                    <td>{new Date(s.TransactionDate).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.ReceiptId}</td>
                    <td>{s.CustomerName || 'Walk-in Customer'}</td>
                    <td>
                      <span className={s.IsCredit ? styles.creditBadge : styles.cashBadge}>
                        {s.IsCredit ? 'CREDIT' : 'CASH'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800 }}>Rs {s.TotalAmount.toFixed(2)}</td>
                    <td>
                      {s.Status === 3 ? (
                        <span className={styles.statusVoid}>VOIDED</span>
                      ) : (
                        <span className={styles.statusPaid}>PAID</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className={styles.viewBtn} onClick={() => handleViewItems(s)}>
                        VIEW DETAILS
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- RECEIPT DETAILS MODAL --- */}
      {viewingReceipt && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <div>
                <h2 style={{ margin: 0 }}>{viewingReceipt.ReceiptId}</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {new Date(viewingReceipt.TransactionDate).toLocaleString()}
                </div>
              </div>
              <button className={styles.closeIcon} onClick={() => setViewingReceipt(null)}>
                ✖
              </button>
            </div>

            {viewingReceipt.Status === 3 && (
              <div className={styles.dangerBanner}>
                ⚠️ This receipt was VOIDED and is excluded from financial totals.
              </div>
            )}

            <div className={styles.modalBody}>
              <table className={styles.classicTable}>
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th>QTY</th>
                    <th>PRICE</th>
                    <th>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                        Loading...
                      </td>
                    </tr>
                  ) : (
                    receiptItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.ProductName}</td>
                        <td>
                          {item.Quantity} {item.Unit}
                        </td>
                        <td>Rs {item.UnitPrice.toFixed(2)}</td>
                        <td style={{ fontWeight: 700 }}>
                          Rs {(item.Quantity * item.UnitPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className={styles.modalSummary}>
                <div className={styles.summaryLine}>
                  Total Amount: <span>Rs {viewingReceipt.TotalAmount.toFixed(2)}</span>
                </div>
                <div className={styles.summaryLine}>
                  Paid Amount: <span>Rs {viewingReceipt.PaidAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.printBtn}>🖨️ REPRINT RECEIPT</button>
              <button className={styles.closeBtn} onClick={() => setViewingReceipt(null)}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
