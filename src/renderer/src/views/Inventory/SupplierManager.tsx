// src/renderer/src/views/Inventory/SupplierManager.tsx
import React, { useState, useEffect } from 'react'
import { Supplier } from '../../types/models'
import styles from './SupplierManager.module.css'

export default function SupplierManager() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')

  const loadSuppliers = async () => {
    try {
      // @ts-ignore
      const data = await window.api.getSuppliers()
      setSuppliers(data)
    } catch (error) {
      console.error('Failed to load suppliers', error)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  const handleEdit = (s: Supplier) => {
    setEditingId(s.Id)
    setName(s.Name)
    setPhone(s.Phone || '')
    setNote(s.Note || '')
  }

  const handleClear = () => {
    setEditingId(null)
    setName('')
    setPhone('')
    setNote('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('Company / Supplier Name is required!')
      return
    }

    const payload = {
      Id: editingId,
      Name: name.trim(),
      Phone: phone.trim(),
      Note: note.trim()
    }

    try {
      if (editingId) {
        // @ts-ignore
        await window.api.updateSupplier(payload)
      } else {
        // Duplicate Check (Done on frontend for speed, SQLite also enforces it)
        const isDuplicate = suppliers.some(
          (s) => s.Name.toLowerCase() === name.trim().toLowerCase()
        )
        if (isDuplicate) {
          alert(`A supplier named '${name}' already exists.`)
          return
        }
        // @ts-ignore
        await window.api.addSupplier(payload)
      }

      handleClear()
      loadSuppliers()
    } catch (err: any) {
      alert(`Error saving supplier: ${err.message}`)
    }
  }

  const handleDelete = async (id: number, suppName: string) => {
    if (
      window.confirm(
        `Are you sure you want to permanently delete '${suppName}'?\n\nWarning: This will fail if this supplier is linked to past purchase invoices.`
      )
    ) {
      try {
        // @ts-ignore
        await window.api.deleteSupplier(id)
        loadSuppliers()
        if (editingId === id) handleClear()
      } catch (err: any) {
        alert(
          `Action Blocked: Cannot delete supplier.\n\nThey likely have linked GRN/Purchase history in the database.`
        )
      }
    }
  }

  const handleViewBills = (suppName: string) => {
    // We will wire this up when we build the GRN/Purchase History module!
    alert(
      `Viewing past bills for ${suppName} will be available once the Stock In (GRN) module is built next!`
    )
  }

  // Filter logic for the search bar
  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.Name.toLowerCase().includes(search.toLowerCase()) ||
      (s.Phone && s.Phone.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className={styles.container}>
      {/* LEFT PANEL: Supplier DataGrid */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span style={{ fontWeight: 'bold' }}>SUPPLIER DATABASE</span>
          <input
            type="text"
            placeholder="Search by Name or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.classicInput}
            style={{ width: '250px', padding: '8px' }}
          />
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.classicTable}>
            <thead>
              <tr>
                <th>COMPANY NAME</th>
                <th>PHONE NUMBER</th>
                <th>NOTES</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}
                  >
                    No suppliers found. Add a new vendor on the right.
                  </td>
                </tr>
              )}
              {filteredSuppliers.map((s) => (
                <tr key={s.Id} onClick={() => handleEdit(s)}>
                  <td style={{ fontWeight: 'bold', color: '#1E293B' }}>{s.Name}</td>
                  <td>{s.Phone || '-'}</td>
                  <td style={{ color: '#64748B', fontStyle: 'italic' }}>{s.Note || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewBills(s.Name)
                      }}
                    >
                      👁 BILLS
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(s.Id, s.Name)
                      }}
                    >
                      DEL
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT PANEL: Add/Edit Form */}
      <div className={styles.panel}>
        <h2 className={styles.panelHeader} style={{ fontWeight: 'bold', borderBottom: 'none' }}>
          {editingId ? 'EDIT SUPPLIER' : 'ADD NEW SUPPLIER'}
        </h2>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className={styles.formGroup}>
            <label>COMPANY / SUPPLIER NAME *</label>
            <input
              type="text"
              className={styles.classicInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>PHONE NUMBER (Optional)</label>
            <input
              type="text"
              className={styles.classicInput}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className={styles.formGroup} style={{ flex: 1 }}>
            <label>EXTRA NOTES / DETAILS</label>
            <textarea
              className={styles.classicInput}
              style={{ height: '120px', resize: 'none' }}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Address, contact person, delivery days..."
            />
          </div>

          <div className={styles.btnGroup}>
            <button type="button" className={styles.clearBtn} onClick={handleClear}>
              CLEAR
            </button>
            <button type="submit" className={styles.primaryBtn}>
              {editingId ? 'SAVE CHANGES' : 'SAVE SUPPLIER'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
