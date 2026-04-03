// src/renderer/src/views/Settings/UserManager.tsx
import React, { useState, useEffect } from 'react'
import { User } from '../../types/models'
import { useAuth } from '../../store/AuthContext'
import styles from './UserManager.module.css'

// 🚀 FIXED PERMISSIONS FOR STAFF: Defined in code for maximum security
const STAFF_PERMISSIONS = [
  'POS',
  'Returns',
  'ViewProducts',
  'InventoryAlerts',
  'TodaySales',
  'SalesHistory',
  'CreditAccounts'
].join(',')

// Replicating your C# Base64 Password Hashing
async function hashPassword(password: string): Promise<string> {
  if (!password) return ''
  const msgBuffer = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const binaryString = String.fromCharCode(...hashArray)
  return btoa(binaryString)
}

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
  const [role, setRole] = useState<number>(2) // 1 = Admin, 2 = Staff
  const [isActive, setIsActive] = useState<boolean>(true)

  const loadUsers = async () => {
    try {
      // @ts-ignore
      const data = await window.api.getUsers()
      setUsers(data || [])
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
    setPassword('')
    setExistingHash(u.PasswordHash)
    setRole(u.Role)
    setIsActive(u.IsActive === true || u.IsActive === 1)
  }

  const handleClear = () => {
    setEditingId(null)
    setFullName('')
    setUsername('')
    setPassword('')
    setExistingHash('')
    setRole(2)
    setIsActive(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const safeFullName = fullName.trim()
    const safeUsername = username.trim().toLowerCase()

    if (!safeFullName || !safeUsername) {
      return alert('Name and Username are required!')
    }

    if (!editingId && !password) {
      return alert('A password is required for new users!')
    }

    let finalHash = existingHash
    if (password) {
      finalHash = await hashPassword(password)
    }

    // 🚀 AUTOMATIC PERMISSION ASSIGNMENT
    const finalPerms = role === 1 ? 'ALL' : STAFF_PERMISSIONS

    const payload = {
      Id: editingId,
      Username: safeUsername,
      PasswordHash: finalHash,
      FullName: safeFullName,
      Role: role,
      IsActive: isActive,
      Permissions: finalPerms
    }

    try {
      if (editingId) {
        // @ts-ignore
        await window.api.updateUser(payload)
        alert('User updated successfully.')
      } else {
        const isDuplicate = users.some((u) => u.Username.toLowerCase() === safeUsername)
        if (isDuplicate) return alert(`Username '${safeUsername}' is already taken.`)

        // @ts-ignore
        await window.api.addUser(payload)
        alert('User created successfully.')
      }
      handleClear()
      loadUsers()
    } catch (err: any) {
      alert(`Error saving user: ${err.message}`)
    }
  }

  const handleToggleBlock = async (u: User, currentStatus: boolean) => {
    if (u.Role === 0 || u.Id === currentUser?.Id) {
      return alert('Security: You cannot block yourself or the Master Root account.')
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
      {/* LEFT PANEL: User List */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span style={{ fontWeight: 900, fontSize: '14px' }}>SYSTEM ACCOUNTS</span>
          <input
            type="text"
            placeholder="Search by name or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
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
                <th style={{ textAlign: 'right' }}>COMMAND</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyMsg}>
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const active = u.IsActive === true || u.IsActive === 1
                  return (
                    <tr
                      key={u.Id}
                      onClick={() => handleEdit(u)}
                      className={editingId === u.Id ? styles.rowActive : ''}
                    >
                      <td
                        style={{
                          fontWeight: 800,
                          color: 'var(--primary)',
                          fontFamily: 'monospace'
                        }}
                      >
                        {u.Username}
                      </td>
                      <td style={{ fontWeight: 700 }}>{u.FullName}</td>
                      <td>
                        <span className={u.Role === 1 ? styles.badgeAdmin : styles.badgeStaff}>
                          {u.Role === 1 ? 'ADMIN' : 'STAFF'}
                        </span>
                      </td>
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT PANEL: Edit Form */}
      <div className={styles.panel}>
        <h2 className={styles.formTitle}>{editingId ? 'MODIFY ACCOUNT' : 'REGISTER NEW USER'}</h2>

        <form onSubmit={handleSave} className={styles.userForm}>
          <div className={styles.formGroup}>
            <label>FULL NAME *</label>
            <input
              type="text"
              className={styles.classicInput}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>USERNAME *</label>
            <input
              type="text"
              className={styles.classicInput}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="login_id"
              required
              disabled={!!editingId} // Usernames usually shouldn't change
            />
          </div>

          <div className={styles.formGroup}>
            <label>SYSTEM ROLE</label>
            <select
              className={styles.classicSelect}
              value={role}
              onChange={(e) => setRole(Number(e.target.value))}
            >
              <option value={2}>Staff (Fixed Permissions)</option>
              <option value={1}>Administrator (Full Access)</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>PASSWORD {editingId && <span>(Leave blank to keep current)</span>}</label>
            <input
              type="password"
              className={styles.classicInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className={styles.infoBox}>
            <div className={styles.infoTitle}>Note on Permissions:</div>
            <p>
              {role === 1
                ? 'Administrators have unrestricted access to all system modules, including settings and deletion.'
                : 'Staff are automatically granted access to: POS, Returns, View Products, Alerts, and Sales History.'}
            </p>
          </div>

          <div className={styles.btnGroup}>
            <button type="button" className={styles.clearBtn} onClick={handleClear}>
              {editingId ? 'CANCEL' : 'CLEAR'}
            </button>
            <button type="submit" className={styles.primaryBtn}>
              {editingId ? 'UPDATE ACCOUNT' : 'CREATE ACCOUNT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
