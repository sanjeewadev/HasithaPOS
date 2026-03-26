// src/renderer/src/views/Inventory/ProductCatalog.tsx
import { useState, useEffect } from 'react'
import { Product, Category } from '../../types/models'
import styles from './ProductCatalog.module.css'

export default function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [barcode, setBarcode] = useState('')
  const [description, setDescription] = useState('')
  const [unit, setUnit] = useState('Pcs')
  const [categoryId, setCategoryId] = useState<number>(0)
  const [buyingPrice, setBuyingPrice] = useState<number | string>('')
  const [sellingPrice, setSellingPrice] = useState<number | string>('')
  const [discountLimit, setDiscountLimit] = useState<number | string>('')

  const loadData = async () => {
    try {
      // @ts-ignore
      const prodData = await window.api.getProducts()
      // @ts-ignore
      const catData = await window.api.getCategories()
      setProducts(prodData)
      setCategories(catData)
    } catch (error) {
      console.error('Failed to load catalog', error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEdit = (p: Product) => {
    setEditingId(p.Id)
    setName(p.Name)
    setBarcode(p.Barcode)
    setDescription(p.Description || '')
    setUnit(p.Unit || 'Pcs')
    setCategoryId(p.CategoryId)
    setBuyingPrice(p.BuyingPrice)
    setSellingPrice(p.SellingPrice)
    setDiscountLimit(p.DiscountLimit)
  }

  const handleClear = () => {
    setEditingId(null)
    setName('')
    setBarcode('')
    setDescription('')
    setUnit('Pcs')
    setCategoryId(0)
    setBuyingPrice('')
    setSellingPrice('')
    setDiscountLimit('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !barcode || categoryId === 0) {
      alert('Name, Barcode, and Category are required!')
      return
    }

    const payload = {
      Id: editingId,
      Name: name,
      Barcode: barcode,
      Description: description,
      Unit: unit,
      CategoryId: Number(categoryId),
      BuyingPrice: Number(buyingPrice) || 0,
      SellingPrice: Number(sellingPrice) || 0,
      DiscountLimit: Number(discountLimit) || 0,
      IsActive: true
    }

    try {
      if (editingId) {
        // @ts-ignore
        await window.api.updateProduct(payload)
      } else {
        // @ts-ignore
        await window.api.addProduct(payload)
      }
      handleClear()
      loadData()
    } catch (err: any) {
      alert(`Error saving product: ${err.message}`)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        // @ts-ignore
        await window.api.deleteProduct(id)
        loadData()
        if (editingId === id) handleClear()
      } catch (err: any) {
        alert(`Error deleting product: ${err.message}`)
      }
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.Name.toLowerCase().includes(search.toLowerCase()) ||
      p.Barcode.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={styles.container}>
      {/* LEFT PANEL: Data Table */}
      <div className={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className={styles.panelHeader}>PRODUCT CATALOG</h2>
          <input
            type="text"
            placeholder="Search by Name or Barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.classicInput}
            style={{ width: '250px', marginBottom: '15px' }}
          />
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.classicTable}>
            <thead>
              <tr>
                <th>CODE</th>
                <th>NAME</th>
                <th>CATEGORY</th>
                <th>PRICE</th>
                <th>STOCK</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.Id} onClick={() => handleEdit(p)}>
                  <td style={{ fontWeight: 'bold' }}>{p.Barcode}</td>
                  <td>{p.Name}</td>
                  <td>{p.CategoryName || 'Uncategorized'}</td>
                  <td style={{ color: '#059669', fontWeight: 'bold' }}>
                    Rs {p.SellingPrice.toFixed(2)}
                  </td>
                  <td>
                    {p.Quantity} {p.Unit}
                  </td>
                  <td>
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(p.Id, p.Name)
                      }}
                    >
                      DELETE
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: 'center', padding: '20px', color: '#64748B' }}
                  >
                    No products found. Add one on the right.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT PANEL: Entry Form */}
      <div className={styles.panel}>
        <h2 className={styles.panelHeader}>{editingId ? 'EDIT PRODUCT' : 'ADD NEW PRODUCT'}</h2>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className={styles.formGroup}>
            <label>PRODUCT NAME *</label>
            <input
              type="text"
              className={styles.classicInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>BARCODE / SKU *</label>
            <input
              type="text"
              className={styles.classicInput}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>CATEGORY *</label>
            <select
              className={styles.classicSelect}
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              required
            >
              <option value={0}>-- Select Category --</option>
              {categories.map((c) => (
                <option key={c.Id} value={c.Id}>
                  {c.Name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className={styles.formGroup}>
              <label>BUYING PRICE</label>
              <input
                type="number"
                step="0.01"
                className={styles.classicInput}
                value={buyingPrice}
                onChange={(e) => setBuyingPrice(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>SELLING PRICE</label>
              <input
                type="number"
                step="0.01"
                className={styles.classicInput}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className={styles.formGroup}>
              <label>MAX DISCOUNT %</label>
              <input
                type="number"
                step="0.1"
                className={styles.classicInput}
                value={discountLimit}
                onChange={(e) => setDiscountLimit(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>UNIT (Pcs, Kg)</label>
              <input
                type="text"
                className={styles.classicInput}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup} style={{ flex: 1 }}>
            <label>NOTES / DESCRIPTION</label>
            <textarea
              className={styles.classicInput}
              style={{ height: '80px', resize: 'none' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={styles.btnGroup}>
            <button type="button" className={styles.clearBtn} onClick={handleClear}>
              CLEAR
            </button>
            <button type="submit" className={styles.primaryBtn}>
              {editingId ? 'SAVE CHANGES' : 'SAVE PRODUCT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
