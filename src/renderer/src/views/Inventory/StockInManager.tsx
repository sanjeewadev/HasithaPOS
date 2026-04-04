// src/renderer/src/views/Inventory/StockInManager.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react'
import Swal from 'sweetalert2' // 🚀 IMPORT SWEETALERT
import { Product, Supplier } from '../../types/models'
import styles from './StockInManager.module.css'

interface GRNItem {
  id: string
  productId: number
  name: string
  barcode: string
  unit: string
  qty: string
  buyPrice: string
  sellPrice: string
  discountPercent: string
  discountAmount: number
  total: number
}

const DRAFT_STORAGE_KEY = 'jh_hardware_grn_draft'

export default function StockInManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // 🚀 Form States
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]) // Default to today
  const [grnItems, setGrnItems] = useState<GRNItem[]>([])

  // Temporary Input States (Not saved to draft)
  const [searchInputValue, setSearchInputValue] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [inputQty, setInputQty] = useState('')
  const [inputBuyPrice, setInputBuyPrice] = useState('')
  const [inputSellPrice, setInputSellPrice] = useState('')
  const [inputDiscountPercent, setInputDiscountPercent] = useState('')

  // Refs for "Excel-style" Enter key navigation
  const qtyRef = useRef<HTMLInputElement>(null)
  const buyRef = useRef<HTMLInputElement>(null)
  const sellRef = useRef<HTMLInputElement>(null)
  const discRef = useRef<HTMLInputElement>(null)
  const addBtnRef = useRef<HTMLButtonElement>(null)

  // 🚀 INIT: Load Backend Data & Check for Local Storage Drafts
  useEffect(() => {
    const loadData = async () => {
      try {
        // @ts-ignore
        setProducts(await window.api.getProducts())
        // @ts-ignore
        setSuppliers(await window.api.getSuppliers())
      } catch (err) {
        console.error('Data load failed', err)
      }
    }
    loadData()

    // Check for saved draft
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        if (parsed.selectedSupplier) setSelectedSupplier(parsed.selectedSupplier)
        if (parsed.invoiceNo) setInvoiceNo(parsed.invoiceNo)
        if (parsed.invoiceDate) setInvoiceDate(parsed.invoiceDate)
        if (parsed.grnItems) setGrnItems(parsed.grnItems)
      } catch (e) {
        console.error('Failed to parse GRN draft', e)
      }
    }
  }, [])

  // 🚀 AUTO-SAVE: Every time the main cart or header changes, save it silently!
  useEffect(() => {
    const draftState = { selectedSupplier, invoiceNo, invoiceDate, grnItems }
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftState))
  }, [selectedSupplier, invoiceNo, invoiceDate, grnItems])

  // Clear Draft Function - 🚀 REPLACED window.confirm
  const handleClearDraft = async () => {
    const result = await Swal.fire({
      title: 'Clear Draft?',
      text: 'Are you sure you want to clear this draft? All scanned items will be lost.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, clear it!'
    })

    if (result.isConfirmed) {
      setSelectedSupplier('')
      setInvoiceNo('')
      setInvoiceDate(new Date().toISOString().split('T')[0])
      setGrnItems([])
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    }
  }

  const filteredProducts = useMemo(() => {
    if (!searchInputValue) return []
    const q = searchInputValue.toLowerCase()
    return products
      .filter(
        (p) =>
          p.Name.toLowerCase().includes(q) || (p.Barcode && p.Barcode.toLowerCase().includes(q))
      )
      .slice(0, 10)
  }, [products, searchInputValue])

  const handleSelectProduct = (prod: Product) => {
    setSelectedProductId(prod.Id)
    setSearchInputValue(prod.Name)
    setIsDropdownOpen(false)
    setInputBuyPrice(prod.BuyingPrice.toString())
    setInputSellPrice(prod.SellingPrice.toString())
    setInputDiscountPercent(prod.DiscountLimit.toString())
    setInputQty('1')

    setTimeout(() => qtyRef.current?.focus(), 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent, nextRef: React.RefObject<any>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      nextRef.current?.focus()
    }
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()

    // 🚀 REPLACED alert
    if (!selectedProductId) {
      Swal.fire('Missing Product', 'Select a product first!', 'warning')
      return
    }

    const prod = products.find((p) => p.Id === selectedProductId)
    const qtyNum = parseFloat(inputQty) || 0
    const buyNum = parseFloat(inputBuyPrice) || 0
    const sellNum = parseFloat(inputSellPrice) || 0

    let discPercentNum = parseFloat(inputDiscountPercent) || 0
    if (discPercentNum < 0) discPercentNum = 0
    if (discPercentNum > 100) discPercentNum = 100

    // 🚀 REPLACED alert
    if (!prod || qtyNum <= 0 || buyNum <= 0 || sellNum <= 0) {
      Swal.fire('Invalid Input', 'Please enter valid quantities and prices.', 'error')
      return
    }

    const calculatedDiscountRs = parseFloat(((sellNum * discPercentNum) / 100).toFixed(2))

    const newItem: GRNItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: prod.Id,
      name: prod.Name,
      barcode: prod.Barcode || 'N/A',
      unit: prod.Unit || 'Pcs',
      qty: inputQty,
      buyPrice: inputBuyPrice,
      sellPrice: inputSellPrice,
      discountPercent: discPercentNum.toString(),
      discountAmount: calculatedDiscountRs,
      total: qtyNum * buyNum
    }

    setGrnItems([newItem, ...grnItems])
    setSearchInputValue('')
    setSelectedProductId(null)
    setInputBuyPrice('')
    setInputSellPrice('')
    setInputQty('')
    setInputDiscountPercent('')
  }

  const handleRemoveItem = (cartId: string) => {
    setGrnItems(grnItems.filter((item) => item.id !== cartId))
  }

  const handleProcessGRN = async () => {
    // 🚀 REPLACED alert
    if (!selectedSupplier || grnItems.length === 0 || !invoiceNo) {
      Swal.fire('Missing Details', 'Please complete the Header details and add items.', 'warning')
      return
    }

    // 🚀 REPLACED window.confirm
    const confirmResult = await Swal.fire({
      title: 'Process GRN?',
      text: `Process GRN for Rs ${totalGRNValue.toFixed(2)}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, process it!'
    })

    if (confirmResult.isConfirmed) {
      try {
        const payload = {
          SupplierId: parseInt(selectedSupplier),
          ReferenceNo: invoiceNo,
          InvoiceDate: invoiceDate, // 🚀 NEW: Passing custom date to backend!
          Items: grnItems.map((item) => ({
            ...item,
            qty: parseFloat(item.qty),
            buyPrice: parseFloat(item.buyPrice),
            sellPrice: parseFloat(item.sellPrice),
            discountLimit: item.discountAmount
          }))
        }
        // @ts-ignore
        await window.api.processGRN(payload)

        // 🚀 REPLACED alert
        Swal.fire('Success!', '✅ GRN Processed Successfully!', 'success')

        // Wipe local storage completely
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        setGrnItems([])
        setSelectedSupplier('')
        setInvoiceNo('')
        setInvoiceDate(new Date().toISOString().split('T')[0])
      } catch (err: any) {
        // 🚀 REPLACED alert
        Swal.fire('Error', err.message || 'Error processing GRN.', 'error')
      }
    }
  }

  const totalGRNValue = useMemo(() => {
    return grnItems.reduce((sum, item) => sum + item.total, 0)
  }, [grnItems])

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '2px solid var(--bg-canvas)',
            paddingBottom: '10px'
          }}
        >
          <h2 className={styles.panelTitle} style={{ borderBottom: 'none', margin: 0, padding: 0 }}>
            1. Receive Details
          </h2>
          {grnItems.length > 0 && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: 'var(--warning)',
                backgroundColor: '#fffbeb',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #fde68a'
              }}
            >
              💾 DRAFT AUTO-SAVED
            </span>
          )}
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.formGroup}>
            <label>Supplier / Vendor *</label>
            <select
              className={styles.classicInput}
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="">-- Select Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.Id} value={s.Id}>
                  {s.Name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Invoice / Reference No *</label>
            <input
              type="text"
              className={styles.classicInput}
              placeholder="INV-00123"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Invoice Date *</label>
            <input
              type="date"
              className={styles.classicInput}
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)} // 🚀 UNLOCKED: Now editable!
              required
            />
          </div>
        </div>
      </div>

      <div className={styles.panel} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 className={styles.panelTitle}>2. Add Products to Stock</h2>
        <form onSubmit={handleAddItem} className={styles.addBarGrid}>
          <div className={styles.formGroup}>
            <label>Search Product</label>
            <div className={styles.searchContainer}>
              <input
                type="text"
                className={styles.classicInput}
                placeholder="Type name..."
                style={{ width: '100%' }}
                value={searchInputValue}
                onChange={(e) => {
                  setSearchInputValue(e.target.value)
                  setIsDropdownOpen(true)
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                onKeyDown={(e) => handleKeyDown(e, qtyRef)}
              />
              {isDropdownOpen && filteredProducts.length > 0 && (
                <ul className={styles.customDropdown}>
                  {filteredProducts.map((p) => (
                    <li
                      key={p.Id}
                      className={styles.dropdownItem}
                      onClick={() => handleSelectProduct(p)}
                    >
                      {p.Barcode} - {p.Name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Qty</label>
            <input
              ref={qtyRef}
              type="text"
              className={styles.classicInput}
              value={inputQty}
              onChange={(e) => setInputQty(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, buyRef)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Buy (Rs)</label>
            <input
              ref={buyRef}
              type="text"
              className={styles.classicInput}
              value={inputBuyPrice}
              onChange={(e) => setInputBuyPrice(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, sellRef)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Sell (Rs)</label>
            <input
              ref={sellRef}
              type="text"
              className={styles.classicInput}
              value={inputSellPrice}
              onChange={(e) => setInputSellPrice(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, discRef)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Max Disc %</label>
            <input
              ref={discRef}
              type="text"
              className={styles.classicInput}
              value={inputDiscountPercent}
              onChange={(e) => setInputDiscountPercent(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, addBtnRef)}
            />
          </div>
          <button ref={addBtnRef} type="submit" className={`${styles.actionBtn} ${styles.addBtn}`}>
            + ADD
          </button>
        </form>

        <div className={styles.tableWrapper}>
          <table className={styles.classicTable}>
            <thead>
              <tr>
                <th>PRODUCT NAME</th>
                <th>QTY</th>
                <th>BUY PRICE</th>
                <th>SELL PRICE</th>
                <th>MAX DISC</th>
                <th>PROFIT MARGIN</th>
                <th>LINE TOTAL</th>
                <th style={{ textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {grnItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: 'var(--text-muted)',
                      fontWeight: 600
                    }}
                  >
                    Scan or search products above to build your GRN. Your progress is auto-saved.
                  </td>
                </tr>
              ) : (
                grnItems.map((item) => {
                  const sell = parseFloat(item.sellPrice) || 0
                  const buy = parseFloat(item.buyPrice) || 0
                  const profit = sell - buy
                  const profitPercent = ((profit / buy) * 100).toFixed(1)
                  const isLoss = profit - item.discountAmount < 0

                  return (
                    <tr key={item.id} className={isLoss ? styles.lossRow : ''}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td style={{ fontWeight: 800 }}>
                        {item.qty}{' '}
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            fontWeight: 'normal'
                          }}
                        >
                          {item.unit}
                        </span>
                      </td>
                      <td>Rs {buy.toFixed(2)}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                        Rs {sell.toFixed(2)}
                      </td>
                      <td style={{ color: 'var(--warning)', fontWeight: 600 }}>
                        {item.discountPercent}% (Rs {item.discountAmount.toFixed(2)})
                      </td>
                      <td style={{ fontWeight: 700, color: isLoss ? 'var(--danger)' : '#0ea5e9' }}>
                        {profitPercent}% {isLoss && '⚠️ LOSS RISK!'}
                      </td>
                      <td style={{ fontWeight: 800 }}>Rs {item.total.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className={`${styles.actionBtn} ${styles.removeBtn}`}
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          ✖
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.summaryBox}>
          <div>
            <div className={styles.summaryLabel}>Total Items</div>
            <div style={{ fontSize: '18px', fontWeight: 600 }}>{grnItems.length} Products</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className={styles.summaryLabel}>Total GRN Value</div>
            <div className={styles.summaryValue}>Rs {totalGRNValue.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
          {/* 🚀 NEW: Clear Draft Button */}
          <button
            type="button"
            className={styles.actionBtn}
            style={{
              border: '2px solid var(--danger)',
              color: 'var(--danger)',
              background: 'transparent'
            }}
            onClick={handleClearDraft}
            disabled={grnItems.length === 0 && !selectedSupplier && !invoiceNo}
          >
            🗑️ CLEAR DRAFT
          </button>
          <button
            className={`${styles.actionBtn} ${styles.processBtn}`}
            onClick={handleProcessGRN}
            style={{ flex: 1, marginTop: 0 }}
          >
            ✅ PROCESS GRN & UPDATE INVENTORY
          </button>
        </div>
      </div>
    </div>
  )
}
