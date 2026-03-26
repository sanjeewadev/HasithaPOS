// src/renderer/src/views/Inventory/InventoryWorkspace.tsx
import { useState } from 'react'
import styles from './InventoryWorkspace.module.css'

import ProductCatalog from './ProductCatalog'
import CategoryManager from './CategoryManager'
import SupplierManager from './SupplierManager'
import StockInManager from './StockInManager'

export default function InventoryWorkspace() {
  // This state tracks which sub-menu is currently open
  const [activeTab, setActiveTab] = useState('Products')

  // This acts like a mini-router just for the Inventory section
  const renderContent = () => {
    switch (activeTab) {
      case 'Products':
      case 'Products':
        return <ProductCatalog />
      case 'Categories':
        return <CategoryManager />
      case 'StockIn':
        return <StockInManager />
      case 'Adjustments':
        return (
          <div className={styles.classicCard}>
            <h2 style={{ marginTop: 0, color: '#1E293B' }}>Remove / Adjust Stock</h2>
            <p style={{ color: '#64748B' }}>Loss and damage corrections will go here...</p>
          </div>
        )
      case 'Suppliers':
        return <SupplierManager />
      default:
        return null
    }
  }

  return (
    <div className={styles.inventoryContainer}>
      {/* INTERNAL SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.menuHeader}>Inventory Menu</div>

        <button
          className={`${styles.navButton} ${activeTab === 'Products' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('Products')}
        >
          <span>📦</span> View Products
        </button>

        <button
          className={`${styles.navButton} ${activeTab === 'Categories' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('Categories')}
        >
          <span>📁</span> Categories
        </button>

        <button
          className={`${styles.navButton} ${activeTab === 'StockIn' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('StockIn')}
        >
          <span>🚛</span> Stock In (GRN)
        </button>

        <button
          className={`${styles.navButton} ${activeTab === 'Adjustments' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('Adjustments')}
        >
          <span>⚖️</span> Adjust Stock
        </button>

        <button
          className={`${styles.navButton} ${activeTab === 'Suppliers' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('Suppliers')}
        >
          <span>🏢</span> Suppliers
        </button>
      </aside>

      {/* RIGHT SIDE CONTENT AREA */}
      <section className={styles.contentArea}>{renderContent()}</section>
    </div>
  )
}
