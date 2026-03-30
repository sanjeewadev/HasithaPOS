// src/renderer/src/views/POS/POSWorkspace.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { Product, Category } from '../../types/models'
import styles from './POSWorkspace.module.css'

interface CartItem {
  uid: string
  productId: number
  batchId: number
  name: string
  unitPrice: string // Changed to string to stop input freezing!
  originalPrice: number
  quantity: string // Changed to string to stop input freezing!
  maxDiscount: number
  availableStock: number
  unit: string
}

export default function POSWorkspace() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [selectedCartUid, setSelectedCartUid] = useState<string | null>(null)

  const [batchModalProduct, setBatchModalProduct] = useState<Product | null>(null)
  const [availableBatches, setAvailableBatches] = useState<any[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        // @ts-ignore
        setProducts(await window.api.getProducts())
        // @ts-ignore
        setCategories(await window.api.getCategories())
      } catch (err) {
        console.error('Failed to load data', err)
      }
    }
    loadData()
  }, [])

  const displayedProducts = useMemo(() => {
    return products.filter((p) => {
      // 🚀 Filter out anything with 0 stock to keep grid clean
      if (p.Quantity <= 0) return false

      const matchCat = selectedCategoryId === null ? true : p.CategoryId === selectedCategoryId
      const q = searchQuery.toLowerCase()
      const matchSearch =
        p.Name.toLowerCase().includes(q) || (p.Barcode && p.Barcode.toLowerCase().includes(q))
      return matchCat && matchSearch
    })
  }, [products, searchQuery, selectedCategoryId])

  const handleProductClick = async (product: Product) => {
    try {
      // @ts-ignore
      const batches = await window.api.getProductBatches(product.Id)

      // 🚀 Only look at batches that actually have stock
      const activeBatches = batches.filter((b: any) => b.RemainingQuantity > 0)

      if (activeBatches.length === 0) return alert('Inventory mismatch! No active batches found.')

      if (activeBatches.length === 1) {
        addToCart(product, activeBatches[0])
      } else {
        // 🚀 Triggers the manual selection pop-up!
        setAvailableBatches(activeBatches)
        setBatchModalProduct(product)
      }
    } catch (err) {
      console.error(err)
      alert('Error checking stock batches.')
    }
  }

  const addToCart = (product: Product, batch: any) => {
    const existingIndex = cartItems.findIndex(
      (i) => i.productId === product.Id && i.batchId === batch.Id
    )

    if (existingIndex >= 0) {
      const existingItem = cartItems[existingIndex]
      const currentQty = parseFloat(existingItem.quantity) || 0

      if (currentQty >= existingItem.availableStock) {
        return alert(`Only ${existingItem.availableStock} left in this batch!`)
      }

      const updatedCart = [...cartItems]
      updatedCart[existingIndex].quantity = (currentQty + 1).toString()
      setCartItems(updatedCart)
      setSelectedCartUid(existingItem.uid)
      setBatchModalProduct(null)
      return
    }

    const newUid = Math.random().toString(36).substr(2, 9)
    const newItem: CartItem = {
      uid: newUid,
      productId: product.Id,
      batchId: batch.Id,
      name: product.Name,
      unitPrice: batch.SellingPrice.toString(),
      originalPrice: batch.SellingPrice,
      quantity: '1',
      maxDiscount: batch.Discount,
      availableStock: batch.RemainingQuantity,
      unit: product.Unit || 'Pcs'
    }
    setCartItems([newItem, ...cartItems])
    setSelectedCartUid(newUid)
    setBatchModalProduct(null)
  }

  const handleUpdateCart = (uid: string, field: 'quantity' | 'unitPrice', value: string) => {
    // 🚀 Regex allows numbers, a single decimal point, or an empty string, stopping letters.
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return

    setCartItems((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) return item

        if (field === 'quantity') {
          const numVal = parseFloat(value) || 0
          if (numVal > item.availableStock) {
            alert(`Only ${item.availableStock} left in this batch!`)
            return item
          }
        }
        return { ...item, [field]: value }
      })
    )
  }

  const handleRemoveCartItem = (uid: string) => {
    setCartItems((prev) => prev.filter((item) => item.uid !== uid))
    if (selectedCartUid === uid) setSelectedCartUid(null)
  }

  const activeEditItem = cartItems.find((i) => i.uid === selectedCartUid)

  // Safe parsed values for calculations
  const activeUnitPrice = activeEditItem ? parseFloat(activeEditItem.unitPrice) || 0 : 0
  const activeQty = activeEditItem ? parseFloat(activeEditItem.quantity) || 0 : 0

  // --- CALCULATE PAYMENT SUMMARY ---
  const subTotal = cartItems.reduce(
    (sum, item) => sum + (parseFloat(item.quantity) || 0) * item.originalPrice,
    0
  )
  const totalDiscount = cartItems.reduce((sum, item) => {
    const q = parseFloat(item.quantity) || 0
    const p = parseFloat(item.unitPrice) || 0
    const discountPerItem = item.originalPrice - p
    return sum + (discountPerItem > 0 ? discountPerItem * q : 0)
  }, 0)
  const grandTotal = subTotal - totalDiscount

  return (
    <div className={styles.container}>
      <div className={styles.leftColumn}>
        {/* TOP LEFT: PRODUCT CATALOG GRID */}
        <div className={styles.gridPanel}>
          <div className={styles.gridHeader}>
            PRODUCTS CATALOG
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by Name or Barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.categoryScroll}>
            <div
              className={`${styles.categoryPill} ${selectedCategoryId === null ? styles.active : ''}`}
              onClick={() => setSelectedCategoryId(null)}
            >
              All Items
            </div>
            {categories.map((cat) => (
              <div
                key={cat.Id}
                className={`${styles.categoryPill} ${selectedCategoryId === cat.Id ? styles.active : ''}`}
                onClick={() => setSelectedCategoryId(cat.Id)}
              >
                {cat.Name}
              </div>
            ))}
          </div>

          <div className={styles.productsArea}>
            {displayedProducts.map((p) => (
              <div key={p.Id} className={styles.productCard} onClick={() => handleProductClick(p)}>
                <div className={styles.productName} title={p.Name}>
                  {p.Name}
                </div>
                <div className={styles.productPriceRow}>
                  <span className={styles.productPrice}>Rs {(p.SellingPrice || 0).toFixed(2)}</span>
                  <span
                    className={`${styles.productStock} ${p.Quantity <= 0 ? styles.outOfStock : ''}`}
                  >
                    {p.Quantity} {p.Unit}
                  </span>
                </div>
              </div>
            ))}
            {displayedProducts.length === 0 && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '40px',
                  color: 'var(--text-muted)'
                }}
              >
                No active products to display.
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM LEFT: PROFESSIONAL EDIT PANEL */}
        {activeEditItem ? (
          <div className={styles.editPanelActive}>
            <div className={styles.editHeader}>
              <div className={styles.editName}>
                {activeEditItem.name}{' '}
                <span
                  style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 'normal' }}
                >
                  | Stock: {activeEditItem.availableStock}
                </span>
              </div>
              <div className={styles.editTotal}>Rs {(activeQty * activeUnitPrice).toFixed(2)}</div>
            </div>

            <div className={styles.editControls}>
              {/* COMPACT PILL QUANTITY STEPPER */}
              <div className={styles.qtyWrapper}>
                <label className={styles.editLabel}>Quantity ({activeEditItem.unit})</label>
                <div className={styles.qtyStepper}>
                  <button
                    className={styles.qtyBtn}
                    onClick={() =>
                      handleUpdateCart(
                        activeEditItem.uid,
                        'quantity',
                        Math.max(1, activeQty - 1).toString()
                      )
                    }
                  >
                    −
                  </button>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className={styles.qtyInput}
                    value={activeEditItem.quantity}
                    onChange={(e) =>
                      handleUpdateCart(activeEditItem.uid, 'quantity', e.target.value)
                    }
                  />
                  <button
                    className={styles.qtyBtn}
                    onClick={() =>
                      handleUpdateCart(activeEditItem.uid, 'quantity', (activeQty + 1).toString())
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              {/* SLEEK INFO CENTER (NO DISCOUNT CODE) */}
              <div className={styles.editInfoBox}>
                <div className={styles.infoRow}>
                  Original Price:{' '}
                  <span className={styles.infoValue}>
                    Rs {activeEditItem.originalPrice.toFixed(2)}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  Max Discount:
                  <span className={styles.infoValueWarning}>
                    {((activeEditItem.maxDiscount / activeEditItem.originalPrice) * 100).toFixed(0)}
                    % (Rs {(activeEditItem.originalPrice - activeEditItem.maxDiscount).toFixed(2)})
                  </span>
                </div>
              </div>

              {/* GIANT PRICE INPUT WITH SLEEK QUICK ACTION */}
              <div className={styles.priceWrapper}>
                <label className={styles.editLabel}>Unit Price</label>
                <div
                  className={`${styles.priceInputBox} ${activeUnitPrice < activeEditItem.originalPrice - activeEditItem.maxDiscount ? styles.danger : ''}`}
                >
                  <div className={styles.pricePrefix}>Rs</div>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className={styles.priceInput}
                    value={activeEditItem.unitPrice}
                    onChange={(e) =>
                      handleUpdateCart(activeEditItem.uid, 'unitPrice', e.target.value)
                    }
                  />
                </div>

                {activeUnitPrice < activeEditItem.originalPrice - activeEditItem.maxDiscount ? (
                  <span className={styles.dangerText}>⚠️ BELOW MINIMUM!</span>
                ) : activeEditItem.maxDiscount > 0 &&
                  activeUnitPrice > activeEditItem.originalPrice - activeEditItem.maxDiscount ? (
                  <button
                    className={styles.sleekDiscountBtn}
                    onClick={() =>
                      handleUpdateCart(
                        activeEditItem.uid,
                        'unitPrice',
                        (activeEditItem.originalPrice - activeEditItem.maxDiscount).toString()
                      )
                    }
                  >
                    ⚡ Apply{' '}
                    {((activeEditItem.maxDiscount / activeEditItem.originalPrice) * 100).toFixed(0)}
                    % Discount
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div
            className={styles.editPanelActive}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              border: '2px dashed var(--border-color)',
              boxShadow: 'none'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '22px' }}>Current Order</h3>
            <p style={{ margin: '5px 0 0 0', fontSize: '15px' }}>
              Select an item in the cart to rapidly edit quantity or apply discounts.
            </p>
          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* RIGHT COLUMN (Modern Cart & Checkout)     */}
      {/* ========================================= */}
      <div className={styles.rightColumn}>
        <div className={styles.cartHeader}>
          <span>
            Order Summary{' '}
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', marginLeft: '5px' }}>
              ({cartItems.length} items)
            </span>
          </span>
          <button
            className={styles.clearBtn}
            onClick={() => {
              setCartItems([])
              setSelectedCartUid(null)
            }}
          >
            CLEAR ALL
          </button>
        </div>

        <div className={styles.cartItemsArea}>
          {cartItems.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: 'var(--text-muted)',
                fontWeight: 600
              }}
            >
              Cart is empty...
            </div>
          ) : (
            cartItems.map((item) => {
              const itemPrice = parseFloat(item.unitPrice) || 0
              const itemQty = parseFloat(item.quantity) || 0

              return (
                <div
                  key={item.uid}
                  className={`${styles.cartItem} ${selectedCartUid === item.uid ? styles.active : ''}`}
                  onClick={() => setSelectedCartUid(item.uid)}
                >
                  <div className={styles.cartItemLeft}>
                    <div className={styles.cartItemName}>{item.name}</div>
                    <div className={styles.cartItemDetails}>
                      Rs {itemPrice.toFixed(2)} × {itemQty} {item.unit}
                    </div>

                    {itemPrice < item.originalPrice && (
                      <div className={styles.cartItemDiscountInfo}>
                        Original: Rs {item.originalPrice.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className={styles.cartItemRight}>
                    <div className={styles.cartItemPrice}>
                      Rs {(itemQty * itemPrice).toFixed(2)}
                    </div>
                    <button
                      className={styles.cartItemTrash}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveCartItem(item.uid)
                      }}
                      title="Remove Item"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* MODERN PAYMENT SUMMARY */}
        <div className={styles.checkoutFooter}>
          <div className={styles.summaryRow}>
            <span>Subtotal</span>
            <span>Rs {subTotal.toFixed(2)}</span>
          </div>

          <div className={`${styles.summaryRow} ${totalDiscount > 0 ? styles.discount : ''}`}>
            <span>Discount</span>
            <span>
              {totalDiscount > 0 ? '-' : ''} Rs {totalDiscount.toFixed(2)}
            </span>
          </div>

          <div className={styles.summaryTotalRow}>
            <span className={styles.totalLabel}>Total Payment</span>
            <span className={styles.totalValue}>Rs {grandTotal.toFixed(2)}</span>
          </div>

          <div className={styles.checkoutBtnGrid}>
            <button className={`${styles.checkoutBtn} ${styles.btnPayPrint}`}>PAY & PRINT</button>
            <button className={`${styles.checkoutBtn} ${styles.btnCredit}`}>CREDIT SALE</button>
            <button className={`${styles.checkoutBtn} ${styles.btnCheckout}`}>CHECKOUT</button>
          </div>
        </div>
      </div>

      {/* BATCH MODAL (NO DISCOUNT CODES) */}
      {batchModalProduct && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>Select Batch</div>
            <div className={styles.modalSub}>
              Multiple stock batches found for <b>{batchModalProduct.Name}</b>. Which one to sell?
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {availableBatches.map((batch) => (
                <div
                  key={batch.Id}
                  className={styles.batchOption}
                  onClick={() => addToCart(batchModalProduct, batch)}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {batch.SupplierName || 'Stock Entry'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Date: {new Date(batch.ReceivedDate).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      In Stock: {batch.RemainingQuantity}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--success)' }}>
                      Rs {batch.SellingPrice.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className={styles.cancelBtn} onClick={() => setBatchModalProduct(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
