// src/renderer/src/views/Reports/TodaySales.tsx
import React, { useState, useEffect } from 'react'
import styles from './TodaySales.module.css'

export default function TodaySales() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal for viewing receipt items
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null)
  const [receiptItems, setReceiptItems] = useState<any[]>([])

  const loadTodaySales = async () => {
    setLoading(true)
    try {
      // @ts-ignore
      const data = await window.api.getTodaySales()
      setSales(data || [])
    } catch (err) {
      console.error('Failed to load sales', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTodaySales()
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

  const handleVoid = async (receiptId: string) => {
    if (
      window.confirm(
        `🚨 DANGER: Are you sure you want to VOID receipt ${receiptId}?\n\nThis will return all items to stock and cancel the sale permanently.`
      )
    ) {
      try {
        // @ts-ignore
        await window.api.voidReceipt(receiptId)
        alert('✅ Receipt voided successfully.')
        loadTodaySales() // Refresh the list
      } catch (err: any) {
        alert(err.message || 'Error voiding receipt.')
      }
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

  // 🚀 Calculate Total Savings for the Modal
  const totalSavings = receiptItems.reduce((sum, item) => {
    const original = item.OriginalPrice || item.UnitPrice
    return sum + Math.max(0, original - item.UnitPrice) * item.Quantity
  }, 0)

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.headerRow}>
          <h2 className={styles.panelTitle}>Today's Sales Ledger</h2>
          <button className={styles.refreshBtn} onClick={loadTodaySales}>
            🔄 Refresh
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.classicTable}>
            <thead>
              <tr>
                <th>TIME</th>
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
                    No sales recorded yet today.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.ReceiptId} className={s.Status === 3 ? styles.voidedRow : ''}>
                    <td>
                      {new Date(s.TransactionDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
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
                      <button className={styles.actionBtn} onClick={() => handleViewItems(s)}>
                        VIEW
                      </button>
                      {s.Status !== 3 && (
                        <button
                          className={`${styles.actionBtn} ${styles.voidBtn}`}
                          onClick={() => handleVoid(s.ReceiptId)}
                        >
                          VOID
                        </button>
                      )}
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
