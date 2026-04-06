// src/renderer/src/views/Inventory/ProductCatalog.tsx
import { useState, useEffect, useMemo } from 'react'
import Swal from 'sweetalert2'
import {
  FiSearch,
  FiFolder,
  FiFolderMinus,
  FiChevronRight,
  FiChevronDown,
  FiBox,
  FiEye,
  FiX
} from 'react-icons/fi'
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
  const [productBatches, setProductBatches] = useState<any[]>([])

  const loadData = async () => {
    try {
      // @ts-ignore
      const catData = await window.api.getCategories()
      // @ts-ignore
      const prodData = await window.api.getProducts()
      setCategories(catData)
      setProducts(prodData)
    } catch (err: any) {
      Swal.fire('Error', 'Failed to load catalog data: ' + err.message, 'error')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleViewProduct = async (product: Product) => {
    setViewingProduct(product)
    try {
      // @ts-ignore
      const batches = await window.api.getProductBatches(product.Id)

      const activeBatches = (batches || [])
        .filter((b: any) => b.RemainingQuantity > 0)
        .sort(
          (a: any, b: any) =>
            new Date(b.ReceivedDate).getTime() - new Date(a.ReceivedDate).getTime()
        )

      setProductBatches(activeBatches)
    } catch (err: any) {
      Swal.fire('Error', 'Failed to load product batches: ' + err.message, 'error')
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
              onClick={() => {
                setSelectedCatId(cat.Id)
                setSearchQuery('')
              }}
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
                {hasChildren ? (
                  isExpanded ? (
                    <FiChevronDown size={14} />
                  ) : (
                    <FiChevronRight size={14} />
                  )
                ) : (
                  <span style={{ width: '14px', display: 'inline-block' }}></span>
                )}
              </span>
              <span className={styles.folderIcon}>
                {isExpanded ? <FiFolderMinus size={16} /> : <FiFolder size={16} />}
              </span>
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
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return products.filter(
        (p) =>
          p.Name.toLowerCase().includes(q) || (p.Barcode && p.Barcode.toLowerCase().includes(q))
      )
    }

    return selectedCatId === null
      ? products
      : products.filter((p) => p.CategoryId === selectedCatId)
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
            className={`${styles.treeNode} ${selectedCatId === null && !searchQuery ? styles.active : ''}`}
            onClick={() => {
              setSelectedCatId(null)
              setSearchQuery('')
            }}
          >
            <span
              className={styles.expandIcon}
              style={{ width: '14px', display: 'inline-block' }}
            ></span>
            <span className={styles.folderIcon}>
              <FiBox size={16} />
            </span>
            All Products
          </div>
          {treeContent}
        </div>
      </div>

      {/* LAYER 2: DATA TABLE */}
      <div className={styles.panel}>
        <div className={styles.headerRow}>
          <h2 className={styles.pageTitle}>PRODUCT VIEWER</h2>
          <div className={styles.searchWrapper}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.classicInput}
              placeholder="Global Search (Name or Code)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (e.target.value) setSelectedCatId(null)
              }}
            />
          </div>
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
                <th style={{ textAlign: 'right' }}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}
                  >
                    {searchQuery
                      ? 'No products match your search.'
                      : 'No products found in this folder.'}
                  </td>
                </tr>
              ) : (
                displayedProducts.map((product) => (
                  <tr key={product.Id}>
                    <td
                      style={{
                        fontFamily: 'monospace',
                        color: 'var(--text-muted)',
                        fontSize: '12px'
                      }}
                    >
                      {product.Barcode}
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--text-main)' }}>{product.Name}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {getCatName(product.CategoryId)}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      Rs {(product.BuyingPrice || 0).toFixed(2)}
                    </td>
                    <td style={{ color: 'var(--success)', fontWeight: 800 }}>
                      Rs {(product.SellingPrice || 0).toFixed(2)}
                    </td>
                    <td style={{ fontWeight: 900, color: 'var(--primary)' }}>
                      {product.Quantity || 0}{' '}
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          fontWeight: 'normal'
                        }}
                      >
                        {product.Unit}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className={styles.viewBtn} onClick={() => handleViewProduct(product)}>
                        <FiEye size={14} /> VIEW BATCHES
                      </button>
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
          <div className={styles.modalBoxView}>
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
                    marginTop: '4px',
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
                  background: 'var(--bg-canvas)',
                  padding: '10px 20px',
                  borderRadius: '4px',
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
                  fontSize: '14px',
                  marginBottom: '15px',
                  color: 'var(--text-main)',
                  textTransform: 'uppercase',
                  fontWeight: 900,
                  letterSpacing: '0.5px'
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

                        const rawPercent =
                          batch.SellingPrice > 0 ? (maxDiscountValue / batch.SellingPrice) * 100 : 0
                        const discountPercentage =
                          rawPercent % 1 === 0 ? rawPercent.toFixed(0) : rawPercent.toFixed(2)

                        return (
                          <tr key={idx}>
                            <td
                              style={{
                                color: 'var(--text-muted)',
                                fontSize: '13px',
                                fontWeight: 600
                              }}
                            >
                              {new Date(batch.ReceivedDate).toLocaleDateString()}
                            </td>
                            <td style={{ fontWeight: 800, color: 'var(--text-main)' }}>
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
                            <td style={{ color: 'var(--warning)', fontWeight: 800 }}>
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
                <FiX size={16} /> CLOSE WINDOW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
