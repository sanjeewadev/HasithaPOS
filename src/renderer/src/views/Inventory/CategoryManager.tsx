// src/renderer/src/views/Inventory/CategoryManager.tsx
import React, { useState, useEffect } from 'react'
import { Category } from '../../types/models'
import styles from './CategoryManager.module.css'

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([])

  // Form State
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState<number>(0)

  const loadCategories = async () => {
    try {
      // @ts-ignore
      const data = await window.api.getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Failed to load categories', error)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('Category name is required.')
      return
    }

    try {
      const payload = {
        Name: name.trim(),
        ParentId: parentId === 0 ? null : parentId
      }

      // @ts-ignore
      await window.api.addCategory(payload)

      setName('')
      setParentId(0)
      loadCategories()
    } catch (err: any) {
      alert(`Error saving category: ${err.message}`)
    }
  }

  const handleDelete = async (id: number, catName: string) => {
    // Check if it has subcategories
    const hasChildren = categories.some((c) => c.ParentId === id)
    if (hasChildren) {
      alert(`Cannot delete '${catName}' because it contains sub-categories. Delete them first.`)
      return
    }

    if (window.confirm(`Are you sure you want to permanently delete '${catName}'?`)) {
      try {
        // @ts-ignore
        await window.api.deleteCategory(id)
        loadCategories()
      } catch (err: any) {
        alert(`Error deleting category: ${err.message}\n\n(It might still contain products!)`)
      }
    }
  }

  // Group categories for the table (Main categories, followed by their children)
  const mainCategories = categories.filter((c) => c.ParentId === null)

  return (
    <div className={styles.container}>
      {/* LEFT PANEL: Hierarchy Table */}
      <div className={styles.panel}>
        <h2 className={styles.panelHeader}>CATEGORY HIERARCHY</h2>

        <div className={styles.tableWrapper}>
          <table className={styles.classicTable}>
            <thead>
              <tr>
                <th>FOLDER NAME</th>
                <th>TYPE</th>
                <th style={{ textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {mainCategories.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    style={{ textAlign: 'center', padding: '20px', color: '#64748B' }}
                  >
                    No categories found. Create your first folder on the right.
                  </td>
                </tr>
              )}

              {mainCategories.map((mainCat) => (
                <React.Fragment key={mainCat.Id}>
                  {/* The Main Category Row */}
                  <tr className={styles.mainCategoryRow}>
                    <td>📁 {mainCat.Name}</td>
                    <td>Main Folder</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(mainCat.Id, mainCat.Name)}
                      >
                        DEL
                      </button>
                    </td>
                  </tr>

                  {/* The Sub-Categories under this Main Category */}
                  {categories
                    .filter((c) => c.ParentId === mainCat.Id)
                    .map((subCat) => (
                      <tr key={subCat.Id} className={styles.subCategoryRow}>
                        <td>↳ {subCat.Name}</td>
                        <td>Sub-Folder</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(subCat.Id, subCat.Name)}
                          >
                            DEL
                          </button>
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT PANEL: Add Category Form */}
      <div className={styles.panel}>
        <h2 className={styles.panelHeader}>ADD NEW FOLDER</h2>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className={styles.formGroup}>
            <label>FOLDER NAME *</label>
            <input
              type="text"
              className={styles.classicInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hand Tools, Plumbing, Paints..."
              autoFocus
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>PUT INSIDE (Optional)</label>
            <select
              className={styles.classicSelect}
              value={parentId}
              onChange={(e) => setParentId(Number(e.target.value))}
            >
              <option value={0}>-- Make this a Main Folder --</option>
              {mainCategories.map((c) => (
                <option key={c.Id} value={c.Id}>
                  Inside: {c.Name}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '11px', color: '#64748B', marginTop: '5px' }}>
              Select a parent to make this a Sub-Category.
            </p>
          </div>

          <div style={{ flex: 1 }}></div>

          <button type="submit" className={styles.primaryBtn}>
            SAVE FOLDER
          </button>
        </form>
      </div>
    </div>
  )
}
