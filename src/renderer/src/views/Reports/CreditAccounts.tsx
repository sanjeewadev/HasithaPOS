// src/renderer/src/views/Reports/CreditAccounts.tsx
import React, { useState, useEffect, useMemo } from 'react'
import styles from './CreditAccounts.module.css'

export default function CreditAccounts() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [customerBills, setCustomerBills] = useState<any[]>([])
  const [paymentAmount, setPaymentAmount] = useState('')

  const loadAccounts = async () => {
    setLoading(true)
    try {
      // @ts-ignore
      const data = await window.api.getPendingCreditAccounts()
      setAccounts(data || [])
    } catch (err) {
      console.error('Failed to load credit accounts', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const handleOpenSettle = async (customerName: string) => {
    setSelectedCustomer(customerName)
    setPaymentAmount('')
    try {
      // @ts-ignore
      const bills = await window.api.getCustomerCreditBills(customerName)
      setCustomerBills(bills || [])
    } catch (err) {
      setCustomerBills([])
    }
  }

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) return alert('Enter a valid payment amount.')

    const totalOwed = customerBills.reduce((sum, b) => sum + (b.TotalAmount - b.PaidAmount), 0)
    if (amount > totalOwed)
      return alert(`Payment cannot exceed total pending debt of Rs ${totalOwed.toFixed(2)}`)

    if (window.confirm(`Process payment of Rs ${amount.toFixed(2)} for ${selectedCustomer}?`)) {
      try {
        // @ts-ignore
        await window.api.processCreditPayment(selectedCustomer, amount)
        alert('Payment successfully applied!')
        setSelectedCustomer(null)
        loadAccounts() // Refresh main table
      } catch (err: any) {
        alert('Error processing payment: ' + err.message)
      }
    }
  }

  const displayedAccounts = useMemo(() => {
    if (!searchQuery) return accounts
    return accounts.filter((a) => a.CustomerName.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [accounts, searchQuery])

  const totalSystemDebt = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + acc.TotalPending, 0)
  }, [accounts])

  return (
    <div className={styles.container}>
      {/* --- TOP PANEL --- */}
      <div className={styles.topPanel}>
        <div className={styles.headerInfo}>
          <h2 className={styles.panelTitle}>DEBTORS LEDGER</h2>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search Customer Name..."
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
                <th>CUSTOMER NAME</th>
                <th>UNPAID BILLS</th>
                <th>TOTAL CREDIT</th>
                <th>PAID SO FAR</th>
                <th>PENDING AMOUNT</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyMsg}>
                    No outstanding credit accounts.
                  </td>
                </tr>
              ) : (
                displayedAccounts.map((acc, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 800 }}>{acc.CustomerName || 'Unknown'}</td>
                    <td style={{ fontWeight: 700 }}>{acc.TotalUnpaidBills} Invoices</td>
                    <td style={{ color: 'var(--text-muted)' }}>Rs {acc.TotalCredit.toFixed(2)}</td>
                    <td style={{ color: 'var(--success)' }}>Rs {acc.TotalPaid.toFixed(2)}</td>
                    <td style={{ fontWeight: 900, color: 'var(--danger)', fontSize: '15px' }}>
                      Rs {acc.TotalPending.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className={styles.settleBtn}
                        onClick={() => handleOpenSettle(acc.CustomerName)}
                      >
                        SETTLE DEBT
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- SETTLE PAYMENT MODAL --- */}
      {selectedCustomer && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <div>
                <h2 style={{ margin: 0 }}>Account: {selectedCustomer}</h2>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    marginTop: '4px'
                  }}
                >
                  Unpaid Invoices: {customerBills.length}
                </div>
              </div>
              <button className={styles.closeIcon} onClick={() => setSelectedCustomer(null)}>
                ✖
              </button>
            </div>

            <div className={styles.modalBody}>
              <div
                className={styles.tableWrapper}
                style={{
                  maxHeight: '200px',
                  marginBottom: '20px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}
              >
                <table className={styles.classicTable}>
                  <thead>
                    <tr>
                      <th>RECEIPT ID</th>
                      <th>DATE</th>
                      <th>BILL TOTAL</th>
                      <th>PENDING</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerBills.map((bill) => (
                      <tr key={bill.ReceiptId}>
                        <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                          {bill.ReceiptId}
                        </td>
                        <td>{new Date(bill.TransactionDate).toLocaleDateString()}</td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          Rs {bill.TotalAmount.toFixed(2)}
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--danger)' }}>
                          Rs {(bill.TotalAmount - bill.PaidAmount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form onSubmit={handleProcessPayment} className={styles.paymentForm}>
                <div className={styles.formGroup}>
                  <label>Payment Amount Received (Rs)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.moneyInput}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                  <p className={styles.helperText}>
                    This payment will be automatically applied to the oldest unpaid invoices first.
                  </p>
                </div>
                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setSelectedCustomer(null)}
                  >
                    CANCEL
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    PROCESS PAYMENT
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
