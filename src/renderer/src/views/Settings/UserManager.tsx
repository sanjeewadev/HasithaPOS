// src/renderer/src/views/Settings/UserManager.tsx
import React, { useState, useEffect } from 'react'
import { User } from '../../types/models'
import { useAuth } from '../../store/AuthContext'
import styles from './UserManager.module.css'

// Replicating your C# Base64 Password Hashing
async function hashPassword(password: string): Promise<string> {
  if (!password) return ''
  const msgBuffer = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const binaryString = String.fromCharCode(...hashArray)
  return btoa(binaryString)
}

const PERMISSION_LIST = [
  { id: 'POS', label: '🛒 Point of Sale' },
  { id: 'TodaySales', label: "🎯 Today's Sales" },
  { id: 'Credit', label: '💳 Credit / Debtors' },
  { id: 'Returns', label: '↩️ Sales Returns' },
  { id: 'Suppliers', label: '🚛 Suppliers & Stock In' },
  { id: 'StockAdjust', label: '⚖️ Adjust Stock' },
  { id: 'Products', label: '📦 Products' },
  { id: 'Reports', label: '📊 Reports' }
]

export default function UserManager() {
  const { currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [existingHash, setExistingHash] = useState('')
  const [role, setRole] = useState<number>(2) // 1 = Admin, 2 = Employee
  const [isActive, setIsActive] = useState<boolean>(true)
  const [selectedPerms, setSelectedPerms] = useState<string[]>([])

  const loadUsers = async () => {
    try {
      // @ts-ignore
      const data = await window.api.getUsers()
      setUsers(data)
    } catch (error) {
      console.error('Failed to load users', error)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleEdit = (u: User) => {
    setEditingId(u.Id)
    setFullName(u.FullName)
    setUsername(u.Username)
    setPassword('') // Keep blank so we don't accidentally overwrite it
    setExistingHash(u.PasswordHash)
    setRole(u.Role)
    setIsActive(u.IsActive === true || u.IsActive === 1)
    setSelectedPerms(u.Permissions ? u.Permissions.split(',') : [])
  }

  const handleClear = () => {
    setEditingId(null)
    setFullName('')
    setUsername('')
    setPassword('')
    setExistingHash('')
    setRole(2)
    setIsActive(true)
    setSelectedPerms([])
  }

  const togglePermission = (permId: string) => {
    setSelectedPerms((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !username.trim()) {
      alert('Name and Username are required!')
      return
    }

    if (!editingId && !password) {
      alert('A password is required for new users!')
      return
    }

    // Determine final password hash
    let finalHash = existingHash
    if (password) {
      finalHash = await hashPassword(password)
    }

    // Admins always get 'ALL' permissions
    const finalPerms = role === 1 ? 'ALL' : selectedPerms.join(',')

    const payload = {
      Id: editingId,
      Username: username.trim(),
      PasswordHash: finalHash,
      FullName: fullName.trim(),
      Role: role,
      IsActive: isActive,
      Permissions: finalPerms
    }

    try {
      if (editingId) {
        // @ts-ignore
        await window.api.updateUser(payload)
      } else {
        const isDuplicate = users.some(
          (u) => u.Username.toLowerCase() === username.trim().toLowerCase()
        )
        if (isDuplicate) {
          alert(`Username '${username}' is already taken.`)
          return
        }
        // @ts-ignore
        await window.api.addUser(payload)
      }
      handleClear()
      loadUsers()
    } catch (err: any) {
      alert(`Error saving user: ${err.message}`)
    }
  }

  const handleToggleBlock = async (u: User, currentStatus: boolean) => {
    if (u.Role === 0 || (u.Role === 1 && u.Id === currentUser?.Id)) {
      alert('You cannot block your own admin account.')
      return
    }

    if (
      window.confirm(
        `Are you sure you want to ${currentStatus ? 'BLOCK' : 'UNBLOCK'} ${u.Username}?`
      )
    ) {
      try {
        const payload = { ...u, IsActive: !currentStatus }
        // @ts-ignore
        await window.api.updateUser(payload)
        loadUsers()
        if (editingId === u.Id) handleClear()
      } catch (err: any) {
        alert(`Error updating status: ${err.message}`)
      }
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.FullName.toLowerCase().includes(search.toLowerCase()) ||
      u.Username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={styles.container}>
      {/* LEFT PANEL: User DataGrid */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span style={{ fontWeight: 'bold' }}>STAFF ACCOUNTS</span>
          <input
            type="text"
            placeholder="Search users..."
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
                <th>USERNAME</th>
                <th>FULL NAME</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}
                  >
                    No users found. Create an account on the right.
                  </td>
                </tr>
              )}
              {filteredUsers.map((u) => {
                const active = u.IsActive === true || u.IsActive === 1
                return (
                  <tr key={u.Id} onClick={() => handleEdit(u)}>
                    <td style={{ fontWeight: 'bold', color: '#1E293B' }}>{u.Username}</td>
                    <td>{u.FullName}</td>
                    <td style={{ color: '#64748B' }}>{u.Role === 1 ? 'Admin' : 'Staff'}</td>
                    <td>
                      <span className={active ? styles.statusActive : styles.statusBlocked}>
                        {active ? 'ACTIVE' : 'BLOCKED'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className={active ? styles.blockBtn : styles.unblockBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleBlock(u, active)
                        }}
                      >
                        {active ? 'BLOCK' : 'UNBLOCK'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT PANEL: Add/Edit Form */}
      <div className={styles.panel}>
        <h2 className={styles.panelHeader} style={{ fontWeight: 'bold', borderBottom: 'none' }}>
          {editingId ? `EDIT: ${username}` : 'CREATE NEW USER'}
        </h2>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className={styles.formGroup}>
            <label>FULL NAME *</label>
            <input
              type="text"
              className={styles.classicInput}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className={styles.formGroup}>
              <label>USERNAME *</label>
              <input
                type="text"
                className={styles.classicInput}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>ROLE</label>
              <select
                className={styles.classicSelect}
                value={role}
                onChange={(e) => setRole(Number(e.target.value))}
              >
                <option value={2}>Staff (Limited)</option>
                <option value={1}>Administrator</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>
              PASSWORD{' '}
              {editingId && (
                <span style={{ color: '#94A3B8', fontWeight: 'normal' }}>
                  (Leave blank to keep current)
                </span>
              )}
            </label>
            <input
              type="password"
              className={styles.classicInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* PERMISSIONS GRID (Only show if role is Staff) */}
          {role === 2 && (
            <>
              <label
                style={{ fontWeight: 700, color: '#334155', fontSize: '13px', marginBottom: '5px' }}
              >
                ACCESS PERMISSIONS
              </label>
              <div className={styles.permissionsGrid}>
                {PERMISSION_LIST.map((perm) => (
                  <label key={perm.id} className={styles.permissionItem}>
                    <input
                      type="checkbox"
                      checked={selectedPerms.includes(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    {perm.label}
                  </label>
                ))}
              </div>
            </>
          )}

          <div style={{ flex: 1 }}></div>

          <div className={styles.btnGroup}>
            <button type="button" className={styles.clearBtn} onClick={handleClear}>
              CLEAR
            </button>
            <button type="submit" className={styles.primaryBtn}>
              {editingId ? 'SAVE CHANGES' : 'CREATE USER'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
