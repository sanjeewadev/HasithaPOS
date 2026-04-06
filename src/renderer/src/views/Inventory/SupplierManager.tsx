// src/renderer/src/views/Inventory/SupplierManager.tsx
import { useState, useEffect, useMemo } from 'react'
import Swal from 'sweetalert2'
import { FiSearch, FiInfo, FiEdit2, FiTrash2, FiArrowLeft, FiPackage, FiX } from 'react-icons/fi'
import { Supplier } from '../../types/models'
import styles from './SupplierManager.module.css'

export default function SupplierManager() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Form State
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // Modal States
  const [supplierProfile, setSupplierProfile] = useState<Supplier | null>(null)
  const [supplierBills, setSupplierBills] = useState<any[]>([])
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
    const safeName = name.trim()
    const safePhone = phone.trim()

    if (!safeName) {
      Swal.fire('Error', 'Company name is required.', 'error')
      return
    }

    try {
      if (editingSupplierId) {
        // @ts-ignore
        await window.api.updateSupplier({ Id: editingSupplierId, Name: safeName, Phone: safePhone })
        Swal.fire('Success', 'Supplier updated successfully.', 'success')
      } else {
        // @ts-ignore
        await window.api.addSupplier({ Name: safeName, Phone: safePhone })
        Swal.fire('Success', 'New supplier added successfully.', 'success')
      }
      handleClear()
      loadData()
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        Swal.fire('Duplicate Entry', 'A supplier with this company name already exists.', 'warning')
      } else {
        Swal.fire('Error', 'Error saving supplier: ' + (err.message || 'Unknown error'), 'error')
      }
    }
  }

  const handleDelete = async (id: number) => {
    const confirmResult = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to delete this supplier?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it'
    })

    if (confirmResult.isConfirmed) {
      try {
        // @ts-ignore
        await window.api.deleteSupplier(id)
        loadData()
        Swal.fire('Deleted', 'Supplier deleted successfully.', 'success')
      } catch (err: any) {
        if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
          Swal.fire(
            'Action Denied',
            'This supplier has invoice history and cannot be deleted to protect your financial records.',
            'error'
          )
        } else {
          Swal.fire(
            'Error',
            'Error deleting supplier: ' + (err.message || 'Unknown error'),
            'error'
          )
        }
      }
    }
  }

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

  const displayedSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return suppliers.filter(
      (s) => s.Name.toLowerCase().includes(q) || (s.Phone && s.Phone.toLowerCase().includes(q))
    )
  }, [suppliers, searchQuery])

  return (
    <div className={styles.container}>
      {/* LEFT PANEL: MAIN SUPPLIER TABLE */}
      <div className={styles.panel}>
        <div className={styles.headerRow}>
          <h2 className={styles.pageTitle}>SUPPLIER DATABASE</h2>
          <div className={styles.searchWrapper}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by Name or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
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
                  <td colSpan={3} className={styles.emptyMsg}>
                    No suppliers found in the system.
                  </td>
                </tr>
              ) : (
                displayedSuppliers.map((sup) => (
                  <tr key={sup.Id} className={editingSupplierId === sup.Id ? styles.rowActive : ''}>
                    <td style={{ fontWeight: 800 }}>{sup.Name}</td>
                    <td
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '15px',
                        color: 'var(--text-muted)'
                      }}
                    >
                      {sup.Phone || '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className={styles.btnInfo}
                        onClick={() => handleOpenProfile(sup)}
                        title="View Profile"
                      >
                        <FiInfo size={16} />
                      </button>
                      <button
                        className={styles.btnEdit}
                        onClick={() => handleEditClick(sup)}
                        title="Edit Supplier"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        className={styles.btnDel}
                        onClick={() => handleDelete(sup.Id)}
                        title="Delete Supplier"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT PANEL: SMART FORM */}
      <div className={styles.panel}>
        <h2 className={styles.formTitle}>
          {editingSupplierId ? 'MODIFY SUPPLIER' : 'REGISTER SUPPLIER'}
        </h2>

        <form onSubmit={handleSave} className={styles.supplierForm}>
          <div className={styles.formGroup}>
            <label>Company / Supplier Name *</label>
            <input
              type="text"
              className={styles.classicInput}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Hardware Tools"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Phone Number (Optional)</label>
            <input
              type="text"
              className={styles.classicInput}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="011-XXXXXXX"
            />
          </div>

          <div className={styles.btnGroup}>
            <button type="button" className={styles.clearBtn} onClick={handleClear}>
              {editingSupplierId ? 'CANCEL' : 'CLEAR'}
            </button>
            <button type="submit" className={styles.primaryBtn}>
              {editingSupplierId ? 'UPDATE SUPPLIER' : 'SAVE SUPPLIER'}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL 1: SUPPLIER PROFILE */}
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
              <button className={styles.closeIcon} onClick={() => setSupplierProfile(null)}>
                <FiX />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalStatsBanner}>
                <FiPackage size={24} />
                <span>
                  Total Invoices Processed: <strong>{supplierBills.length}</strong>
                </span>
              </div>
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
                        <td colSpan={4} className={styles.emptyMsg}>
                          No purchase history found.
                        </td>
                      </tr>
                    ) : (
                      supplierBills.map((bill) => (
                        <tr key={bill.Id}>
                          <td style={{ fontWeight: 800 }}>{bill.BillNumber}</td>
                          <td>{new Date(bill.Date).toLocaleDateString()}</td>
                          <td style={{ fontWeight: 800, color: 'var(--success)' }}>
                            Rs {bill.TotalAmount.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className={styles.btnInfo}
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
          </div>
        </div>
      )}

      {/* MODAL 2: INVOICE BREAKDOWN */}
      {viewingBillDetails && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalBox} ${styles.modalBoxMassive}`}>
            <div className={styles.modalHeader}>
              <button className={styles.backBtn} onClick={() => setViewingBillDetails(null)}>
                <FiArrowLeft /> BACK
              </button>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '20px' }}>
                  Invoice: {viewingBillDetails.BillNumber}
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {new Date(viewingBillDetails.Date).toLocaleString()}
                </span>
              </div>
              <div className={styles.modalCostBadge}>
                Rs {viewingBillDetails.TotalAmount.toFixed(2)}
              </div>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.tableWrapper}>
                <table className={styles.classicTable}>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>PRODUCT</th>
                      <th>QTY</th>
                      <th>UNIT COST</th>
                      <th>SELL PRICE</th>
                      <th style={{ textAlign: 'right' }}>LINE TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'monospace' }}>{item.Barcode || '-'}</td>
                        <td style={{ fontWeight: 800 }}>{item.ProductName}</td>
                        <td style={{ fontWeight: 900 }}>
                          {item.InitialQuantity} {item.Unit}
                        </td>
                        <td>Rs {item.CostPrice.toFixed(2)}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 800 }}>
                          Rs {item.SellingPrice.toFixed(2)}
                        </td>
                        <td style={{ fontWeight: 900, textAlign: 'right' }}>
                          Rs {(item.InitialQuantity * item.CostPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
