// src/renderer/src/views/Inventory/AdjustStock.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { Product, Category } from '../../types/models'
import styles from './AdjustStock.module.css'

export default function AdjustStock() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Left Sidebar State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null)

  // Active Product State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [activeBatches, setActiveBatches] = useState<any[]>([])
  const [adjustmentHistory, setAdjustmentHistory] = useState<any[]>([])

  // Form State
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [qtyToRemove, setQtyToRemove] = useState('') // 🚀 Kept as string for smooth typing!
  const [reason, setReason] = useState('0') // 0 = Correction, 1 = Lost
  const [note, setNote] = useState('')

  const loadBaseData = async () => {
    try {
      // @ts-ignore
      setCategories(await window.api.getCategories())
      // @ts-ignore
      setProducts(await window.api.getProducts())
    } catch (err) {
      console.error('Failed to load data', err)
    }
  }

  useEffect(() => {
    loadBaseData()
  }, [])

  // 🚀 FIXED: Only show MAIN (Root) categories in the dropdown to keep it clean!
  const mainCategories = useMemo(() => {
    return categories.filter((c) => c.ParentId === null)
  }, [categories])

  const handleSelectProduct = async (prod: Product) => {
    setSelectedProduct(prod)
    setSelectedBatchId('')
    setQtyToRemove('')
    setReason('0')
    setNote('')

    try {
      // @ts-ignore
      const batches = await window.api.getProductBatches(prod.Id)
      setActiveBatches(batches.filter((b: any) => b.RemainingQuantity > 0))

      // @ts-ignore
      const history = await window.api.getProductAdjustments(prod.Id)
      setAdjustmentHistory(history || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !selectedBatchId) return alert('Select a product and a batch.')

    const qty = parseFloat(qtyToRemove)
    if (isNaN(qty) || qty <= 0) return alert('Enter a valid quantity greater than 0.')

    const batch = activeBatches.find((b) => b.Id.toString() === selectedBatchId)
    if (!batch) return
    if (qty > batch.RemainingQuantity) {
      return alert(`Cannot remove ${qty}. Only ${batch.RemainingQuantity} left in this batch.`)
    }

    if (
      window.confirm(
        `Are you sure you want to permanently remove ${qty} ${selectedProduct.Unit} from stock?`
      )
    ) {
      try {
        const payload = {
          ProductId: selectedProduct.Id,
          StockBatchId: parseInt(selectedBatchId),
          Quantity: qty,
          Reason: parseInt(reason),
          Note: note || `Manual adjustment`
        }

        // @ts-ignore
        await window.api.adjustStock(payload)
        alert('Stock removed successfully.')

        loadBaseData()
        handleSelectProduct(selectedProduct)
      } catch (err: any) {
        alert(err.message || 'Error adjusting stock.')
      }
    }
  }

  const displayedProducts = useMemo(() => {
    return products.filter((p) => {
      // 🚀 FIXED: If a main category is selected, we need to show products in it AND its sub-folders!
      const isInCategoryOrSub =
        selectedCatId === null
          ? true
          : p.CategoryId === selectedCatId ||
            categories.find((c) => c.Id === p.CategoryId)?.ParentId === selectedCatId

      const q = searchQuery.toLowerCase()
      const matchSearch =
        p.Name.toLowerCase().includes(q) || (p.Barcode && p.Barcode.toLowerCase().includes(q))

      return isInCategoryOrSub && matchSearch
    })
  }, [products, selectedCatId, searchQuery, categories])

  return (
    <div className={styles.container}>
      <div className={styles.leftSidebar}>
        <div className={styles.searchHeader}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className={styles.categorySelect}
            value={selectedCatId || ''}
            onChange={(e) => setSelectedCatId(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">All Main Categories</option>
            {mainCategories.map((c) => (
              <option key={c.Id} value={c.Id}>
                {c.Name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.productList}>
          {displayedProducts.map((p) => (
            <div
              key={p.Id}
              className={`${styles.productCard} ${selectedProduct?.Id === p.Id ? styles.active : ''}`}
              onClick={() => handleSelectProduct(p)}
            >
              <div>
                <div className={styles.prodName}>{p.Name}</div>
                <div className={styles.prodCode}>{p.Barcode}</div>
              </div>
              <div className={`${styles.stockBadge} ${p.Quantity <= 0 ? styles.empty : ''}`}>
                {p.Quantity} {p.Unit}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.mainArea}>
        {!selectedProduct ? (
          <div
            className={styles.panel}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)'
            }}
          >
            <h2>Select a product from the list to adjust stock.</h2>
          </div>
        ) : (
          <>
            <div className={styles.panel}>
              <div className={styles.productHeader}>
                <h2 className={styles.productTitle}>
                  {selectedProduct.Name}{' '}
                  <span className={styles.productUnit}>
                    | Total System Stock:{' '}
                    <b>
                      {selectedProduct.Quantity} {selectedProduct.Unit}
                    </b>
                  </span>
                </h2>
              </div>

              <form onSubmit={handleAdjustStock} className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>1. Select Batch to Reduce</label>
                  <select
                    className={styles.classicInput}
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose specific batch --</option>
                    {activeBatches.map((b: any) => (
                      <option key={b.Id} value={b.Id}>
                        Qty: {b.RemainingQuantity} | Rec:{' '}
                        {new Date(b.ReceivedDate).toLocaleDateString()} | Cost: Rs {b.CostPrice}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>2. Qty to Remove ({selectedProduct.Unit})</label>
                  <input
                    type="text"
                    className={styles.classicInput}
                    value={qtyToRemove}
                    onChange={(e) => {
                      // 🚀 Allow only numbers and one decimal point
                      if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                        setQtyToRemove(e.target.value)
                      }
                    }}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>3. Reason for Removal</label>
                  <select
                    className={styles.classicInput}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  >
                    <option value="0">Correction (Audit / Error)</option>
                    <option value="1">Lost / Damaged / Expired</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className={styles.dangerBtn}
                  disabled={!selectedBatchId || activeBatches.length === 0}
                >
                  REMOVE STOCK
                </button>
              </form>
            </div>

            <div className={styles.panel} style={{ flex: 1 }}>
              <h3 className={styles.tableHeader}>Previous Adjustments</h3>
              <table className={styles.classicTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Qty Removed</th>
                    <th>Note / Details</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustmentHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}
                      >
                        No manual adjustments recorded for this product.
                      </td>
                    </tr>
                  ) : (
                    adjustmentHistory.map((adj: any) => (
                      <tr key={adj.Id}>
                        <td>{new Date(adj.Date).toLocaleString()}</td>
                        <td
                          style={{
                            fontWeight: 600,
                            color: adj.Reason === 1 ? 'var(--danger)' : 'var(--warning)'
                          }}
                        >
                          {adj.Reason === 0 ? 'Correction' : 'Lost/Damaged'}
                        </td>
                        <td style={{ fontWeight: 800 }}>
                          - {adj.Quantity} {selectedProduct.Unit}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{adj.Note}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
