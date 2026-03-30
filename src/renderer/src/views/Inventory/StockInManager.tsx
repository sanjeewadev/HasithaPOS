// src/renderer/src/views/Inventory/StockInManager.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { Product, Supplier } from '../../types/models'
import styles from './StockInManager.module.css'

interface GRNItem {
  id: string
  productId: number
  name: string
  barcode: string
  unit: string
  qty: string // String for smooth typing
  buyPrice: string // String for smooth typing
  sellPrice: string // String for smooth typing
  discountPercent: string // The % the user typed
  discountAmount: number // The actual Rs. value saved to DB
  total: number
}

export default function StockInManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')

  const [searchInputValue, setSearchInputValue] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

  const [inputQty, setInputQty] = useState('')
  const [inputBuyPrice, setInputBuyPrice] = useState('')
  const [inputSellPrice, setInputSellPrice] = useState('')
  const [inputDiscountPercent, setInputDiscountPercent] = useState('')

  const [grnItems, setGrnItems] = useState<GRNItem[]>([])

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
  }, [])

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
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductId) return alert('Select a product first!')

    const prod = products.find((p) => p.Id === selectedProductId)
    const qtyNum = parseFloat(inputQty) || 0
    const buyNum = parseFloat(inputBuyPrice) || 0
    const sellNum = parseFloat(inputSellPrice) || 0
    const discPercentNum = parseFloat(inputDiscountPercent) || 0

    if (!prod || qtyNum <= 0 || buyNum <= 0 || sellNum <= 0) {
      return alert('Please enter valid quantities and prices.')
    }

    // Calculate the Rupee amount from the Percentage
    const calculatedDiscountRs = (sellNum * discPercentNum) / 100

    const newItem: GRNItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: prod.Id,
      name: prod.Name,
      barcode: prod.Barcode || 'N/A',
      unit: prod.Unit || 'Pcs',
      qty: inputQty,
      buyPrice: inputBuyPrice,
      sellPrice: inputSellPrice,
      discountPercent: inputDiscountPercent,
      discountAmount: calculatedDiscountRs, // This goes to DB
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

  // 🚀 FIXED: I accidentally deleted this function last time! Here it is:
  const handleRemoveItem = (cartId: string) => {
    setGrnItems(grnItems.filter((item) => item.id !== cartId))
  }

  const handleProcessGRN = async () => {
    if (!selectedSupplier || grnItems.length === 0 || !invoiceNo) {
      return alert('Please complete the Header details and add items.')
    }

    if (window.confirm(`Process GRN for Rs ${totalGRNValue.toFixed(2)}?`)) {
      try {
        const payload = {
          SupplierId: parseInt(selectedSupplier),
          ReferenceNo: invoiceNo,
          Items: grnItems.map((item) => ({
            ...item,
            qty: parseFloat(item.qty),
            buyPrice: parseFloat(item.buyPrice),
            sellPrice: parseFloat(item.sellPrice),
            discountLimit: item.discountAmount // DB saves Rupee value!
          }))
        }
        // @ts-ignore
        await window.api.processGRN(payload)
        alert('GRN Processed Successfully!')
        setGrnItems([])
        setSelectedSupplier('')
        setInvoiceNo('')
      } catch (err) {
        alert('Error processing GRN.')
      }
    }
  }

  const totalGRNValue = useMemo(() => {
    return grnItems.reduce((sum, item) => sum + item.total, 0)
  }, [grnItems])

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>1. Receive Details</h2>
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
            <label>Receive Date</label>
            <input
              type="date"
              className={styles.classicInput}
              defaultValue={new Date().toISOString().split('T')[0]}
              disabled
            />
          </div>
        </div>
      </div>

      <div className={styles.panel}>
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
              type="text"
              className={styles.classicInput}
              value={inputQty}
              onChange={(e) => setInputQty(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Buy (Rs)</label>
            <input
              type="text"
              className={styles.classicInput}
              value={inputBuyPrice}
              onChange={(e) => setInputBuyPrice(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Sell (Rs)</label>
            <input
              type="text"
              className={styles.classicInput}
              value={inputSellPrice}
              onChange={(e) => setInputSellPrice(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Max Disc %</label>
            <input
              type="text"
              className={styles.classicInput}
              value={inputDiscountPercent}
              onChange={(e) => setInputDiscountPercent(e.target.value)}
            />
          </div>
          <button type="submit" className={`${styles.actionBtn} ${styles.addBtn}`}>
            + ADD
          </button>
        </form>
      </div>

      <div className={styles.panel} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 className={styles.panelTitle}>3. Staging & Review</h2>
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
              {grnItems.map((item) => {
                const sell = parseFloat(item.sellPrice) || 0
                const buy = parseFloat(item.buyPrice) || 0
                const profit = sell - buy
                const profitPercent = ((profit / buy) * 100).toFixed(1)
                const isLoss = profit - item.discountAmount < 0

                return (
                  <tr key={item.id} className={isLoss ? styles.lossRow : ''}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ fontWeight: 800 }}>
                      {item.qty} {item.unit}
                    </td>
                    <td>Rs {buy.toFixed(2)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                      Rs {sell.toFixed(2)}
                    </td>
                    <td style={{ color: 'var(--warning)', fontWeight: 600 }}>
                      {item.discountPercent}% (Rs {item.discountAmount.toFixed(2)})
                    </td>
                    <td style={{ fontWeight: 700, color: isLoss ? 'var(--danger)' : '#0ea5e9' }}>
                      {profitPercent}% {isLoss && '⚠️ LOSS!'}
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
              })}
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

        <button className={`${styles.actionBtn} ${styles.processBtn}`} onClick={handleProcessGRN}>
          ✅ PROCESS GRN & UPDATE INVENTORY
        </button>
      </div>
    </div>
  )
}
