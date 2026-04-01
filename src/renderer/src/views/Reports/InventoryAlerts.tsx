// src/renderer/src/views/Reports/InventoryAlerts.tsx
import React, { useState, useEffect } from 'react'
import { Product } from '../../types/models'
import styles from './InventoryAlerts.module.css'

export default function InventoryAlerts() {
  const [alertItems, setAlertItems] = useState<Product[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        // 🚀 UPGRADED: Calling the fast, dedicated alerts query instead of ALL products!
        // @ts-ignore
        const prodData = await window.api.getLowStockAlerts(10)
        setAlertItems(prodData || [])
      } catch (error) {
        console.error('Failed to load products for alerts', error)
      }
    }
    loadData()
  }, [])

  // Automatically split the fast data into two distinct arrays
  const outOfStockItems = alertItems.filter((p) => p.Quantity <= 0)
  const lowStockItems = alertItems.filter((p) => p.Quantity > 0)

  return (
    <div className={styles.container}>
      {/* --- LEFT PANEL: OUT OF STOCK (CRITICAL) --- */}
      <div className={styles.alertPanel}>
        <div className={`${styles.panelHeader} ${styles.dangerHeader}`}>
          <span>🚨 OUT OF STOCK ({outOfStockItems.length})</span>
        </div>

        <div className={styles.listWrapper}>
          {outOfStockItems.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>👍</div>
              <h3>Looking Good!</h3>
              <p>No active products are out of stock.</p>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {/* --- RIGHT PANEL: LOW STOCK (WARNING) --- */}
      <div className={styles.alertPanel}>
        <div className={`${styles.panelHeader} ${styles.warningHeader}`}>
          <span>⚠️ LOW STOCK WARNINGS ({lowStockItems.length})</span>
        </div>

        <div className={styles.listWrapper}>
          {lowStockItems.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>✅</div>
              <h3>Well Stocked!</h3>
              <p>No products are currently running low.</p>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  )
}
