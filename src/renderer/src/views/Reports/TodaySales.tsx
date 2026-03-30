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
        `🚨 DANGER: Are you sure you want to VOID receipt ${receiptId}? This will return all items to stock and cancel the sale.`
      )
    ) {
      try {
        // @ts-ignore
        await window.api.voidReceipt(receiptId)
        alert('Receipt voided successfully.')
        loadTodaySales() // Refresh the list
      } catch (err: any) {
        alert(err.message || 'Error voiding receipt.')
      }
    }
  }

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
                  {receiptItems.map((item, idx) => (
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
                  ))}
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
