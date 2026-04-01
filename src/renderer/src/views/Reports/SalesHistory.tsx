// src/renderer/src/views/Reports/SalesHistory.tsx
import React, { useState, useEffect, useMemo } from 'react'
import styles from './SalesHistory.module.css'

export default function SalesHistory() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Filters: Default to the current month
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
      // @ts-ignore
      const data = await window.api.getSalesHistory(startDate, endDate, searchQuery.trim())
      setSales(data || [])
    } catch (err) {
      console.error('Failed to load sales history', err)
    } finally {
      setLoading(false)
    }
  }

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

  // 🚀 Helper to render accurate Status Badges
  const renderStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <span className={styles.statusPaid}>PAID</span>
      case 1:
        return <span className={styles.statusUnpaid}>UNPAID</span>
      case 2:
        return <span className={styles.statusPartial}>PARTIAL</span>
      case 3:
        return <span className={styles.statusVoid}>VOIDED</span>
      default:
        return <span className={styles.statusVoid}>UNKNOWN</span>
    }
  }

  const periodTotals = useMemo(() => {
    let validSales = 0
    let voidedSales = 0
    sales.forEach((s) => {
      if (s.Status === 3) voidedSales += s.TotalAmount
      else validSales += s.TotalAmount
    })
    return { validSales, voidedSales }
  }, [sales])

  // 🚀 Calculate Total Savings for the Modal
  const totalSavings = receiptItems.reduce((sum, item) => {
    const original = item.OriginalPrice || item.UnitPrice
    return sum + Math.max(0, original - item.UnitPrice) * item.Quantity
  }, 0)

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
                    <td
                      style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary)' }}
                    >
                      {s.ReceiptId}
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.CustomerName || 'Walk-in Customer'}</td>
                    <td>
                      <span className={s.IsCredit ? styles.creditBadge : styles.cashBadge}>
                        {s.IsCredit ? 'CREDIT' : 'CASH'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 900 }}>Rs {s.TotalAmount.toFixed(2)}</td>
                    <td>{renderStatusBadge(s.Status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className={styles.viewBtn} onClick={() => handleViewItems(s)}>
                        VIEW DETAILS
                      </button>
                      {/* NO VOID BUTTON HERE! Strictly for Returns Center now. */}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- 🚀 BIG PANEL: RECEIPT DETAILS MODAL --- */}
      {viewingReceipt && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBoxMassive}>
            <div className={styles.modalHeader}>
              <div>
                <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '24px' }}>
                  Receipt: {viewingReceipt.ReceiptId}
                </h2>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    marginTop: '4px'
                  }}
                >
                  {new Date(viewingReceipt.TransactionDate).toLocaleString()} | Customer:{' '}
                  {viewingReceipt.CustomerName || 'Walk-in'}
                </div>
              </div>
              <button className={styles.closeIcon} onClick={() => setViewingReceipt(null)}>
                ✖
              </button>
            </div>

            <div className={styles.modalBody}>
              <table className={styles.classicTable}>
                <thead>
                  <tr>
                    <th>BARCODE / SKU</th>
                    <th>PRODUCT NAME</th>
                    <th>QTY</th>
                    <th>RETAIL PRICE</th>
                    <th>DISCOUNT</th>
                    <th>SOLD PRICE</th>
                    <th style={{ textAlign: 'right' }}>LINE TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}
                      >
                        Loading items...
                      </td>
                    </tr>
                  ) : (
                    receiptItems.map((item, idx) => {
                      const original = item.OriginalPrice || item.UnitPrice
                      const discountPerUnit = Math.max(0, original - item.UnitPrice)
                      const hasDiscount = discountPerUnit > 0

                      return (
                        <tr key={idx}>
                          <td
                            style={{
                              fontFamily: 'monospace',
                              color: 'var(--text-muted)',
                              fontSize: '12px'
                            }}
                          >
                            {item.Barcode || '-'}
                          </td>
                          <td style={{ fontWeight: 800 }}>{item.ProductName}</td>
                          <td style={{ fontWeight: 900 }}>
                            {item.Quantity}{' '}
                            <span
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                fontWeight: 'normal'
                              }}
                            >
                              {item.Unit}
                            </span>
                          </td>
                          <td
                            style={{
                              color: 'var(--text-muted)',
                              textDecoration: hasDiscount ? 'line-through' : 'none'
                            }}
                          >
                            Rs {original.toFixed(2)}
                          </td>
                          <td
                            style={{
                              color: hasDiscount ? '#d97706' : 'var(--text-muted)',
                              fontWeight: hasDiscount ? 800 : 400
                            }}
                          >
                            {hasDiscount ? `- Rs ${discountPerUnit.toFixed(2)}` : '-'}
                          </td>
                          <td style={{ color: 'var(--success)', fontWeight: 800 }}>
                            Rs {item.UnitPrice.toFixed(2)}
                          </td>
                          <td
                            style={{
                              fontWeight: 900,
                              textAlign: 'right',
                              color: 'var(--text-main)'
                            }}
                          >
                            Rs {(item.Quantity * item.UnitPrice).toFixed(2)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>

              <div className={styles.modalSummaryBox}>
                <div className={styles.summaryLeft}>
                  {totalSavings > 0 && (
                    <div className={styles.savingsTag}>
                      ⚡ Customer Saved: Rs {totalSavings.toFixed(2)}
                    </div>
                  )}
                  <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <strong>Status:</strong>{' '}
                    {viewingReceipt.Status === 3
                      ? 'VOIDED'
                      : viewingReceipt.IsCredit
                        ? 'CREDIT ACCOUNT'
                        : 'CASH SALE'}
                  </div>
                </div>

                <div className={styles.summaryRight}>
                  <div className={styles.summaryLine}>
                    <span>Total Amount:</span>
                    <span>Rs {viewingReceipt.TotalAmount.toFixed(2)}</span>
                  </div>
                  <div className={`${styles.summaryLine} ${styles.paidLine}`}>
                    <span>Paid Amount:</span>
                    <span>Rs {viewingReceipt.PaidAmount.toFixed(2)}</span>
                  </div>

                  {/* Show Balance Due if it's a Credit Sale */}
                  {viewingReceipt.IsCredit === 1 &&
                    viewingReceipt.TotalAmount - viewingReceipt.PaidAmount > 0 && (
                      <div className={`${styles.summaryLine} ${styles.balanceLine}`}>
                        <span>Balance Due:</span>
                        <span>
                          Rs {(viewingReceipt.TotalAmount - viewingReceipt.PaidAmount).toFixed(2)}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.printBtn}>🖨️ REPRINT RECEIPT</button>
              <button className={styles.closeBtn} onClick={() => setViewingReceipt(null)}>
                CLOSE PANEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
