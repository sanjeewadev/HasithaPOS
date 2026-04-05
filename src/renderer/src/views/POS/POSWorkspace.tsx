// src/renderer/src/views/POS/POSWorkspace.tsx
import React, { useState, useEffect, useMemo } from 'react'
import Swal from 'sweetalert2' // 🚀 IMPORT SWEETALERT
import { Product } from '../../types/models'
import styles from './POSWorkspace.module.css'

interface CartItem {
  uid: string
  productId: number
  batchId: number
  name: string
  unitPrice: string
  originalPrice: number
  buyPrice: number
  quantity: string
  maxDiscount: number
  availableStock: number
  unit: string
}

export default function POSWorkspace() {
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [selectedCartUid, setSelectedCartUid] = useState<string | null>(null)

  const [batchModalProduct, setBatchModalProduct] = useState<Product | null>(null)
  const [availableBatches, setAvailableBatches] = useState<any[]>([])

  const [checkoutMode, setCheckoutMode] = useState<'none' | 'cash' | 'credit'>('none')
  const [customerName, setCustomerName] = useState('')
  const [downPayment, setDownPayment] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const loadData = async () => {
    try {
      // @ts-ignore
      setProducts(await window.api.getProducts())
    } catch (err) {
      console.error('Failed to load data', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const displayedProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.Quantity <= 0) return false
      const q = searchQuery.toLowerCase()
      return p.Name.toLowerCase().includes(q) || (p.Barcode && p.Barcode.toLowerCase().includes(q))
    })
  }, [products, searchQuery])

  const handleProductClick = async (product: Product) => {
    try {
      // @ts-ignore
      const batches = await window.api.getProductBatches(product.Id)
      const activeBatches = batches.filter((b: any) => b.RemainingQuantity > 0)

      if (activeBatches.length === 0) {
        // 🚀 FIXED: Call Swal, then return
        Swal.fire('Inventory Mismatch', 'No active batches found for this product.', 'error')
        return
      }

      if (activeBatches.length === 1) {
        addToCart(product, activeBatches[0])
      } else {
        setAvailableBatches(activeBatches)
        setBatchModalProduct(product)
      }
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'Error checking stock batches.', 'error')
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
        // 🚀 FIXED: Call Swal, then return
        Swal.fire(
          'Stock Limit',
          `Only ${existingItem.availableStock} left in this batch!`,
          'warning'
        )
        return
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
      buyPrice: batch.CostPrice,
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
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return

    setCartItems((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) return item

        if (field === 'quantity') {
          const numVal = parseFloat(value) || 0
          if (numVal > item.availableStock) {
            Swal.fire('Stock Limit', `Only ${item.availableStock} left in this batch!`, 'warning')
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
  const activeUnitPrice = activeEditItem ? parseFloat(activeEditItem.unitPrice) || 0 : 0
  const activeQty = activeEditItem ? parseFloat(activeEditItem.quantity) || 0 : 0

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

  // 🚀 SECURITY CHECKS
  const hasLossItem = cartItems.some((item) => (parseFloat(item.unitPrice) || 0) < item.buyPrice)
  const hasZeroQty = cartItems.some((item) => (parseFloat(item.quantity) || 0) <= 0)

  const balanceDue = Math.max(0, grandTotal - (parseFloat(downPayment) || 0))

  const handleProcessSale = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    // 🚀 FIXED: Call Swal, then return
    if (cartItems.length === 0) {
      Swal.fire('Empty Cart', 'Cart is empty!', 'warning')
      return
    }

    if (hasLossItem) {
      Swal.fire(
        'Sale Blocked',
        'Cannot process sale. One or more items are priced below cost!',
        'error'
      )
      return
    }

    if (hasZeroQty) {
      Swal.fire(
        'Sale Blocked',
        'Cannot process sale. One or more items have a quantity of 0!',
        'error'
      )
      return
    }

    if (checkoutMode === 'credit' && !customerName.trim()) {
      Swal.fire('Required Field', 'Customer name is required for a credit sale!', 'warning')
      return
    }

    setIsProcessing(true)
    try {
      const receiptId = `INV-${Date.now()}`
      const isCredit = checkoutMode === 'credit'
      const paidAmt = isCredit ? parseFloat(downPayment) || 0 : grandTotal

      let status = 0
      if (isCredit) {
        if (paidAmt === 0) status = 1
        else if (paidAmt < grandTotal) status = 2
      }

      const transaction = {
        ReceiptId: receiptId,
        TransactionDate: new Date().toISOString(),
        TotalAmount: grandTotal,
        PaidAmount: paidAmt,
        IsCredit: isCredit ? 1 : 0,
        CustomerName: isCredit ? customerName : 'Walk-in Customer',
        Status: status
      }

      const movements = cartItems.map((item) => ({
        ProductId: item.productId,
        Quantity: parseFloat(item.quantity) || 0,
        UnitCost: item.originalPrice,
        UnitPrice: parseFloat(item.unitPrice) || 0,
        StockBatchId: item.batchId,
        Note: ''
      }))

      // @ts-ignore
      await window.api.processCompleteSale(transaction, movements)

      setCartItems([])
      setSelectedCartUid(null)
      setCheckoutMode('none')
      setCustomerName('')
      setDownPayment('')
      loadData()

      Swal.fire('✅ Sale Successful!', `Receipt ID: ${receiptId}`, 'success')
    } catch (error: any) {
      Swal.fire('Checkout Failed', error.message, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFastCheckout = async () => {
    // 🚀 FIXED: Call Swal, then return
    if (cartItems.length === 0) {
      Swal.fire('Empty Cart', 'Cart is empty!', 'warning')
      return
    }

    if (hasLossItem) {
      Swal.fire(
        'Sale Blocked',
        'Cannot process sale. One or more items are priced below cost!',
        'error'
      )
      return
    }

    if (hasZeroQty) {
      Swal.fire(
        'Sale Blocked',
        'Cannot process sale. One or more items have a quantity of 0!',
        'error'
      )
      return
    }

    setIsProcessing(true)
    try {
      const receiptId = `INV-${Date.now()}`

      const transaction = {
        ReceiptId: receiptId,
        TransactionDate: new Date().toISOString(),
        TotalAmount: grandTotal,
        PaidAmount: grandTotal,
        IsCredit: 0,
        CustomerName: 'Walk-in Customer',
        Status: 0
      }

      const movements = cartItems.map((item) => ({
        ProductId: item.productId,
        Quantity: parseFloat(item.quantity) || 0,
        UnitCost: item.originalPrice,
        UnitPrice: parseFloat(item.unitPrice) || 0,
        StockBatchId: item.batchId,
        Note: ''
      }))

      // @ts-ignore
      await window.api.processCompleteSale(transaction, movements)

      setCartItems([])
      setSelectedCartUid(null)
      loadData()

      Swal.fire('✅ Fast Checkout Complete!', `Receipt ID: ${receiptId}`, 'success')
    } catch (error: any) {
      Swal.fire('Checkout Failed', error.message, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className={styles.editTotal}>
                  Rs {(activeQty * activeUnitPrice).toFixed(2)}
                </div>
                <button
                  className={styles.closeEditBtn}
                  onClick={() => setSelectedCartUid(null)}
                  title="Close Panel"
                >
                  ✖
                </button>
              </div>
            </div>

            <div className={styles.editControls}>
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

              <div className={styles.editInfoBox}>
                <div className={styles.infoRow}>
                  Original Price:{' '}
                  <span className={styles.infoValue}>
                    Rs {activeEditItem.originalPrice.toFixed(2)}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  Max Configured Disc:
                  <span className={styles.infoValueWarning}>
                    Rs {activeEditItem.maxDiscount.toFixed(2)}
                  </span>
                </div>
                {activeEditItem.maxDiscount > 0 &&
                  activeUnitPrice > activeEditItem.originalPrice - activeEditItem.maxDiscount && (
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
                      ⚡ Quick Apply Max Discount
                    </button>
                  )}
              </div>

              <div className={styles.priceWrapper}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    width: '100%',
                    marginBottom: '8px'
                  }}
                >
                  <label className={styles.editLabel} style={{ marginBottom: 0 }}>
                    Unit Price
                  </label>

                  {/* 🚀 FLEXIBLE WARNING MESSAGES */}
                  {activeUnitPrice < activeEditItem.buyPrice ? (
                    <span className={styles.dangerTextCompact}>
                      ⛔ BELOW COST (Rs {activeEditItem.buyPrice.toFixed(2)})!
                    </span>
                  ) : activeUnitPrice <
                    activeEditItem.originalPrice - activeEditItem.maxDiscount ? (
                    <span className={styles.warningTextCompact}>⚠️ OVER MAX DISCOUNT</span>
                  ) : null}
                </div>
                <div
                  className={`${styles.priceInputBox} ${
                    activeUnitPrice < activeEditItem.buyPrice
                      ? styles.danger
                      : activeUnitPrice < activeEditItem.originalPrice - activeEditItem.maxDiscount
                        ? styles.warning
                        : ''
                  }`}
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
              const isBelowCost = itemPrice < item.buyPrice
              const isOverDiscount =
                itemPrice < item.originalPrice - item.maxDiscount && !isBelowCost

              return (
                <div
                  key={item.uid}
                  className={`${styles.cartItem} ${selectedCartUid === item.uid ? styles.active : ''} ${isBelowCost ? styles.cartItemDanger : ''}`}
                  onClick={() => setSelectedCartUid(item.uid)}
                >
                  <div className={styles.cartItemLeft}>
                    <div className={styles.cartItemName}>{item.name}</div>
                    <div className={styles.cartItemDetails}>
                      Rs {itemPrice.toFixed(2)} × {itemQty} {item.unit}
                    </div>
                    {itemPrice < item.originalPrice && (
                      <div
                        className={`${styles.cartItemDiscountInfo} ${isBelowCost ? styles.discDanger : isOverDiscount ? styles.discWarning : ''}`}
                      >
                        {isBelowCost
                          ? '⛔ LOSS: BELOW COST'
                          : isOverDiscount
                            ? '⚠️ OVER MAX DISC'
                            : `Original: Rs ${item.originalPrice.toFixed(2)}`}
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

        <div className={styles.checkoutFooter}>
          {/* 🚀 LOSS PREVENTION MESSAGE */}
          {hasLossItem && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                padding: '10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                textAlign: 'center',
                marginBottom: '15px',
                border: '1px solid #fecaca'
              }}
            >
              ⛔ CHECKOUT BLOCKED: One or more items are priced below their cost price.
            </div>
          )}

          {/* 🚀 ZERO QUANTITY PREVENTION MESSAGE */}
          {hasZeroQty && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                color: '#d97706',
                padding: '10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                textAlign: 'center',
                marginBottom: '15px',
                border: '1px solid #fde68a'
              }}
            >
              ⚠️ CHECKOUT BLOCKED: An item in your cart has 0 quantity. Update the quantity or
              remove it.
            </div>
          )}

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
            <button
              className={`${styles.checkoutBtn} ${styles.btnPayPrint}`}
              onClick={() => {
                if (cartItems.length > 0) {
                  setCheckoutMode('cash')
                } else {
                  Swal.fire('Empty Cart', 'Cart is empty!', 'warning')
                }
              }}
              disabled={hasLossItem || hasZeroQty}
            >
              PAY & PRINT
            </button>
            <button
              className={`${styles.checkoutBtn} ${styles.btnCredit}`}
              onClick={() => {
                if (cartItems.length > 0) {
                  setCheckoutMode('credit')
                } else {
                  Swal.fire('Empty Cart', 'Cart is empty!', 'warning')
                }
              }}
              disabled={hasLossItem || hasZeroQty}
            >
              CREDIT SALE
            </button>
            <button
              className={`${styles.checkoutBtn} ${styles.btnCheckout}`}
              onClick={handleFastCheckout}
              disabled={isProcessing || hasLossItem || hasZeroQty}
            >
              {isProcessing ? '...' : 'CHECKOUT'}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* BATCH SELECTION MODAL                     */}
      {/* ========================================= */}
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

      {/* ========================================= */}
      {/* CHECKOUT MODALS (CASH & CREDIT)           */}
      {/* ========================================= */}
      {checkoutMode !== 'none' && (
        <div className={styles.modalOverlay}>
          <div className={styles.checkoutModalBox}>
            <div
              className={styles.modalHeader}
              style={{
                fontSize: '24px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '15px'
              }}
            >
              {checkoutMode === 'cash' ? 'Confirm Payment & Print' : 'Credit Sale Setup'}
            </div>

            <form onSubmit={handleProcessSale} className={styles.checkoutForm}>
              <div className={styles.checkoutTotalBanner}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase'
                  }}
                >
                  Amount Due
                </div>
                <div style={{ fontSize: '38px', fontWeight: 900, color: 'var(--text-main)' }}>
                  Rs {grandTotal.toFixed(2)}
                </div>
              </div>

              {checkoutMode === 'credit' && (
                <>
                  <div className={styles.checkoutInputGroup}>
                    <label>Customer Name *</label>
                    <input
                      type="text"
                      className={styles.standardInput}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Sanjeewa"
                      autoFocus
                      required
                    />
                  </div>
                  <div className={styles.checkoutInputGroup}>
                    <label>Initial Down Payment (Optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      className={styles.standardInput}
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div
                    className={styles.changeDueBox}
                    style={{ background: '#fffbeb', color: '#d97706', borderColor: '#fde68a' }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                      Remaining Debt to Collect Later
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900 }}>
                      Rs {balanceDue.toFixed(2)}
                    </div>
                  </div>
                </>
              )}

              <div className={styles.checkoutActionGrid}>
                <button
                  type="button"
                  className={styles.btnCancelSale}
                  onClick={() => setCheckoutMode('none')}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnConfirmSale} disabled={isProcessing}>
                  {isProcessing
                    ? 'Processing...'
                    : checkoutMode === 'cash'
                      ? 'COMPLETE & PRINT'
                      : 'AUTHORIZE CREDIT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
