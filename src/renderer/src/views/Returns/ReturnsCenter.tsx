// src/renderer/src/views/Returns/ReturnsCenter.tsx
import { useState, useMemo } from 'react'
import Swal from 'sweetalert2'
import { FiSearch, FiAlertTriangle, FiClock, FiCornerDownLeft } from 'react-icons/fi'
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
  const performSearch = async (query: string) => {
    if (!query) return
    setLoading(true)
    try {
      // @ts-ignore
      const result = await window.api.getBillForReturn(query.trim())
      if (!result || !result.transaction) {
        Swal.fire('Not Found', 'Invoice not found. Please check the receipt number.', 'error')
        setBill(null)
        setItems([])
      } else {
        setBill(result.transaction)
        const mappedItems = result.items.map((item: any) => ({
          ...item,
          QtyToReturn: ''
        }))
        setItems(mappedItems)
      }
    } catch (err: any) {
      Swal.fire('Error', 'Error searching for bill: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(searchQuery)
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
      Swal.fire('Missing Info', 'Please enter a quantity to return.', 'warning')
      return
    }

    const wholeUnits = ['Pcs', 'Box', 'Set', 'Pack', 'Pair', 'Dozen', 'Roll']
    for (const item of itemsToReturn) {
      const qty = parseFloat(item.QtyToReturn)
      if (wholeUnits.includes(item.Unit) && qty % 1 !== 0) {
        Swal.fire('Invalid Qty', `Must be a whole number for unit: ${item.Unit}`, 'error')
        return
      }
    }

    const safeReason = returnReason.trim() || 'Manual Return'
    let confirmHtml = `<div style="text-align: left; font-size: 14px;">`
    itemsToReturn.forEach((item) => {
      confirmHtml += `• ${item.QtyToReturn} ${item.Unit} - ${item.ProductName}<br/>`
    })
    confirmHtml += `<br/><b>Refund Amount: Rs ${totalRefundAmount.toFixed(2)}</b></div>`

    const confirmResult = await Swal.fire({
      title: 'Confirm Return',
      html: confirmHtml,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Confirm & Process'
    })

    if (confirmResult.isConfirmed) {
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
            Note: safeReason
          }))
        }
        // @ts-ignore
        await window.api.processReturn(payload)
        Swal.fire('Success', 'Return processed and stock updated.', 'success')
        performSearch(bill.ReceiptId)
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Error processing return.', 'error')
      }
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <h2 className={styles.pageTitle}>RETURNS & REFUNDS CENTER</h2>

        {/* THE SEARCH BAR */}
        <div className={styles.searchSection}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <div className={styles.inputWrapper}>
              <FiSearch className={styles.searchIcon} />
              <input
                type="text"
                className={styles.classicInput}
                placeholder="Scan or type Receipt ID (e.g., INV-1234)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className={styles.searchBtn} disabled={loading}>
              {loading ? 'SEARCHING...' : 'FIND RECEIPT'}
            </button>
          </form>
        </div>

        {/* THE RESULTS AREA */}
        <div className={styles.mainArea}>
          {!bill ? (
            <div className={styles.emptyState}>
              <FiClock size={48} className={styles.emptyIcon} />
              <h3>Awaiting Input</h3>
              <p>Enter a Receipt ID above to begin the return process.</p>
            </div>
          ) : (
            <div className={styles.billContent}>
              <div className={styles.billHeader}>
                <div>
                  <h3 className={styles.receiptTitle}>Receipt: {bill.ReceiptId}</h3>
                  <div className={styles.receiptSub}>
                    Date: {new Date(bill.TransactionDate).toLocaleString()} | Customer:{' '}
                    <span>{bill.CustomerName || 'Walk-in'}</span>
                  </div>
                </div>
                <div className={styles.billTotalBox}>
                  <div className={styles.totalLabel}>Original Bill Total</div>
                  <div className={styles.totalValue}>Rs {bill.TotalAmount.toFixed(2)}</div>
                </div>
              </div>

              {bill.Status === 3 && (
                <div className={styles.dangerBanner}>
                  <FiAlertTriangle /> This entire receipt has already been VOIDED. No returns
                  allowed.
                </div>
              )}

              <div className={styles.tableWrapper}>
                <table className={styles.classicTable}>
                  <thead>
                    <tr>
                      <th>ITEM NAME</th>
                      <th>PRICE</th>
                      <th>BOUGHT</th>
                      <th>RETURNED</th>
                      <th>AVAILABLE</th>
                      <th style={{ width: '140px' }}>QTY TO RETURN</th>
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
                          <td style={{ fontWeight: 800 }}>{item.ProductName}</td>
                          <td style={{ color: '#10b981', fontWeight: 700 }}>
                            Rs {item.UnitPrice.toFixed(2)}
                          </td>
                          <td>
                            {item.OriginalQty} <small>{item.Unit}</small>
                          </td>
                          <td style={{ color: 'var(--danger)', fontWeight: 700 }}>
                            {item.ReturnedQty}
                          </td>
                          <td style={{ fontWeight: 900, color: 'var(--primary)' }}>
                            {maxReturnable}
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
                          <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '16px' }}>
                            Rs {refundLineTotal.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className={styles.billFooter}>
                <div className={styles.reasonBox}>
                  <label>Return Reason / Note</label>
                  <input
                    type="text"
                    className={styles.classicInput}
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    disabled={bill.Status === 3}
                    placeholder="e.g. Customer changed mind..."
                  />
                </div>
                <div className={styles.summaryBox}>
                  <div className={styles.refundLabel}>Total Refund Amount</div>
                  <div className={styles.refundValue}>Rs {totalRefundAmount.toFixed(2)}</div>
                </div>
                <button
                  className={styles.processBtn}
                  onClick={handleProcessReturn}
                  disabled={totalRefundAmount <= 0 || bill.Status === 3}
                >
                  <FiCornerDownLeft /> PROCESS REFUND
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
