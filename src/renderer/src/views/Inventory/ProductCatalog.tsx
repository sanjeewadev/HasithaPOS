// src/renderer/src/views/Inventory/ProductCatalog.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { Category, Product } from '../../types/models'
import styles from './ProductCatalog.module.css'

export default function ProductCatalog() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // Filtering State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set())

  // Modal State
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
  const [productBatches, setProductBatches] = useState<any[]>([]) // 🚀 NEW STATE FOR BATCHES

  const loadData = async () => {
    try {
      // @ts-ignore
      const catData = await window.api.getCategories()
      // @ts-ignore
      const prodData = await window.api.getProducts()
      setCategories(catData)
      setProducts(prodData)
    } catch (err) {
      console.error('Failed to load data', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        // @ts-ignore
        await window.api.deleteProduct(id)
        loadData()
      } catch (err) {
        alert('Error deleting product.')
      }
    }
  }

  // --- ACTIONS: VIEW BATCHES ---
  const handleViewProduct = async (product: Product) => {
    setViewingProduct(product)
    try {
      // 🚀 FETCH THE BATCHES FROM OUR NEW BRIDGE
      // @ts-ignore
      const batches = await window.api.getProductBatches(product.Id)
      setProductBatches(batches || [])
    } catch (err) {
      console.error(err)
      setProductBatches([])
    }
  }

  const treeContent = useMemo(() => {
    const renderTree = (parentId: number | null, depth: number = 0) => {
      const children = categories.filter((c) => c.ParentId === parentId)
      if (children.length === 0) return null

      return children.map((cat) => {
        const hasChildren = categories.some((c) => c.ParentId === cat.Id)
        const isExpanded = expandedFolders.has(cat.Id)
        const isActive = selectedCatId === cat.Id

        return (
          <div key={cat.Id}>
            <div
              className={`${styles.treeNode} ${isActive ? styles.active : ''}`}
              style={{ paddingLeft: `${depth * 15 + 10}px` }}
              onClick={() => setSelectedCatId(cat.Id)}
            >
              <span
                className={styles.expandIcon}
                onClick={(e) => {
                  if (hasChildren) {
                    e.stopPropagation()
                    const newExpanded = new Set(expandedFolders)
                    if (newExpanded.has(cat.Id)) newExpanded.delete(cat.Id)
                    else newExpanded.add(cat.Id)
                    setExpandedFolders(newExpanded)
                  }
                }}
              >
                {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
              </span>
              <span className={styles.folderIcon}>{isExpanded ? '📂' : '📁'}</span>
              {cat.Name}
            </div>
            {isExpanded && renderTree(cat.Id, depth + 1)}
          </div>
        )
      })
    }
    return renderTree(null)
  }, [categories, expandedFolders, selectedCatId])

  const displayedProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCatId === null ? true : p.CategoryId === selectedCatId
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        p.Name.toLowerCase().includes(q) || (p.Barcode && p.Barcode.toLowerCase().includes(q))
      return matchesCategory && matchesSearch
    })
  }, [products, selectedCatId, searchQuery])

  const getCatName = (id: number | null) => {
    return categories.find((c) => c.Id === id)?.Name || 'N/A'
  }

  return (
    <div className={styles.container}>
      {/* LAYER 1: SMALL FILTER SIDEBAR */}
      <div className={styles.leftPanel}>
        <div className={styles.panelHeader}>Filter By Folder</div>
        <div className={styles.treeContainer}>
          <div
            className={`${styles.treeNode} ${selectedCatId === null ? styles.active : ''}`}
            onClick={() => setSelectedCatId(null)}
          >
            <span className={styles.expandIcon}>•</span>
            <span className={styles.folderIcon}>📦</span>
            All Products
          </div>
          {treeContent}
        </div>
      </div>

      {/* LAYER 2: DATA TABLE */}
      <div className={styles.panel}>
        <div className={styles.headerRow}>
          <h2 className={styles.panelHeaderTitle}>PRODUCT CATALOG</h2>
          <input
            type="text"
            className={styles.classicInput}
            placeholder="Search by Name or Barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.classicTable}>
            <thead>
              <tr>
                <th>CODE</th>
                <th>NAME</th>
                <th>CATEGORY</th>
                <th>BUY PRICE</th>
                <th>SELL PRICE</th>
                <th>STOCK</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}
                  >
                    No products found.
                  </td>
                </tr>
              ) : (
                displayedProducts.map((product) => (
                  <tr key={product.Id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {product.Barcode}
                    </td>
                    <td style={{ fontWeight: 600 }}>{product.Name}</td>
                    <td>{getCatName(product.CategoryId)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      Rs {(product.BuyingPrice || 0).toFixed(2)}
                    </td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                      Rs {(product.SellingPrice || 0).toFixed(2)}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {product.Quantity || 0} {product.Unit}
                    </td>
                    <td>
                      <div className={styles.actionGroup}>
                        <button
                          className={styles.viewBtn}
                          onClick={() => handleViewProduct(product)}
                        >
                          VIEW
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(product.Id)}
                        >
                          DELETE
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL: BATCH DETAILS --- */}
      {viewingProduct !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--text-main)' }}>
                  {viewingProduct.Name}
                </h2>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    marginTop: '6px',
                    fontWeight: 600
                  }}
                >
                  Category: {getCatName(viewingProduct.CategoryId)} | Base Unit:{' '}
                  {viewingProduct.Unit} | Code: {viewingProduct.Barcode || 'N/A'}
                </div>
              </div>
              <div
                style={{
                  textAlign: 'right',
                  background: 'var(--bg-surface)',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}
                >
                  Total Stock Available
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--primary)' }}>
                  {viewingProduct.Quantity || 0}{' '}
                  <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                    {viewingProduct.Unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              <h3
                style={{
                  fontSize: '15px',
                  marginBottom: '15px',
                  color: 'var(--text-main)',
                  textTransform: 'uppercase',
                  fontWeight: 800
                }}
              >
                Active Inventory Batches (GRN History)
              </h3>

              <div className={styles.tableWrapper}>
                <table className={styles.classicTable}>
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>SUPPLIER</th>
                      <th>ORIGINAL QTY</th>
                      <th>CURRENT QTY</th>
                      <th>BUYING</th>
                      <th>SELLING</th>
                      <th>MAX DISCOUNT</th>
                      <th>MIN ALLOWED PRICE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productBatches.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            textAlign: 'center',
                            padding: '50px',
                            color: 'var(--text-muted)',
                            fontWeight: 600
                          }}
                        >
                          No active batches found. Stock is added via GRN.
                        </td>
                      </tr>
                    ) : (
                      productBatches.map((batch, idx) => {
                        const maxDiscountValue = batch.Discount || 0
                        const minAllowedPrice = batch.SellingPrice - maxDiscountValue
                        const discountPercentage = (
                          (maxDiscountValue / batch.SellingPrice) *
                          100
                        ).toFixed(0)

                        return (
                          <tr key={idx}>
                            <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                              {new Date(batch.ReceivedDate).toLocaleDateString()}
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                              {batch.SupplierName || 'Unknown'}
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{batch.InitialQuantity}</td>
                            <td
                              style={{
                                fontWeight: 900,
                                color: 'var(--text-main)',
                                fontSize: '15px'
                              }}
                            >
                              {batch.RemainingQuantity}
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>
                              Rs {batch.CostPrice.toFixed(2)}
                            </td>
                            <td style={{ color: 'var(--success)', fontWeight: 800 }}>
                              Rs {batch.SellingPrice.toFixed(2)}
                            </td>
                            <td style={{ color: 'var(--warning)', fontWeight: 700 }}>
                              {discountPercentage}% (Rs {maxDiscountValue.toFixed(2)})
                            </td>
                            <td>
                              <span className={styles.dangerBadge}>
                                Rs {minAllowedPrice.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button className={styles.closeBtn} onClick={() => setViewingProduct(null)}>
                CLOSE WINDOW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
