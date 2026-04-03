// src/main/repositories/systemRepo.ts
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { getDb } from '../database'

// Helper to get the exact path of your live database
const getDbPath = () => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'jhhardware.sqlite')
}

// ==========================================
// 💾 1. BACKUP DATABASE
// ==========================================
export async function exportDatabase(destinationPath: string) {
  try {
    const sourcePath = getDbPath()
    // Securely copy the live database to the user's chosen flash drive/folder
    fs.copyFileSync(sourcePath, destinationPath)
    return { success: true }
  } catch (error: any) {
    throw new Error(`Failed to backup database: ${error.message}`)
  }
}

// ==========================================
// 🔄 2. RESTORE DATABASE
// ==========================================
export async function importDatabase(sourcePath: string) {
  try {
    const liveDbPath = getDbPath()
    const db = getDb()

    // 1. Close the active database connection safely so we can overwrite the file
    db.close()

    // 2. Overwrite the live database with the backup file
    fs.copyFileSync(sourcePath, liveDbPath)

    return { success: true }
  } catch (error: any) {
    throw new Error(`Failed to restore database: ${error.message}`)
  }
}

// ==========================================
// 🚨 3. FACTORY RESET (DANGER ZONE)
// ==========================================
export function factoryReset() {
  const db = getDb()

  try {
    // Run everything in a single transaction so if one fails, nothing breaks
    const reset = db.transaction(() => {
      // 1. Wipe all transactional data
      db.prepare('DELETE FROM StockMovements').run()
      db.prepare('DELETE FROM SalesTransactions').run()

      // 2. Wipe all catalog & inventory data
      db.prepare('DELETE FROM Products').run()
      db.prepare('DELETE FROM Categories').run()
      db.prepare('DELETE FROM Suppliers').run()

      // 3. Reset SQLite auto-increment counters so new items start at ID 1 again
      db.prepare(
        'DELETE FROM sqlite_sequence WHERE name IN ("StockMovements", "SalesTransactions", "Products", "Categories", "Suppliers")'
      ).run()

      // NOTE: We intentionally DO NOT delete from the "Users" table so you don't lock yourself out!
    })

    reset()
    return { success: true }
  } catch (error: any) {
    throw new Error(`Factory reset failed: ${error.message}`)
  }
}
