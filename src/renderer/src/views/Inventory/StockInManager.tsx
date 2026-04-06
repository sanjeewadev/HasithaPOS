// src/renderer/src/views/Inventory/StockInManager.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react'
import Swal from 'sweetalert2'
import {
  FiPackage,
  FiTruck,
  FiSearch,
  FiPlus,
  FiX,
  FiTrash2,
  FiCheckCircle,
  FiSave,
  FiAlertTriangle
} from 'react-icons/fi'
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

  // Form States
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [grnItems, setGrnItems] = useState<GRNItem[]>([])

  // Temporary Input States
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

  useEffect(() => {
    const draftState = { selectedSupplier, invoiceNo, invoiceDate, grnItems }
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftState))
  }, [selectedSupplier, invoiceNo, invoiceDate, grnItems])

  const handleClearDraft = async () => {
    const result = await Swal.fire({
      title: 'Clear Current Draft?',
      text: 'Are you sure you want to clear this draft? All items in the list will be lost.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, clear draft'
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

    if (!selectedProductId) {
      Swal.fire('Selection Required', 'Please select a product from the list first.', 'warning')
      return
    }

    const prod = products.find((p) => p.Id === selectedProductId)
    const qtyNum = parseFloat(inputQty) || 0
    const buyNum = parseFloat(inputBuyPrice) || 0
    const sellNum = parseFloat(inputSellPrice) || 0

    let discPercentNum = parseFloat(inputDiscountPercent) || 0
    if (discPercentNum < 0) discPercentNum = 0
    if (discPercentNum > 100) discPercentNum = 100

    if (!prod || qtyNum <= 0 || buyNum <= 0 || sellNum <= 0) {
      Swal.fire(
        'Invalid Values',
        'Quantity, Buy Price, and Sell Price must be greater than zero.',
        'error'
      )
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
    if (!selectedSupplier || grnItems.length === 0 || !invoiceNo) {
      Swal.fire(
        'Information Missing',
        'Please select a supplier, enter an invoice number, and add at least one item.',
        'warning'
      )
      return
    }

    const confirmResult = await Swal.fire({
      title: 'Process Stock Entry?',
      text: `Confirm processing of this GRN for Rs ${totalGRNValue.toFixed(2)}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, update inventory'
    })

    if (confirmResult.isConfirmed) {
      try {
        const payload = {
          SupplierId: parseInt(selectedSupplier),
          ReferenceNo: invoiceNo,
          InvoiceDate: invoiceDate,
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

        Swal.fire('GRN Processed', 'Inventory has been updated successfully.', 'success')

        localStorage.removeItem(DRAFT_STORAGE_KEY)
        setGrnItems([])
        setSelectedSupplier('')
        setInvoiceNo('')
        setInvoiceDate(new Date().toISOString().split('T')[0])
      } catch (err: any) {
        Swal.fire('Process Error', err.message || 'Error updating stock database.', 'error')
      }
    }
  }

  const totalGRNValue = useMemo(() => {
    return grnItems.reduce((sum, item) => sum + item.total, 0)
  }, [grnItems])

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.headerRow}>
          <h2 className={styles.pageTitle}>STOCK INTAKE (GRN)</h2>
          {grnItems.length > 0 && (
            <span className={styles.draftBadge}>
              <FiSave /> DRAFT AUTO-SAVED
            </span>
          )}
        </div>

        <div className={styles.sectionHeader}>
          <FiTruck /> 1. VENDOR & INVOICE DETAILS
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
              placeholder="INV-XXXXX"
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
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      <div className={styles.panel} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className={styles.sectionHeader}>
          <FiPackage /> 2. SCAN OR ADD PRODUCTS
        </div>
        <form onSubmit={handleAddItem} className={styles.addBarGrid}>
          <div className={styles.formGroup}>
            <label>Product Search</label>
            <div className={styles.searchContainer}>
              <div className={styles.inputWrapper}>
                <FiSearch className={styles.inputIcon} />
                <input
                  type="text"
                  className={styles.classicInput}
                  placeholder="Type name or scan..."
                  style={{ paddingLeft: '40px' }}
                  value={searchInputValue}
                  onChange={(e) => {
                    setSearchInputValue(e.target.value)
                    setIsDropdownOpen(true)
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  onKeyDown={(e) => handleKeyDown(e, qtyRef)}
                />
              </div>
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
              placeholder="0"
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
              placeholder="0.00"
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
              placeholder="0.00"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Disc %</label>
            <input
              ref={discRef}
              type="text"
              className={styles.classicInput}
              value={inputDiscountPercent}
              onChange={(e) => setInputDiscountPercent(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, addBtnRef)}
              placeholder="0"
            />
          </div>
          <button ref={addBtnRef} type="submit" className={styles.addBtn}>
            <FiPlus size={18} /> ADD
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
                <th>MARGIN</th>
                <th>LINE TOTAL</th>
                <th style={{ textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {grnItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyMsg}>
                    No items in current entry. Progress is automatically saved as a draft.
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
                      <td style={{ fontWeight: 800 }}>{item.name}</td>
                      <td style={{ fontWeight: 900 }}>
                        {item.qty}{' '}
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 'normal',
                            color: 'var(--text-muted)'
                          }}
                        >
                          {item.unit}
                        </span>
                      </td>
                      <td>Rs {buy.toFixed(2)}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 800 }}>
                        Rs {sell.toFixed(2)}
                      </td>
                      <td style={{ color: '#d97706', fontWeight: 700 }}>{item.discountPercent}%</td>
                      <td style={{ fontWeight: 800, color: isLoss ? '#ef4444' : '#0284c7' }}>
                        {profitPercent}% {isLoss && <FiAlertTriangle size={12} />}
                      </td>
                      <td style={{ fontWeight: 900 }}>Rs {item.total.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className={styles.removeBtn}
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remove Item"
                        >
                          <FiX />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.summaryFooter}>
          <div className={styles.totalDisplay}>
            <span className={styles.totalLabel}>Grand Total GRN Value</span>
            <span className={styles.totalValue}>Rs {totalGRNValue.toFixed(2)}</span>
          </div>

          <div className={styles.actionGroup}>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClearDraft}
              disabled={grnItems.length === 0 && !selectedSupplier && !invoiceNo}
            >
              <FiTrash2 /> DISCARD DRAFT
            </button>
            <button
              className={styles.processBtn}
              onClick={handleProcessGRN}
              disabled={grnItems.length === 0}
            >
              <FiCheckCircle size={18} /> PROCESS GRN & UPDATE INVENTORY
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
