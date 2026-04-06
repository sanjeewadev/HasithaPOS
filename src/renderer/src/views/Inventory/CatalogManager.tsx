// src/renderer/src/views/Inventory/CatalogManager.tsx
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
  FiX,
  FiEdit2,
  FiTrash2,
  FiFolderPlus,
  FiPlusSquare,
  FiArrowLeft
} from 'react-icons/fi'
import { Category, Product } from '../../types/models'
import styles from './CatalogManager.module.css'

export default function CatalogManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // State: File Explorer
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set())

  // Global Search
  const [globalSearch, setGlobalSearch] = useState('')

  // State: Creation Modals
  const [modalView, setModalView] = useState<'CLOSED' | 'CHOICE' | 'FOLDER' | 'PRODUCT'>('CLOSED')
  const [newItemName, setNewItemName] = useState('')
  const [prodUnit, setProdUnit] = useState('Pcs')

  // State: Viewing and Editing
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
  const [productBatches, setProductBatches] = useState<any[]>([])

  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editProdName, setEditProdName] = useState('')
  const [editProdUnit, setEditProdUnit] = useState('')
  const [editProdFolder, setEditProdFolder] = useState<number>(0)

  const [editingFolder, setEditingFolder] = useState<Category | null>(null)
  const [editFolderName, setEditFolderName] = useState('')

  const loadData = async () => {
    try {
      // @ts-ignore
      const catData = await window.api.getCategories()
      // @ts-ignore
      const prodData = await window.api.getProducts()
      setCategories(catData || [])
      setProducts(prodData || [])
    } catch (err) {
      console.error('Data load failed', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // --- ACTIONS: BACK & DELETE ---
  const handleBack = () => {
    if (!selectedFolderId) return
    const currentFolder = categories.find((c) => c.Id === selectedFolderId)
    if (currentFolder) setSelectedFolderId(currentFolder.ParentId)
  }

  const handleDeleteFolder = async (id: number) => {
    const hasSubFolders = categories.some((c) => c.ParentId === id)
    const hasProducts = products.some((p) => p.CategoryId === id)

    if (hasSubFolders || hasProducts) {
      Swal.fire(
        'Action Denied',
        'This folder is not empty!\n\nYou must move or delete all products and sub-folders inside it before deleting. This protects your database history.',
        'error'
      )
      return
    }

    const confirmResult = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to delete this empty folder?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it'
    })

    if (confirmResult.isConfirmed) {
      try {
        // @ts-ignore
        await window.api.deleteCategory(id)
        if (selectedFolderId === id) setSelectedFolderId(null)
        loadData()
      } catch (err) {
        Swal.fire('Error', 'Error deleting folder.', 'error')
      }
    }
  }

  const handleDeleteProduct = async (id: number) => {
    const confirmResult = await Swal.fire({
      title: 'Delete Product?',
      text: 'Are you sure you want to remove this product from the catalog?\n\n(Note: Past sales history for this item will be safely preserved.)',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete product'
    })

    if (confirmResult.isConfirmed) {
      try {
        // @ts-ignore
        await window.api.deleteProduct(id)
        loadData()
      } catch (err) {
        Swal.fire('Error', 'Error deleting product.', 'error')
      }
    }
  }

  // --- ACTIONS: VIEW BATCHES ---
  const handleViewProduct = async (product: Product) => {
    setViewingProduct(product)
    try {
      // @ts-ignore
      const batches = await window.api.getProductBatches(product.Id)
      setProductBatches(batches || [])
    } catch (err) {
      setProductBatches([])
    }
  }

  // --- ACTIONS: CREATION ---
  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    const safeName = newItemName.trim()
    if (!safeName) {
      Swal.fire('Error', 'Folder name cannot be empty.', 'error')
      return
    }

    try {
      // @ts-ignore
      await window.api.addCategory({ Name: safeName, ParentId: selectedFolderId })
      setModalView('CLOSED')
      setNewItemName('')
      loadData()
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        Swal.fire(
          'Duplicate Entry',
          'A folder with this name already exists in your catalog.',
          'warning'
        )
      } else {
        Swal.fire('Error', 'Failed to create folder: ' + (err.message || 'Unknown error.'), 'error')
      }
    }
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFolderId) {
      Swal.fire('Action Required', 'You must be inside a folder to create a product.', 'warning')
      return
    }

    const safeName = newItemName.trim()
    if (!safeName) {
      Swal.fire('Error', 'Product name cannot be empty.', 'error')
      return
    }

    const generatedSKU = 'SKU-' + Math.floor(10000000 + Math.random() * 90000000)
    const payload = {
      Name: safeName,
      Barcode: generatedSKU,
      CategoryId: selectedFolderId,
      Unit: prodUnit,
      BuyingPrice: 0,
      SellingPrice: 0,
      DiscountLimit: 0,
      Quantity: 0,
      IsActive: 1
    }

    try {
      // @ts-ignore
      await window.api.addProduct(payload)
      setModalView('CLOSED')
      setNewItemName('')
      setProdUnit('Pcs')
      loadData()
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        Swal.fire(
          'Duplicate Entry',
          'A product with this name already exists in your catalog.',
          'warning'
        )
      } else {
        Swal.fire(
          'Error',
          'Failed to create product: ' + (err.message || 'Unknown error.'),
          'error'
        )
      }
    }
  }

  // --- ACTIONS: EDITING ---
  const openEditFolder = (folder: Category) => {
    setEditingFolder(folder)
    setEditFolderName(folder.Name)
  }

  const handleUpdateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFolder) return

    const safeName = editFolderName.trim()
    if (!safeName) {
      Swal.fire('Error', 'Folder name cannot be empty.', 'error')
      return
    }

    try {
      // @ts-ignore
      await window.api.updateCategory({ ...editingFolder, Name: safeName })
      setEditingFolder(null)
      loadData()
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        Swal.fire('Duplicate Entry', 'A folder with this name already exists.', 'warning')
      } else {
        Swal.fire('Error', 'Error updating folder: ' + err.message, 'error')
      }
    }
  }

  const openEditProduct = (product: Product) => {
    setEditingProduct(product)
    setEditProdName(product.Name)
    setEditProdUnit(product.Unit || 'Pcs')
    setEditProdFolder(product.CategoryId)
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    const safeName = editProdName.trim()
    if (!safeName) {
      Swal.fire('Error', 'Product name cannot be empty.', 'error')
      return
    }

    try {
      const payload = {
        ...editingProduct,
        Name: safeName,
        Unit: editProdUnit,
        CategoryId: editProdFolder
      }
      // @ts-ignore
      await window.api.updateProduct(payload)
      setEditingProduct(null)
      loadData()
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        Swal.fire(
          'Duplicate Entry',
          'A product with this name already exists in your catalog.',
          'warning'
        )
      } else {
        Swal.fire('Error', 'Error updating product: ' + err.message, 'error')
      }
    }
  }

  // --- UI RENDERERS ---
  const treeContent = useMemo(() => {
    const renderTree = (parentId: number | null, depth: number = 0) => {
      const children = categories.filter((c) => c.ParentId === parentId)
      if (children.length === 0) return null

      return children.map((cat) => {
        const hasChildren = categories.some((c) => c.ParentId === cat.Id)
        const isExpanded = expandedFolders.has(cat.Id)
        const isActive = selectedFolderId === cat.Id

        return (
          <div key={cat.Id}>
            <div
              className={`${styles.treeNode} ${isActive ? styles.active : ''}`}
              style={{ paddingLeft: `${depth * 15 + 10}px` }}
              onClick={() => {
                setSelectedFolderId(cat.Id)
                setGlobalSearch('') // Clear search if they click a folder
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
  }, [categories, expandedFolders, selectedFolderId])

  // Dynamic filtering based on Global Search or Selected Folder
  const displayedFolders = useMemo(() => {
    if (globalSearch) return [] // Hide folders when searching
    return categories.filter((c) => c.ParentId === selectedFolderId)
  }, [categories, selectedFolderId, globalSearch])

  const displayedProducts = useMemo(() => {
    if (globalSearch) {
      const q = globalSearch.toLowerCase()
      return products.filter(
        (p) =>
          p.Name.toLowerCase().includes(q) || (p.Barcode && p.Barcode.toLowerCase().includes(q))
      )
    }
    return selectedFolderId ? products.filter((p) => p.CategoryId === selectedFolderId) : []
  }, [products, selectedFolderId, globalSearch])

  const currentFolderName = globalSearch
    ? 'Search Results'
    : selectedFolderId
      ? categories.find((c) => c.Id === selectedFolderId)?.Name
      : 'Root Directory'

  const getCatName = (id: number | null) => categories.find((c) => c.Id === id)?.Name || 'N/A'

  return (
    <div className={styles.container}>
      {/* LAYER 1: FILE EXPLORER (LEFT) */}
      <div className={styles.leftPanel}>
        <div className={styles.panelHeader}>CATALOG FOLDERS</div>
        <div className={styles.treeContainer}>{treeContent}</div>
      </div>

      {/* LAYER 2: CONTENTS (RIGHT) */}
      <div className={styles.rightPanel}>
        <h2 className={styles.pageTitle}>CATALOG MANAGER</h2>

        <div className={styles.rightHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {!globalSearch && selectedFolderId !== null && (
              <button className={styles.backBtn} onClick={handleBack}>
                <FiArrowLeft size={16} /> Back
              </button>
            )}
            <div className={styles.breadcrumb}>
              <span>Path: </span> {currentFolderName}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div className={styles.searchWrapper}>
              <FiSearch className={styles.searchIcon} />
              <input
                type="text"
                className={styles.globalSearch}
                placeholder="Search entire catalog..."
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value)
                  if (e.target.value) setSelectedFolderId(null)
                }}
              />
            </div>
            <button
              className={styles.addBtn}
              onClick={() => setModalView('CHOICE')}
              disabled={!!globalSearch}
            >
              <FiPlusSquare size={18} /> ADD NEW
            </button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.classicTable}>
            <thead>
              <tr>
                <th>TYPE & NAME</th>
                <th>INFO</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {/* Folders */}
              {displayedFolders.map((folder) => (
                <tr key={`cat-${folder.Id}`}>
                  <td style={{ fontWeight: 700 }}>
                    <span className={styles.rowIcon}>
                      <FiFolder size={18} />
                    </span>{' '}
                    {folder.Name}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>Folder</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={`${styles.actionBtn} ${styles.btnOpen}`}
                      onClick={() => setSelectedFolderId(folder.Id)}
                      title="Open Folder"
                    >
                      OPEN
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.btnEdit}`}
                      onClick={() => openEditFolder(folder)}
                      title="Edit Folder"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.btnDel}`}
                      onClick={() => handleDeleteFolder(folder.Id)}
                      title="Delete Folder"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Products */}
              {displayedProducts.map((prod) => (
                <tr key={`prod-${prod.Id}`}>
                  <td style={{ fontWeight: 600 }}>
                    <span className={styles.rowIcon}>
                      <FiBox size={18} />
                    </span>{' '}
                    {prod.Name}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {globalSearch && (
                      <span
                        style={{ color: 'var(--primary)', fontWeight: 700, marginRight: '8px' }}
                      >
                        [{getCatName(prod.CategoryId)}]
                      </span>
                    )}
                    SKU: {prod.Barcode} | {prod.Unit}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={`${styles.actionBtn} ${styles.btnView}`}
                      onClick={() => handleViewProduct(prod)}
                      title="View Product Batches"
                    >
                      <FiEye size={16} />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.btnEdit}`}
                      onClick={() => openEditProduct(prod)}
                      title="Edit Product"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.btnDel}`}
                      onClick={() => handleDeleteProduct(prod.Id)}
                      title="Delete Product"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {displayedFolders.length === 0 && displayedProducts.length === 0 && (
                <tr>
                  <td colSpan={3} className={styles.emptyMsg}>
                    {globalSearch
                      ? 'No products match your search.'
                      : "This folder is empty. Click '+ ADD NEW' to create something."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATION MACHINE */}
      {/* ========================================================================= */}
      {modalView !== 'CLOSED' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2
                style={{
                  margin: 0,
                  fontSize: '18px',
                  color: 'var(--text-main)',
                  textTransform: 'uppercase'
                }}
              >
                {modalView === 'CHOICE' && 'What do you want to create?'}
                {modalView === 'FOLDER' && 'Create Sub-Folder'}
                {modalView === 'PRODUCT' && 'Create Product'}
              </h2>
              <button
                className={styles.iconCloseBtn}
                onClick={() => {
                  setModalView('CLOSED')
                  setNewItemName('')
                }}
              >
                <FiX />
              </button>
            </div>

            {modalView === 'CHOICE' && (
              <div className={styles.modalBody}>
                <div className={styles.choiceGrid}>
                  <button className={styles.choiceBtn} onClick={() => setModalView('FOLDER')}>
                    <span className={styles.choiceIcon}>
                      <FiFolderPlus size={32} />
                    </span>
                    <span className={styles.choiceTitle}>
                      New Folder
                      <br />
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 'normal',
                          color: 'var(--text-muted)'
                        }}
                      >
                        (Category)
                      </span>
                    </span>
                  </button>
                  <button
                    className={styles.choiceBtn}
                    onClick={() => {
                      if (!selectedFolderId) {
                        Swal.fire(
                          'Action Required',
                          'You must OPEN a folder before creating a product!',
                          'warning'
                        )
                        return
                      }
                      setModalView('PRODUCT')
                    }}
                  >
                    <span className={styles.choiceIcon}>
                      <FiBox size={32} />
                    </span>
                    <span className={styles.choiceTitle}>
                      New Product
                      <br />
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 'normal',
                          color: 'var(--text-muted)'
                        }}
                      >
                        (Item)
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            )}

            {modalView === 'FOLDER' && (
              <form onSubmit={handleSaveFolder}>
                <div className={styles.modalBody}>
                  <div className={styles.formGroup}>
                    <label>Folder Name</label>
                    <input
                      type="text"
                      className={styles.classicInput}
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      required
                      placeholder="e.g. Hand Tools..."
                      autoFocus
                    />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Will be created inside:{' '}
                    <b style={{ color: 'var(--primary)' }}>{currentFolderName}</b>
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setModalView('CHOICE')}
                  >
                    BACK
                  </button>
                  <button type="submit" className={styles.saveBtn}>
                    SAVE FOLDER
                  </button>
                </div>
              </form>
            )}

            {modalView === 'PRODUCT' && (
              <form onSubmit={handleSaveProduct}>
                <div className={styles.modalBody}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Pricing is handled in GRN. SKU is auto-generated.
                  </p>
                  <div className={styles.formGroup}>
                    <label>Product Name</label>
                    <input
                      type="text"
                      className={styles.classicInput}
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      required
                      placeholder="e.g. Stanley Hammer 12oz"
                      autoFocus
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Base Unit</label>
                    <select
                      className={styles.classicSelect}
                      value={prodUnit}
                      onChange={(e) => setProdUnit(e.target.value)}
                    >
                      <optgroup label="General Items">
                        <option value="Pcs">Pieces (Pcs)</option>
                        <option value="Box">Box</option>
                        <option value="Set">Set</option>
                        <option value="Pack">Pack</option>
                        <option value="Pair">Pair</option>
                        <option value="Dozen">Dozen</option>
                        <option value="Roll">Roll</option>
                      </optgroup>
                      <optgroup label="Weight">
                        <option value="Kg">Kilograms (Kg)</option>
                        <option value="g">Grams (g)</option>
                        <option value="mg">Milligrams (mg)</option>
                      </optgroup>
                      <optgroup label="Length & Area">
                        <option value="m">Meters (m)</option>
                        <option value="cm">Centimeters (cm)</option>
                        <option value="mm">Millimeters (mm)</option>
                        <option value="Inches">Inches (in)</option>
                        <option value="Feet">Feet (ft)</option>
                        <option value="Sq.m">Square Meters (Sq.m)</option>
                        <option value="Sq.ft">Square Feet (Sq.ft)</option>
                      </optgroup>
                      <optgroup label="Volume">
                        <option value="L">Liters (L)</option>
                        <option value="ml">Milliliters (ml)</option>
                        <option value="Gal">Gallons (Gal)</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setModalView('CHOICE')}
                  >
                    BACK
                  </button>
                  <button type="submit" className={styles.saveBtn}>
                    SAVE PRODUCT
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT FOLDER */}
      {/* ========================================================================= */}
      {editingFolder !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2
                style={{
                  margin: 0,
                  fontSize: '18px',
                  color: 'var(--text-main)',
                  textTransform: 'uppercase'
                }}
              >
                Edit Folder
              </h2>
              <button className={styles.iconCloseBtn} onClick={() => setEditingFolder(null)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleUpdateFolder}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Folder Name</label>
                  <input
                    type="text"
                    className={styles.classicInput}
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setEditingFolder(null)}
                >
                  CANCEL
                </button>
                <button type="submit" className={styles.saveBtn}>
                  UPDATE FOLDER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT PRODUCT */}
      {/* ========================================================================= */}
      {editingProduct !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h2
                style={{
                  margin: 0,
                  fontSize: '18px',
                  color: 'var(--text-main)',
                  textTransform: 'uppercase'
                }}
              >
                Edit Product Info
              </h2>
              <button className={styles.iconCloseBtn} onClick={() => setEditingProduct(null)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleUpdateProduct}>
              <div className={styles.modalBody}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  SKU: <b style={{ color: 'var(--primary)' }}>{editingProduct.Barcode}</b> (Cannot
                  be changed)
                </p>
                <div className={styles.formGroup}>
                  <label>Product Name</label>
                  <input
                    type="text"
                    className={styles.classicInput}
                    value={editProdName}
                    onChange={(e) => setEditProdName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Base Unit</label>
                  <select
                    className={styles.classicSelect}
                    value={editProdUnit}
                    onChange={(e) => setEditProdUnit(e.target.value)}
                  >
                    <optgroup label="General Items">
                      <option value="Pcs">Pieces (Pcs)</option>
                      <option value="Box">Box</option>
                      <option value="Set">Set</option>
                      <option value="Pack">Pack</option>
                      <option value="Pair">Pair</option>
                      <option value="Dozen">Dozen</option>
                      <option value="Roll">Roll</option>
                    </optgroup>
                    <optgroup label="Weight">
                      <option value="Kg">Kilograms (Kg)</option>
                      <option value="g">Grams (g)</option>
                      <option value="mg">Milligrams (mg)</option>
                    </optgroup>
                    <optgroup label="Length & Area">
                      <option value="m">Meters (m)</option>
                      <option value="cm">Centimeters (cm)</option>
                      <option value="mm">Millimeters (mm)</option>
                      <option value="Inches">Inches (in)</option>
                      <option value="Feet">Feet (ft)</option>
                      <option value="Sq.m">Square Meters (Sq.m)</option>
                      <option value="Sq.ft">Square Feet (Sq.ft)</option>
                    </optgroup>
                    <optgroup label="Volume">
                      <option value="L">Liters (L)</option>
                      <option value="ml">Milliliters (ml)</option>
                      <option value="Gal">Gallons (Gal)</option>
                    </optgroup>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Move to Folder</label>
                  <select
                    className={styles.classicSelect}
                    value={editProdFolder}
                    onChange={(e) => setEditProdFolder(Number(e.target.value))}
                  >
                    {categories.map((c) => (
                      <option key={c.Id} value={c.Id}>
                        {c.Name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setEditingProduct(null)}
                >
                  CANCEL
                </button>
                <button type="submit" className={styles.saveBtn}>
                  UPDATE PRODUCT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: THE BIG VIEW MODAL */}
      {/* ========================================================================= */}
      {viewingProduct !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBoxView}>
            <div className={styles.modalHeader}>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '24px',
                    color: 'var(--text-main)',
                    textTransform: 'uppercase'
                  }}
                >
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
                  background: '#f8fafc',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  border: '2px dashed var(--border-color)'
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
                        <td colSpan={8} className={styles.emptyMsg}>
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

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setViewingProduct(null)}>
                CLOSE WINDOW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
