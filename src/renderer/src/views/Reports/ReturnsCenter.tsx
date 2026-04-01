// src/renderer/src/views/POS/ReturnsCenter.tsx
import React, { useState, useMemo } from 'react'
import styles from './ReturnsCenter.module.css'

interface ReturnItem {
  ProductId: number
  ProductName: string
  Unit: string
  StockBatchId: number
  UnitPrice: number
  UnitCost: number
  OriginalQty: number
  ReturnedQty: number
  QtyToReturn: string
}

export default function ReturnsCenter() {
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const [bill, setBill] = useState<any | null>(null)
  const [items, setItems] = useState<ReturnItem[]>([])
  const [returnReason, setReturnReason] = useState('Customer Changed Mind')

  // --- 1. SEARCH FOR THE BILL ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery) return

    setLoading(true)
    setBill(null)
    setItems([])

    try {
      // @ts-ignore
      const result = await window.api.getBillForReturn(searchQuery.trim())

      if (!result || !result.transaction) {
        alert('Invoice not found. Please check the receipt number.')
        setLoading(false)
        return
      }

      setBill(result.transaction)

      const mappedItems = result.items.map((item: any) => ({
        ...item,
        QtyToReturn: ''
      }))
      setItems(mappedItems)
    } catch (err) {
      console.error(err)
      alert('Error searching for bill.')
    } finally {
      setLoading(false)
    }
  }

  // --- 2. HANDLE QUANTITY TYPING ---
  const handleQtyChange = (index: number, val: string) => {
    const newItems = [...items]
    const item = newItems[index]
    const maxReturnable = item.OriginalQty - item.ReturnedQty

    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      const numVal = parseFloat(val) || 0
      if (numVal <= maxReturnable) {
        item.QtyToReturn = val
        setItems(newItems)
      }
    }
  }

  // --- 3. CALCULATE REFUND TOTAL ---
  const totalRefundAmount = useMemo(() => {
    let total = 0
    items.forEach((item) => {
      const qty = parseFloat(item.QtyToReturn) || 0
      total += qty * item.UnitPrice
    })
    return total
  }, [items])

  // --- 4. PROCESS THE RETURN ---
  const handleProcessReturn = async () => {
    const itemsToReturn = items.filter((item) => (parseFloat(item.QtyToReturn) || 0) > 0)

    if (itemsToReturn.length === 0) {
      return alert('Please enter a quantity to return for at least one item.')
    }

    if (
      window.confirm(
        `Process return for Rs ${totalRefundAmount.toFixed(2)}?\n\nItems will be added back to inventory.`
      )
    ) {
      try {
        const payload = {
          ReceiptId: bill.ReceiptId,
          RefundAmount: totalRefundAmount,
          Items: itemsToReturn.map((item) => ({
            ProductId: item.ProductId,
            Quantity: parseFloat(item.QtyToReturn),
            UnitCost: item.UnitCost,
            UnitPrice: item.UnitPrice,
            StockBatchId: item.StockBatchId,
            Note: returnReason
          }))
        }

        // @ts-ignore
        await window.api.processReturn(payload)
        alert('✅ Return processed successfully!')

        // Trigger a fake submit to refresh the view
        setSearchQuery(bill.ReceiptId)
        document
          .getElementById('searchForm')
          ?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
      } catch (err: any) {
        alert(err.message || 'Error processing return.')
      }
    }
  }

  return (
    <div className={styles.container}>
      {/* THE SEARCH BAR */}
      <div className={styles.searchPanel}>
        <h2 className={styles.panelTitle}>RETURNS CENTER</h2>
        <form id="searchForm" onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Scan or type Receipt ID (e.g., INV-1234)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <button type="submit" className={styles.searchBtn} disabled={loading}>
            {loading ? 'SEARCHING...' : 'FIND RECEIPT'}
          </button>
        </form>
      </div>

      {/* THE RESULTS AREA */}
      <div className={styles.mainArea}>
        {!bill ? (
          <div className={styles.emptyState}>
            <h2>Enter a Receipt ID to begin a return.</h2>
            <p>You can process partial returns or full returns here.</p>
          </div>
        ) : (
          <div className={styles.billPanel}>
            {/* BILL HEADER */}
            <div className={styles.billHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--text-main)' }}>
                  Receipt: {bill.ReceiptId}
                </h2>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    fontWeight: 600
                  }}
                >
                  Date: {new Date(bill.TransactionDate).toLocaleString()} | Customer:{' '}
                  <span style={{ color: 'var(--primary)' }}>{bill.CustomerName || 'Walk-in'}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}
                >
                  Original Bill Total
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-main)' }}>
                  Rs {bill.TotalAmount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* STATUS WARNINGS */}
            {bill.Status === 3 && (
              <div className={styles.dangerBanner}>
                ⚠️ This entire receipt has already been VOIDED. You cannot process returns on a
                voided bill.
              </div>
            )}

            {/* ITEMS TABLE */}
            <div className={styles.tableWrapper}>
              <table className={styles.classicTable}>
                <thead>
                  <tr>
                    <th>ITEM NAME</th>
                    <th>SOLD PRICE</th>
                    <th>BOUGHT</th>
                    <th>RETURNED</th>
                    <th>MAX RETURNABLE</th>
                    <th style={{ width: '150px' }}>QTY TO RETURN</th>
                    <th style={{ textAlign: 'right' }}>REFUND (Rs)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const maxReturnable = item.OriginalQty - item.ReturnedQty
                    const isFullyReturned = maxReturnable <= 0
                    const currentReturnQty = parseFloat(item.QtyToReturn) || 0
                    const refundLineTotal = currentReturnQty * item.UnitPrice

                    return (
                      <tr key={idx} className={isFullyReturned ? styles.rowDisabled : ''}>
                        <td style={{ fontWeight: 700 }}>{item.ProductName}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                          Rs {item.UnitPrice.toFixed(2)}
                        </td>
                        <td style={{ fontWeight: 800 }}>
                          {item.OriginalQty}{' '}
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
                        <td style={{ color: 'var(--danger)', fontWeight: 700 }}>
                          {item.ReturnedQty}{' '}
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
                        <td style={{ fontWeight: 800, color: 'var(--primary)' }}>
                          {maxReturnable}{' '}
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
                        <td>
                          <input
                            type="text"
                            className={styles.qtyInput}
                            value={item.QtyToReturn}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            disabled={isFullyReturned || bill.Status === 3}
                            placeholder={isFullyReturned ? 'DONE' : '0'}
                          />
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 900,
                            color: 'var(--text-main)',
                            fontSize: '16px'
                          }}
                        >
                          Rs {refundLineTotal.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* FOOTER ACTIONS */}
            <div className={styles.billFooter}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: 'var(--text-muted)',
                    marginBottom: '5px',
                    textTransform: 'uppercase'
                  }}
                >
                  Return Reason / Note
                </label>
                <input
                  type="text"
                  className={styles.classicInput}
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  style={{ width: '400px' }}
                  disabled={bill.Status === 3}
                />
              </div>
              <div className={styles.summaryBox}>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}
                >
                  Total Refund Amount
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--danger)' }}>
                  Rs {totalRefundAmount.toFixed(2)}
                </div>
              </div>
              <button
                className={styles.processBtn}
                onClick={handleProcessReturn}
                disabled={totalRefundAmount <= 0 || bill.Status === 3}
              >
                PROCESS RETURN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
