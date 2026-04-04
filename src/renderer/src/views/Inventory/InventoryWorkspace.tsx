// src/renderer/src/views/Inventory/InventoryWorkspace.tsx
import { useState, useEffect } from 'react'
import styles from '../../styles/SharedSidebar.module.css'
import { useAuth } from '../../store/AuthContext'

import ProductCatalog from './ProductCatalog'
import SupplierManager from './SupplierManager'
import StockInManager from './StockInManager'
import CatalogManager from './CatalogManager'
import AdjustStock from './AdjustStock'

export default function InventoryWorkspace() {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('Products')

  // 🚀 RBAC: Recognize both Root and Admin
  const isAdmin = currentUser?.Role === 0 || currentUser?.Role === 1

  // 🚀 RBAC: If a staff member tries to navigate to a blocked tab, kick them back to Products
  useEffect(() => {
    if (!isAdmin && (activeTab === 'Catalog' || activeTab === 'Suppliers')) {
      setActiveTab('Products')
    }
  }, [activeTab, isAdmin])

  const renderContent = () => {
    switch (activeTab) {
      case 'Products':
        return <ProductCatalog />
      case 'StockIn':
        return <StockInManager />
      case 'Adjustments':
        return <AdjustStock />
      // 🚀 RBAC: Only render these if Admin/Root
      case 'Catalog':
        return isAdmin ? <CatalogManager /> : null
      case 'Suppliers':
        return isAdmin ? <SupplierManager /> : null
      default:
        return null
    }
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.menuHeader}>Inventory Menu</div>

        <button
          className={`${styles.navButton} ${activeTab === 'Products' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('Products')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          View Products
        </button>

        {/* 🚀 RBAC: Hide Catalog from Staff */}
        {isAdmin && (
          <button
            className={`${styles.navButton} ${activeTab === 'Catalog' ? styles.activeBtn : ''}`}
            onClick={() => setActiveTab('Catalog')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            </svg>
            Catalog Manager
          </button>
        )}

        <button
          className={`${styles.navButton} ${activeTab === 'StockIn' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('StockIn')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
          Stock In (GRN)
        </button>

        <button
          className={`${styles.navButton} ${activeTab === 'Adjustments' ? styles.activeBtn : ''}`}
          onClick={() => setActiveTab('Adjustments')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Adjust Stock
        </button>

        {/* 🚀 RBAC: Hide Suppliers from Staff */}
        {isAdmin && (
          <button
            className={`${styles.navButton} ${activeTab === 'Suppliers' ? styles.activeBtn : ''}`}
            onClick={() => setActiveTab('Suppliers')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            Suppliers
          </button>
        )}
      </aside>

      <section className={styles.contentArea}>{renderContent()}</section>
    </div>
  )
}
