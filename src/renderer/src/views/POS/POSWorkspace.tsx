// src/renderer/src/views/POS/POSWorkspace.tsx
import { useState, useEffect } from 'react'
import { Product, StockBatch } from '../../types/models'
import styles from './POSWorkspace.module.css'

interface CartItem extends Product {
  CartQuantity: number
  BatchId: number
  CostPrice: number
}

export default function POSWorkspace() {
  const [products, setProducts] = useState<Product[]>([])
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const loadData = async () => {
    try {
      // @ts-ignore
      const prodData = await window.api.getProducts()
      // @ts-ignore
      const batchData = await window.api.getActiveBatches()
      setProducts(prodData)
      setBatches(batchData)
    } catch (error) {
      console.error('Failed to load inventory data', error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleProductClick = (product: Product) => {
    const availableBatches = batches.filter(
      (b) => b.ProductId === product.Id && b.RemainingQuantity > 0
    )

    if (availableBatches.length === 0) {
      alert(`❌ Out of Stock: ${product.Name}`)
      return
    }

    const batchToUse = availableBatches[0]

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.BatchId === batchToUse.Id)
      if (existingItem) {
        if (existingItem.CartQuantity >= batchToUse.RemainingQuantity) {
          alert(`⚠️ Only ${batchToUse.RemainingQuantity} left in this batch!`)
          return prevCart
        }
        return prevCart.map((item) =>
          item.BatchId === batchToUse.Id ? { ...item, CartQuantity: item.CartQuantity + 1 } : item
        )
      }

      return [
        ...prevCart,
        {
          ...product,
          CartQuantity: 1,
          BatchId: batchToUse.Id,
          CostPrice: batchToUse.CostPrice
        }
      ]
    })
  }

  const updateQuantity = (batchId: number, delta: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.BatchId === batchId) {
          const newQty = item.CartQuantity + delta
          return { ...item, CartQuantity: newQty > 0 ? newQty : 1 }
        }
        return item
      })
    )
  }

  const removeFromCart = (batchId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.BatchId !== batchId))
  }

  const clearCart = () => setCart([])

  const subTotal = cart.reduce((sum, item) => sum + item.SellingPrice * item.CartQuantity, 0)

  const handlePayCash = async () => {
    if (cart.length === 0) return
    setIsProcessing(true)

    try {
      const now = new Date()
      const yy = String(now.getFullYear()).slice(-2)
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const hh = String(now.getHours()).padStart(2, '0')
      const min = String(now.getMinutes()).padStart(2, '0')
      const ss = String(now.getSeconds()).padStart(2, '0')
      const receiptId = `INV-${yy}${mm}${dd}-${hh}${min}${ss}`

      const transaction = {
        ReceiptId: receiptId,
        TransactionDate: now.toISOString(),
        TotalAmount: subTotal,
        PaidAmount: subTotal,
        IsCredit: false,
        CustomerName: 'Walk-in Customer',
        Status: 0 // Paid
      }

      const movements = cart.map((item) => ({
        ProductId: item.Id,
        Quantity: item.CartQuantity,
        UnitCost: item.CostPrice,
        UnitPrice: item.SellingPrice,
        StockBatchId: item.BatchId,
        Note: 'Cash Sale'
      }))

      // @ts-ignore
      await window.api.processSale(transaction, movements)

      alert(`✅ Sale Successful!\nReceipt ID: ${receiptId}`)

      setCart([])
      await loadData()
    } catch (error: any) {
      alert(`❌ Checkout Failed: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={styles.posGrid}>
      {/* AREA 1: Products */}
      <section className={styles.productsArea}>
        <div
          style={{
            padding: '10px',
            backgroundColor: '#334155',
            color: 'white',
            borderBottom: '2px solid #1E293B'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '16px' }}>PRODUCTS CATALOG</h2>
        </div>

        <div className={styles.productScroll}>
          {products.map((p) => (
            <button key={p.Id} className={styles.productBtn} onClick={() => handleProductClick(p)}>
              <span className={styles.productName}>{p.Name}</span>
              <span className={styles.productPrice}>Rs {p.SellingPrice.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* AREA 3: Actions / Numpad */}
      <section className={styles.actionArea}>
        <div className={styles.numpadContainer}>
          <div className={styles.numpadGrid}>
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', 'C'].map((num) => (
              <button key={num} className={styles.numBtn}>
                {num}
              </button>
            ))}
          </div>

          <div className={styles.actionGrid}>
            <button className={styles.discountBtn}>DISCOUNT</button>
            <button
              className={styles.payBtn}
              onClick={handlePayCash}
              disabled={isProcessing || cart.length === 0}
              style={{ opacity: isProcessing || cart.length === 0 ? 0.5 : 1 }}
            >
              {isProcessing ? 'WAIT...' : 'PAY CASH'}
            </button>
          </div>
        </div>
      </section>

      {/* AREA 2: Live Cart */}
      <section className={styles.cartArea}>
        <div className={styles.cartHeader}>
          <h2>CURRENT TICKET</h2>
          {cart.length > 0 && (
            <button className={styles.clearBtn} onClick={clearCart}>
              CLEAR
            </button>
          )}
        </div>

        <div className={styles.cartList}>
          {cart.length === 0 ? (
            <p style={{ color: '#94A3B8', textAlign: 'center', marginTop: '50px' }}>
              Cart is empty...
            </p>
          ) : (
            cart.map((item) => (
              <div key={item.BatchId} className={styles.cartItem}>
                <span className={styles.cartItemName}>{item.Name}</span>
                <div className={styles.qtyControls}>
                  <button
                    className={styles.qtyBtn}
                    onClick={() => updateQuantity(item.BatchId, -1)}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: 'bold' }}>{item.CartQuantity}</span>
                  <button className={styles.qtyBtn} onClick={() => updateQuantity(item.BatchId, 1)}>
                    +
                  </button>
                </div>
                <span className={styles.cartItemPrice}>
                  {(item.SellingPrice * item.CartQuantity).toFixed(2)}
                </span>
                <button className={styles.deleteBtn} onClick={() => removeFromCart(item.BatchId)}>
                  X
                </button>
              </div>
            ))
          )}
        </div>

        <div
          style={{ padding: '20px', backgroundColor: '#E2E8F0', borderTop: '2px solid #CBD5E1' }}
        >
          <h3
            style={{
              margin: 0,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '28px',
              fontWeight: 900,
              color: '#0F172A'
            }}
          >
            <span>TOTAL:</span>
            <span style={{ color: '#059669' }}>Rs {subTotal.toFixed(2)}</span>
          </h3>
        </div>
      </section>
    </div>
  )
}
