// src/renderer/src/views/Reports/CreditAccounts.tsx
import React, { useState, useEffect, useMemo } from 'react'
import styles from './CreditAccounts.module.css'

export default function CreditAccounts() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // 🚀 NEW: Invoice-based Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const loadInvoices = async () => {
    setLoading(true)
    try {
      // @ts-ignore
      const data = await window.api.getPendingCreditAccounts()
      setInvoices(data || [])
    } catch (err) {
      console.error('Failed to load credit invoices', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [])

  const handleOpenSettle = (invoice: any) => {
    setSelectedInvoice(invoice)
    // Automatically default to the full pending amount to save time!
    setPaymentAmount(invoice.TotalPending.toFixed(2))
  }

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault()

    // 🚀 SECURITY FIX: Safe Floating Point Math
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) return alert('Enter a valid payment amount greater than 0.')

    const safeAmount = parseFloat(amount.toFixed(2))
    const safePending = parseFloat(selectedInvoice.TotalPending.toFixed(2))

    if (safeAmount > safePending) {
      return alert(
        `Payment (Rs ${safeAmount.toFixed(2)}) cannot exceed the total pending debt of Rs ${safePending.toFixed(2)}`
      )
    }

    if (
      window.confirm(
        `Process payment of Rs ${safeAmount.toFixed(2)} for Invoice ${selectedInvoice.ReceiptId}?`
      )
    ) {
      setIsProcessing(true)
      try {
        // @ts-ignore
        await window.api.processCreditPayment(selectedInvoice.ReceiptId, safeAmount)
        alert('✅ Payment successfully applied to invoice!')
        setSelectedInvoice(null)
        loadInvoices()
      } catch (err: any) {
        alert('Error processing payment: ' + err.message)
      } finally {
        setIsProcessing(false)
      }
    }
  }

  const displayedInvoices = useMemo(() => {
    if (!searchQuery) return invoices
    const q = searchQuery.toLowerCase()
    return invoices.filter(
      (i) =>
        (i.CustomerName && i.CustomerName.toLowerCase().includes(q)) ||
        i.ReceiptId.toLowerCase().includes(q)
    )
  }, [invoices, searchQuery])

  const totalSystemDebt = useMemo(() => {
    return invoices.reduce((sum, acc) => sum + acc.TotalPending, 0)
  }, [invoices])

  return (
    <div className={styles.container}>
      {/* --- TOP PANEL --- */}
      <div className={styles.topPanel}>
        <div className={styles.headerInfo}>
          <h2 className={styles.panelTitle}>DEBTORS LEDGER (BY INVOICE)</h2>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search Customer or Invoice ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.summaryBox}>
          <span className={styles.summaryLabel}>Total Market Debt</span>
          <span className={styles.summaryValueDanger}>Rs {totalSystemDebt.toFixed(2)}</span>
        </div>
      </div>

      {/* --- MAIN TABLE --- */}
      <div className={styles.mainPanel}>
        <div className={styles.tableWrapper}>
          <table className={styles.classicTable}>
            <thead>
              <tr>
                <th>DATE</th>
                <th>RECEIPT ID</th>
                <th>CUSTOMER NAME</th>
                <th>TOTAL VALUE</th>
                <th>PAID SO FAR</th>
                <th>CURRENT DEBT</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyMsg}>
                    {searchQuery
                      ? 'No matching invoices found.'
                      : 'No outstanding credit invoices found.'}
                  </td>
                </tr>
              ) : (
                displayedInvoices.map((inv, idx) => (
                  <tr key={idx}>
                    <td>{new Date(inv.TransactionDate).toLocaleDateString()}</td>
                    <td
                      style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary)' }}
                    >
                      {inv.ReceiptId}
                    </td>
                    <td style={{ fontWeight: 800, fontSize: '14px' }}>
                      {inv.CustomerName || 'Unknown'}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>Rs {inv.TotalCredit.toFixed(2)}</td>
                    <td style={{ color: 'var(--success)' }}>Rs {inv.TotalPaid.toFixed(2)}</td>
                    <td style={{ fontWeight: 900, color: 'var(--danger)', fontSize: '16px' }}>
                      Rs {inv.TotalPending.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className={styles.settleBtn} onClick={() => handleOpenSettle(inv)}>
                        PAY INVOICE
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- SETTLE SINGLE INVOICE MODAL --- */}
      {selectedInvoice && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px' }}>Pay Invoice</h2>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    marginTop: '4px'
                  }}
                >
                  Customer:{' '}
                  <span style={{ color: 'var(--primary)' }}>{selectedInvoice.CustomerName}</span> |
                  ID: {selectedInvoice.ReceiptId}
                </div>
              </div>
              <button className={styles.closeIcon} onClick={() => setSelectedInvoice(null)}>
                ✖
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.debtBanner}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--danger)' }}>
                  REMAINING DEBT OWED
                </div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--danger)' }}>
                  Rs {selectedInvoice.TotalPending.toFixed(2)}
                </div>
              </div>

              <form onSubmit={handleProcessPayment} className={styles.paymentForm}>
                <div className={styles.formGroup}>
                  <label>Cash Received (Rs)</label>
                  {/* 🚀 UX FIX: Secure text input for currency */}
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className={styles.moneyInput}
                    value={paymentAmount}
                    onChange={(e) => {
                      if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                        setPaymentAmount(e.target.value)
                      }
                    }}
                    placeholder="0.00"
                    required
                    autoFocus
                  />

                  {/* QUICK PAY BUTTONS */}
                  <div className={styles.quickPayGrid}>
                    <button
                      type="button"
                      className={styles.quickPayBtn}
                      onClick={() =>
                        setPaymentAmount((selectedInvoice.TotalPending / 2).toFixed(2))
                      }
                    >
                      50% HALF PAY
                    </button>
                    <button
                      type="button"
                      className={`${styles.quickPayBtn} ${styles.fullPay}`}
                      onClick={() => setPaymentAmount(selectedInvoice.TotalPending.toFixed(2))}
                    >
                      100% FULL PAY
                    </button>
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setSelectedInvoice(null)}
                    disabled={isProcessing}
                  >
                    CANCEL
                  </button>
                  <button type="submit" className={styles.submitBtn} disabled={isProcessing}>
                    {isProcessing ? 'PROCESSING...' : 'APPLY TO INVOICE'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
