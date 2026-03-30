// src/renderer/src/views/Reports/InventoryAlerts.tsx
import React, { useState, useEffect } from 'react'
import { Product } from '../../types/models'
import styles from './InventoryAlerts.module.css'

export default function InventoryAlerts() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        // @ts-ignore
        const prodData = await window.api.getProducts()
        setProducts(prodData)
      } catch (error) {
        console.error('Failed to load products for alerts', error)
      }
    }
    loadData()
  }, [])

  // Thresholds
  const outOfStockItems = products.filter((p) => p.Quantity <= 0)
  const lowStockItems = products.filter((p) => p.Quantity > 0 && p.Quantity <= 10) // 10 is our low stock limit

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span>⚠️ Restocking Alerts</span>
        </div>

        <div className={styles.listWrapper}>
          {/* 1. OUT OF STOCK (Highest Priority) */}
          {outOfStockItems.length > 0 && (
            <div className={styles.alertSection}>
              <h3 className={`${styles.sectionTitle} ${styles.textDanger}`}>
                Out of Stock ({outOfStockItems.length})
              </h3>
              <div className={styles.cardGrid}>
                {outOfStockItems.map((p) => (
                  <div key={p.Id} className={`${styles.alertCard} ${styles.dangerCard}`}>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{p.Name}</span>
                      <span className={styles.itemCode}>CODE: {p.Barcode || 'N/A'}</span>
                    </div>
                    <div className={`${styles.statusBadge} ${styles.dangerBadge}`}>
                      EMPTY (0 {p.Unit})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. LOW STOCK */}
          {lowStockItems.length > 0 && (
            <div className={styles.alertSection}>
              <h3 className={`${styles.sectionTitle} ${styles.textWarning}`}>
                Low Stock ({lowStockItems.length})
              </h3>
              <div className={styles.cardGrid}>
                {lowStockItems.map((p) => (
                  <div key={p.Id} className={`${styles.alertCard} ${styles.warningCard}`}>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{p.Name}</span>
                      <span className={styles.itemCode}>CODE: {p.Barcode || 'N/A'}</span>
                    </div>
                    <div className={`${styles.statusBadge} ${styles.warningBadge}`}>
                      ONLY {p.Quantity} {p.Unit} LEFT
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. PERFECT HEALTH (No Alerts) */}
          {outOfStockItems.length === 0 && lowStockItems.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>✅</div>
              <h2>All Clear!</h2>
              <p>All stock levels are currently healthy. No alerts to show.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
