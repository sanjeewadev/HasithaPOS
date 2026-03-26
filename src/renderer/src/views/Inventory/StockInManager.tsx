// src/renderer/src/views/Inventory/StockInManager.tsx
import React, { useState, useEffect } from 'react'
import { Supplier, Product } from '../../types/models'
import styles from './StockInManager.module.css'

interface GrnItem {
  id: string
  productId: number
  productName: string
  quantity: number
  costPrice: number
  sellingPrice: number
  totalCost: number
}

export default function StockInManager() {
  const [step, setStep] = useState<1 | 2>(1)
  const [isProcessing, setIsProcessing] = useState(false)

  // Data from DB
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // Invoice Details (Step 1)
  const [selectedSupplier, setSelectedSupplier] = useState<number>(0)
  const [billNumber, setBillNumber] = useState('')

  // Entry Form (Step 2)
  const [selectedProduct, setSelectedProduct] = useState<number>(0)
  const [buyPrice, setBuyPrice] = useState<number | string>('')
  const [sellPrice, setSellPrice] = useState<number | string>('')
  const [qty, setQty] = useState<number | string>('')

  // The Bill Items
  const [billItems, setBillItems] = useState<GrnItem[]>([])

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // @ts-ignore
        const suppData = await window.api.getSuppliers()
        // @ts-ignore
        const prodData = await window.api.getProducts()
        setSuppliers(suppData)
        setProducts(prodData)
      } catch (error) {
        console.error('Failed to load initial GRN data', error)
      }
    }
    loadInitialData()
  }, [])

  const handleStartGrn = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSupplier === 0 || !billNumber.trim()) {
      alert('Supplier and Bill Number are required.')
      return
    }
    setStep(2)
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedProduct === 0 || !buyPrice || !sellPrice || !qty) {
      alert('All item fields are required!')
      return
    }

    const prod = products.find((p) => p.Id === Number(selectedProduct))
    if (!prod) return

    const newItem: GrnItem = {
      id: Math.random().toString(36).substr(2, 9), // Temp unique ID for the list
      productId: prod.Id,
      productName: prod.Name,
      quantity: Number(qty),
      costPrice: Number(buyPrice),
      sellingPrice: Number(sellPrice),
      totalCost: Number(qty) * Number(buyPrice)
    }

    setBillItems([...billItems, newItem])

    // Clear item inputs for the next one
    setSelectedProduct(0)
    setBuyPrice('')
    setSellPrice('')
    setQty('')
  }

  const handleRemoveItem = (id: string) => {
    setBillItems(billItems.filter((item) => item.id !== id))
  }

  const handleFinalize = async () => {
    if (billItems.length === 0) {
      alert('Cannot finalize an empty bill!')
      return
    }

    if (
      !window.confirm(
        'Are you sure you want to finalize this GRN? This will permanently update live stock quantities.'
      )
    )
      return

    setIsProcessing(true)

    try {
      const now = new Date().toISOString()

      // Loop through items and send them to the Stock Engine
      for (const item of billItems) {
        const movementPayload = {
          ProductId: item.productId,
          Quantity: item.quantity,
          UnitCost: item.costPrice,
          UnitPrice: item.sellingPrice,
          Date: now,
          Note: `GRN Bill: ${billNumber}`
        }

        // This hits the receiveStock backend function we built!
        // @ts-ignore
        await window.api.receiveStock(movementPayload)
      }

      alert('✅ Goods Received Note successfully processed! Inventory is updated.')

      // Reset everything back to Step 1
      setStep(1)
      setSelectedSupplier(0)
      setBillNumber('')
      setBillItems([])
    } catch (err: any) {
      alert(`❌ Error processing GRN: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const grandTotal = billItems.reduce((sum, item) => sum + item.totalCost, 0)
  const supplierName = suppliers.find((s) => s.Id === Number(selectedSupplier))?.Name

  return (
    <div className={styles.container}>
      {/* --- STEP 1: SETUP --- */}
      {step === 1 && (
        <div className={styles.setupPanel}>
          <h2 className={styles.setupHeader}>START NEW STOCK IN (GRN)</h2>
          <p style={{ textAlign: 'center', color: '#64748B', marginBottom: '25px' }}>
            Enter the details from the supplier's physical delivery note.
          </p>

          <form onSubmit={handleStartGrn}>
            <div className={styles.formGroup}>
              <label>SELECT SUPPLIER *</label>
              <select
                className={styles.classicSelect}
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(Number(e.target.value))}
                required
              >
                <option value={0}>-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.Id} value={s.Id}>
                    {s.Name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>BILL / INVOICE NUMBER *</label>
              <input
                type="text"
                className={styles.classicInput}
                placeholder="e.g. INV-2026-991"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                required
              />
            </div>

            <div style={{ marginTop: '30px' }}>
              <button type="submit" className={styles.primaryBtn}>
                START ENTRY ➔
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- STEP 2: ENTRY WORKSPACE --- */}
      {step === 2 && (
        <div className={styles.workspaceGrid}>
          {/* Left: Entry Form */}
          <div className={styles.panel}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
                borderBottom: '2px solid #E2E8F0',
                paddingBottom: '10px'
              }}
            >
              <h2 style={{ margin: 0, fontSize: '16px', color: '#1E293B' }}>ADD ITEM</h2>
              <button className={styles.cancelBtn} onClick={() => setStep(1)}>
                ← Back
              </button>
            </div>

            <form
              onSubmit={handleAddItem}
              style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
            >
              <div className={styles.formGroup}>
                <label>PRODUCT *</label>
                <select
                  className={styles.classicSelect}
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(Number(e.target.value))}
                  required
                >
                  <option value={0}>-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.Id} value={p.Id}>
                      {p.Name} ({p.Barcode})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>BUYING COST (Per Unit) *</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.classicInput}
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>NEW SELLING PRICE *</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.classicInput}
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>QUANTITY RECEIVED *</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.classicInput}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                />
              </div>

              <div style={{ flex: 1 }}></div>

              <button type="submit" className={styles.secondaryBtn}>
                + ADD TO BILL
              </button>
            </form>
          </div>

          {/* Right: Bill Items Table & Finalize */}
          <div className={styles.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <h2 className={styles.panelHeader} style={{ border: 'none', margin: 0, padding: 0 }}>
                BILL ITEMS
              </h2>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#64748B',
                    fontWeight: 'bold'
                  }}
                >
                  SUPPLIER: {supplierName}
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#64748B',
                    fontWeight: 'bold'
                  }}
                >
                  BILL NO: {billNumber}
                </span>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.classicTable}>
                <thead>
                  <tr>
                    <th>PRODUCT</th>
                    <th>QTY</th>
                    <th>UNIT COST</th>
                    <th>SELL PRICE</th>
                    <th>LINE TOTAL</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {billItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}
                      >
                        No items added to this bill yet.
                      </td>
                    </tr>
                  ) : (
                    billItems.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 'bold' }}>{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>Rs {item.costPrice.toFixed(2)}</td>
                        <td style={{ color: '#059669' }}>Rs {item.sellingPrice.toFixed(2)}</td>
                        <td style={{ fontWeight: 'bold' }}>Rs {item.totalCost.toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            X
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.totalBanner}>
              <div>
                <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 'bold' }}>
                  TOTAL INVOICE VALUE
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#4ADE80' }}>
                  Rs {grandTotal.toFixed(2)}
                </div>
              </div>
              <button
                className={styles.primaryBtn}
                style={{ width: '200px', margin: 0 }}
                onClick={handleFinalize}
                disabled={isProcessing}
              >
                {isProcessing ? 'SAVING...' : '✔ FINALIZE GRN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
