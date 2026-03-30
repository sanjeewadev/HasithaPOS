// src/renderer/src/views/Inventory/SupplierManager.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { Supplier } from '../../types/models'
import styles from './SupplierManager.module.css'

export default function SupplierManager() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // 🚀 SMART FORM STATE (Handles both Add and Edit)
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // --- MODAL STATES ---
  // 🚀 Unified Profile Modal
  const [supplierProfile, setSupplierProfile] = useState<Supplier | null>(null)
  const [supplierBills, setSupplierBills] = useState<any[]>([])

  // Drill-down Bill Details Modal
  const [viewingBillDetails, setViewingBillDetails] = useState<any | null>(null)
  const [billItems, setBillItems] = useState<any[]>([])

  const loadData = async () => {
    try {
      // @ts-ignore
      setSuppliers(await window.api.getSuppliers())
    } catch (err) {
      console.error('Failed to load suppliers', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // --- SMART FORM ACTIONS ---
  const handleClear = () => {
    setEditingSupplierId(null)
    setName('')
    setPhone('')
  }

  const handleEditClick = (sup: Supplier) => {
    setEditingSupplierId(sup.Id)
    setName(sup.Name)
    setPhone(sup.Phone || '')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return alert('Company name is required!')

    try {
      if (editingSupplierId) {
        // 🚀 NEW: Update Logic
        // @ts-ignore
        await window.api.updateSupplier({ Id: editingSupplierId, Name: name, Phone: phone })
        alert('Supplier updated successfully!')
      } else {
        // Existing: Add Logic
        // @ts-ignore
        await window.api.addSupplier({ Name: name, Phone: phone })
      }
      handleClear()
      loadData()
    } catch (err) {
      alert('Error saving supplier.')
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        // @ts-ignore
        await window.api.deleteSupplier(id)
        loadData()
      } catch (err) {
        alert('Error deleting supplier.')
      }
    }
  }

  // --- UNIFIED PROFILE MODAL ACTIONS ---
  const handleOpenProfile = async (sup: Supplier) => {
    setSupplierProfile(sup)
    try {
      // @ts-ignore
      const bills = await window.api.getSupplierInvoices(sup.Id)
      setSupplierBills(bills || [])
    } catch (err) {
      console.error(err)
      setSupplierBills([])
    }
  }

  const handleOpenBillDetails = async (bill: any) => {
    setViewingBillDetails(bill)
    try {
      // @ts-ignore
      const items = await window.api.getInvoiceItems(bill.Id)
      setBillItems(items || [])
    } catch (err) {
      console.error(err)
      setBillItems([])
    }
  }

  // --- FILTERING ---
  const displayedSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return suppliers.filter(
      (s) => s.Name.toLowerCase().includes(q) || (s.Phone && s.Phone.toLowerCase().includes(q))
    )
  }, [suppliers, searchQuery])

  return (
    <div className={styles.container}>
      {/* --- LEFT PANEL: TABLE --- */}
      <div className={styles.leftPanel}>
        <div className={styles.headerRow}>
          <h2 className={styles.panelTitle}>SUPPLIER DATABASE</h2>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by Name or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.classicTable}>
            <thead>
              <tr>
                <th>COMPANY NAME</th>
                <th>PHONE NUMBER</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayedSuppliers.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}
                  >
                    No suppliers found. Add a new vendor on the right.
                  </td>
                </tr>
              ) : (
                displayedSuppliers.map((sup) => (
                  <tr key={sup.Id}>
                    <td style={{ fontWeight: 700 }}>{sup.Name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '15px' }}>
                      {sup.Phone || '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className={`${styles.actionBtn} ${styles.btnInfo}`}
                        onClick={() => handleOpenProfile(sup)}
                      >
                        INFO
                      </button>
                      {/* 🚀 NEW EDIT BUTTON */}
                      <button
                        className={`${styles.actionBtn} ${styles.btnEdit}`}
                        onClick={() => handleEditClick(sup)}
                      >
                        EDIT
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.btnDel}`}
                        onClick={() => handleDelete(sup.Id)}
                      >
                        DEL
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- RIGHT PANEL: SMART FORM --- */}
      <div className={styles.rightPanel}>
        <form
          onSubmit={handleSave}
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          <div className={styles.formHeader}>
            <h2
              className={styles.panelTitle}
              style={{ color: editingSupplierId ? 'var(--warning)' : 'var(--text-main)' }}
            >
              {editingSupplierId ? 'EDIT SUPPLIER INFO' : 'ADD NEW SUPPLIER'}
            </h2>
          </div>
          <div className={styles.formBody}>
            <div className={styles.formGroup}>
              <label>Company / Supplier Name *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Phone Number (Optional)</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className={styles.formFooter}>
            <button type="button" className={styles.clearBtn} onClick={handleClear}>
              {editingSupplierId ? 'CANCEL' : 'CLEAR'}
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              style={{ background: editingSupplierId ? 'var(--warning)' : 'var(--success)' }}
            >
              {editingSupplierId ? 'UPDATE SUPPLIER' : 'SAVE SUPPLIER'}
            </button>
          </div>
        </form>
      </div>

      {/* ========================================= */}
      {/* MODAL 1: MASSIVE UNIFIED PROFILE          */}
      {/* ========================================= */}
      {supplierProfile && !viewingBillDetails && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalBox} ${styles.modalBoxMassive}`}>
            <div className={styles.modalHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--text-main)' }}>
                  {supplierProfile.Name}
                </h2>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    fontWeight: 600
                  }}
                >
                  Phone: {supplierProfile.Phone || 'N/A'} | System ID: #{supplierProfile.Id}
                </div>
              </div>
              <div
                style={{
                  textAlign: 'right',
                  background: 'var(--bg-surface)',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
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
                  Total GRN Invoices
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>
                  {supplierBills.length}
                </div>
              </div>
            </div>
            <div className={styles.modalBody}>
              <h3
                style={{
                  fontSize: '15px',
                  marginBottom: '15px',
                  color: 'var(--text-main)',
                  textTransform: 'uppercase',
                  fontWeight: 800
                }}
              >
                Purchase History (GRN Bills)
              </h3>
              <div className={styles.tableWrapper}>
                <table className={styles.classicTable}>
                  <thead>
                    <tr>
                      <th>INVOICE NO</th>
                      <th>DATE</th>
                      <th>TOTAL AMOUNT</th>
                      <th style={{ textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierBills.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            textAlign: 'center',
                            padding: '40px',
                            color: 'var(--text-muted)',
                            fontWeight: 600
                          }}
                        >
                          No bills found for this supplier yet.
                        </td>
                      </tr>
                    ) : (
                      supplierBills.map((bill) => (
                        <tr key={bill.Id}>
                          <td style={{ fontWeight: 800 }}>{bill.BillNumber}</td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            {new Date(bill.Date).toLocaleString()}
                          </td>
                          <td style={{ fontWeight: 800, color: 'var(--success)' }}>
                            Rs {bill.TotalAmount.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className={`${styles.actionBtn} ${styles.btnInfo}`}
                              onClick={() => handleOpenBillDetails(bill)}
                            >
                              VIEW ITEMS
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.closeBtn} onClick={() => setSupplierProfile(null)}>
                CLOSE PROFILE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 2: WIDER SPECIFIC BILL DETAILS      */}
      {/* ========================================= */}
      {viewingBillDetails && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalBox} ${styles.modalBoxLarge}`}>
            <div className={styles.modalHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)' }}>
                  Invoice: {viewingBillDetails.BillNumber}
                </h2>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    fontWeight: 600
                  }}
                >
                  Date: {new Date(viewingBillDetails.Date).toLocaleString()}
                </p>
              </div>
              <div
                style={{
                  textAlign: 'right',
                  background: '#f0fdf4',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #bbf7d0'
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '11px',
                    color: '#16a34a',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}
                >
                  Invoice Total
                </p>
                <h2 style={{ margin: 0, fontSize: '22px', color: '#15803d', fontWeight: 900 }}>
                  Rs {viewingBillDetails.TotalAmount.toFixed(2)}
                </h2>
              </div>
            </div>
            <div className={styles.modalBody}>
              <h3
                style={{
                  fontSize: '14px',
                  marginBottom: '15px',
                  textTransform: 'uppercase',
                  fontWeight: 800
                }}
              >
                Items Received
              </h3>
              <div className={styles.tableWrapper}>
                <table className={styles.classicTable}>
                  <thead>
                    <tr>
                      <th>PRODUCT NAME</th>
                      <th>QTY</th>
                      <th>UNIT COST</th>
                      <th>LINE TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '30px' }}>
                          Loading items...
                        </td>
                      </tr>
                    ) : (
                      billItems.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700 }}>{item.ProductName}</td>
                          <td style={{ fontWeight: 800 }}>{item.InitialQuantity}</td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            Rs {item.CostPrice.toFixed(2)}
                          </td>
                          <td style={{ fontWeight: 800, color: 'var(--success)' }}>
                            Rs {(item.InitialQuantity * item.CostPrice).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.closeBtn} onClick={() => setViewingBillDetails(null)}>
                BACK TO PROFILE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
