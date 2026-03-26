import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDatabase } from './database'
import { getSalesHistory, getReceiptDetails } from './database'
import { getDashboardMetrics, getRecentTransactions } from './database'

// IMPORT OUR NEW REPOSITORIES
import * as userRepo from './repositories/userRepo'
import * as catRepo from './repositories/categoryRepo'
import * as supRepo from './repositories/supplierRepo'
import * as prodRepo from './repositories/productRepo'
import * as stockRepo from './repositories/stockRepo'

// 1. SINGLE INSTANCE LOCK (Replaces your C# Mutex)
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden', // <-- HIDES THE DEFAULT WINDOWS BAR
    frame: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize() // Start maximized just like WPF
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Start Database
  initDatabase()

  // --- IPC WALKIE-TALKIE LISTENERS ---

  // Users
  ipcMain.handle('get-user-by-username', (_, username) => userRepo.getUserByUsername(username))
  ipcMain.handle('get-users', () => userRepo.getAllUsers())
  ipcMain.handle('add-user', (_, user) => userRepo.addUser(user))
  ipcMain.handle('update-user', (_, user) => userRepo.updateUser(user))
  ipcMain.handle('delete-user', (_, id) => userRepo.deleteUser(id))

  // Categories
  ipcMain.handle('get-categories', () => catRepo.getAllCategories())
  ipcMain.handle('add-category', (_, cat) => catRepo.addCategory(cat))
  ipcMain.handle('update-category', (_, cat) => catRepo.updateCategory(cat))
  ipcMain.handle('delete-category', (_, id) => catRepo.deleteCategory(id))

  // Suppliers
  ipcMain.handle('get-suppliers', () => supRepo.getAllSuppliers())
  ipcMain.handle('add-supplier', (_, sup) => supRepo.addSupplier(sup))
  ipcMain.handle('update-supplier', (_, sup) => supRepo.updateSupplier(sup))
  ipcMain.handle('delete-supplier', (_, id) => supRepo.deleteSupplier(id))

  // Products
  ipcMain.handle('get-products', () => prodRepo.getAllProducts())
  ipcMain.handle('add-product', (_, prod) => prodRepo.addProduct(prod))
  ipcMain.handle('update-product', (_, prod) => prodRepo.updateProduct(prod))
  ipcMain.handle('delete-product', (_, id) => prodRepo.deleteProduct(id))

  // ... Products listeners ...

  // Stock & Transactions
  ipcMain.handle('process-sale', (_, txn, movs) => stockRepo.processCompleteSale(txn, movs))
  ipcMain.handle('receive-stock', (_, mov) => stockRepo.receiveStock(mov))
  ipcMain.handle('adjust-stock', (_, adj) => stockRepo.adjustStock(adj))
  ipcMain.handle('get-active-batches', () => stockRepo.getActiveBatches())
  ipcMain.handle('get-low-stock', (_, threshold) => stockRepo.getLowStockProducts(threshold))
  ipcMain.handle('void-receipt', (_, id) => stockRepo.voidReceipt(id))

  ipcMain.handle('getDashboardMetrics', async () => {
    return await getDashboardMetrics()
  })

  ipcMain.handle('getRecentTransactions', async (_, limit) => {
    return await getRecentTransactions(limit)
  })

  ipcMain.handle('getSalesHistory', async (_, dateStr, search) => {
    return getSalesHistory(dateStr, search)
  })
  ipcMain.handle('getReceiptDetails', async (_, receiptId) => {
    return getReceiptDetails(receiptId)
  })

  // --- END LISTENERS ---

  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
