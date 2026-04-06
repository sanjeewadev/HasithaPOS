// src/renderer/src/views/Reports/InventoryAlerts.tsx
import { useState, useEffect } from 'react'
import { Product } from '../../types/models'
import { FiAlertTriangle, FiCheckCircle, FiRefreshCw, FiBox } from 'react-icons/fi'
import styles from './InventoryAlerts.module.css'

export default function InventoryAlerts() {
  const [alertItems, setAlertItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      // @ts-ignore
      const prodData = await window.api.getLowStockAlerts(10)
      setAlertItems(prodData || [])
    } catch (error) {
      console.error('Failed to load products for alerts', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const outOfStockItems = alertItems.filter((p) => p.Quantity <= 0)
  const lowStockItems = alertItems.filter((p) => p.Quantity > 0)

  const formatQty = (qty: number) => {
    return qty % 1 !== 0 ? qty.toFixed(2) : qty
  }

  return (
    <div className={styles.container}>
      {/* 🚀 WRAPPED IN THE UNIFIED MASTER PANEL */}
      <div className={styles.panel}>
        <div className={styles.headerRow}>
          <h2 className={styles.pageTitle}>INVENTORY ALERTS DASHBOARD</h2>
          <button className={styles.refreshBtn} onClick={loadData} disabled={loading}>
            <FiRefreshCw className={loading ? styles.spinning : ''} />
            {loading ? 'REFRESHING...' : 'REFRESH ALERTS'}
          </button>
        </div>

        <div className={styles.gridContainer}>
          {/* --- LEFT PANEL: OUT OF STOCK --- */}
          <div className={styles.alertColumn}>
            <div className={`${styles.columnHeader} ${styles.dangerHeader}`}>
              <FiBox size={20} />
              <span>OUT OF STOCK ({outOfStockItems.length})</span>
            </div>

            <div className={styles.listWrapper}>
              {outOfStockItems.length === 0 ? (
                <div className={styles.emptyState}>
                  <FiCheckCircle size={48} className={styles.successIcon} />
                  <h3>Looking Good</h3>
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
                      <div className={`${styles.statusBadge} ${styles.dangerBadge}`}>EMPTY</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* --- RIGHT PANEL: LOW STOCK --- */}
          <div className={styles.alertColumn}>
            <div className={`${styles.columnHeader} ${styles.warningHeader}`}>
              <FiAlertTriangle size={20} />
              <span>LOW STOCK WARNINGS ({lowStockItems.length})</span>
            </div>

            <div className={styles.listWrapper}>
              {lowStockItems.length === 0 ? (
                <div className={styles.emptyState}>
                  <FiCheckCircle size={48} className={styles.successIcon} />
                  <h3>Well Stocked</h3>
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
                        {formatQty(p.Quantity)} {p.Unit} LEFT
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
