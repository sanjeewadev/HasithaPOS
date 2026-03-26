// src/renderer/src/views/Reports/SalesHistory.tsx
import { useState, useEffect } from 'react'
import styles from './SalesHistory.module.css'

export default function SalesHistory() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [selectedTx, setSelectedTx] = useState<any | null>(null)
  const [receiptItems, setReceiptItems] = useState<any[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]) // Defaults to Today

  const loadTransactions = async () => {
    try {
      // @ts-ignore
      const data = await window.api.getSalesHistory(dateFilter, search)
      setTransactions(data)
      if (data.length === 0) {
        setSelectedTx(null)
        setReceiptItems([])
      }
    } catch (error) {
      console.error('Failed to load history', error)
    }
  }

  // Reload when filters change
  useEffect(() => {
    loadTransactions()
  }, [dateFilter, search])

  const handleSelectTx = async (tx: any) => {
    setSelectedTx(tx)
    try {
      // @ts-ignore
      const items = await window.api.getReceiptDetails(tx.ReceiptId)
      setReceiptItems(items)
    } catch (error) {
      console.error('Failed to load receipt details', error)
    }
  }

  const handleReprint = () => {
    window.print() // Native browser print (can be hooked to thermal printer later)
    alert(`Sending Receipt ${selectedTx.ReceiptId} to Printer...`)
  }

  const handleVoid = () => {
    alert(
      'VOID FEATURE: This will be connected to the Stock Adjustment engine to return items to inventory and mark the bill as cancelled.'
    )
  }

  return (
    <div className={styles.container}>
      {/* LEFT PANEL: Data Grid & Filters */}
      <div className={styles.panel}>
        <h2 className={styles.panelHeader}>SALES HISTORY & AUDIT</h2>

        <div className={styles.filterBar}>
          <input
            type="date"
            className={styles.classicInput}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ maxWidth: '200px' }}
          />
          <input
            type="text"
            className={styles.classicInput}
            placeholder="Search Receipt ID or Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                    No transactions found for this date.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const time = new Date(tx.TransactionDate).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                  const isSelected = selectedTx?.ReceiptId === tx.ReceiptId
                  return (
                    <tr
                      key={tx.ReceiptId}
                      onClick={() => handleSelectTx(tx)}
                      className={isSelected ? styles.activeRow : ''}
                    >
                      <td>{time}</td>
                      <td style={{ fontWeight: 'bold' }}>{tx.ReceiptId}</td>
                      <td>{tx.CustomerName}</td>
                      <td style={{ color: '#059669', fontWeight: 'bold' }}>
                        Rs {tx.TotalAmount.toFixed(2)}
                      </td>
                      <td>{tx.Status === 0 ? 'PAID' : 'PENDING'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT PANEL: Digital Receipt Preview */}
      <div className={styles.panel}>
        <h2 className={styles.panelHeader}>RECEIPT PREVIEW</h2>

        <div className={styles.receiptContainer}>
          {!selectedTx ? (
            <p style={{ color: '#94A3B8', marginTop: '50px' }}>
              Select a transaction to view receipt.
            </p>
          ) : (
            <>
              {/* THE THERMAL PAPER */}
              <div className={styles.receiptPaper}>
                <div className={styles.receiptHeader}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>Hasitha POS</h3>
                  <div style={{ fontSize: '12px' }}>123 Main Street, City</div>
                  <div style={{ fontSize: '12px' }}>Tel: 011-2345678</div>
                </div>

                <div className={styles.receiptDetails}>
                  <div>Date: {new Date(selectedTx.TransactionDate).toLocaleString()}</div>
                  <div>
                    Bill No: <b>{selectedTx.ReceiptId}</b>
                  </div>
                  <div>Cashier: Admin</div>
                </div>

                <div style={{ borderBottom: '1px dashed #000', marginBottom: '10px' }}></div>

                {receiptItems.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{item.ProductName}</div>
                    <div className={styles.receiptItem}>
                      <span>
                        {item.Quantity} x Rs {item.UnitPrice.toFixed(2)}
                      </span>
                      <span>Rs {(item.Quantity * item.UnitPrice).toFixed(2)}</span>
                    </div>
                  </div>
                ))}

                <div className={styles.receiptTotals}>
                  <div className={styles.receiptItem} style={{ fontSize: '14px' }}>
                    <span>TOTAL DUE:</span>
                    <span>Rs {selectedTx.TotalAmount.toFixed(2)}</span>
                  </div>
                  <div className={styles.receiptItem}>
                    <span>CASH TENDERED:</span>
                    <span>Rs {selectedTx.PaidAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px' }}>
                  Thank you for your business!
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ width: '100%', maxWidth: '320px' }}>
                <div className={styles.actionGrid}>
                  <button className={styles.printBtn} onClick={handleReprint}>
                    🖨️ REPRINT
                  </button>
                  <button className={styles.voidBtn} onClick={handleVoid}>
                    🛑 VOID BILL
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
