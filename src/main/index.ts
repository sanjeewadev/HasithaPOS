// src/main/index.ts
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDatabase } from './database'

// IMPORT OUR NEW REPOSITORIES
import * as userRepo from './repositories/userRepo'
import * as catRepo from './repositories/categoryRepo'
import * as supRepo from './repositories/supplierRepo'
import * as prodRepo from './repositories/productRepo'
import * as stockRepo from './repositories/stockRepo'
import * as reportRepo from './repositories/reportRepo'

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
    titleBarStyle: 'hidden',
    frame: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
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

  // Stock, Checkout & Adjustments
  ipcMain.handle('process-sale', (_, txn, movs) => stockRepo.processCompleteSale(txn, movs))
  ipcMain.handle('receive-stock', (_, mov) => stockRepo.receiveStock(mov))
  ipcMain.handle('adjust-stock', (_, adj) => stockRepo.adjustStock(adj))
  ipcMain.handle('get-active-batches', () => stockRepo.getActiveBatches())
  ipcMain.handle('get-low-stock', (_, threshold) => stockRepo.getLowStockProducts(threshold))
  ipcMain.handle('get-product-adjustments', (_, productId) =>
    stockRepo.getProductAdjustments(productId)
  )

  // 🚀 VOIDS & RETURNS ENGINE
  ipcMain.handle('void-receipt', (_, id) => stockRepo.voidReceipt(id))
  ipcMain.handle('process-return', (_, payload) => stockRepo.processReturn(payload))
  ipcMain.handle('get-bill-for-return', (_, receiptId) => reportRepo.getBillForReturn(receiptId))

  // 🚀 GRN ENGINE
  ipcMain.handle('process-grn', (_, payload) => stockRepo.processGRN(payload))
  ipcMain.handle('get-supplier-invoices', (_, supplierId) =>
    stockRepo.getSupplierInvoices(supplierId)
  )
  ipcMain.handle('get-invoice-items', (_, invoiceId) => stockRepo.getInvoiceItems(invoiceId))
  ipcMain.handle('get-product-batches', (_, productId) => stockRepo.getProductBatches(productId))

  // --- REPORTS & DASHBOARDS ---
  ipcMain.handle('get-dashboard-metrics', () => reportRepo.getDashboardMetrics())
  ipcMain.handle('get-chart-data', (_, filter) => reportRepo.getChartData(filter))
  ipcMain.handle('get-top-sellers', () => reportRepo.getTopSellers(5))
  ipcMain.handle('get-dashboard-low-stock', () => reportRepo.getLowStockAlerts(5))

  // Sales Ledger Queries
  ipcMain.handle('get-today-sales', () => reportRepo.getTodaySales())
  ipcMain.handle('get-receipt-items', (_, receiptId) => reportRepo.getReceiptItems(receiptId))
  ipcMain.handle('getSalesHistory', (_, startDate, endDate, search) =>
    reportRepo.getSalesHistory(startDate, endDate, search)
  )
  ipcMain.handle('getReceiptDetails', (_, receiptId) => reportRepo.getReceiptDetails(receiptId))

  ipcMain.handle('get-pending-credit', () => reportRepo.getPendingCreditAccounts())
  ipcMain.handle('process-credit-payment', (_, receiptId, amount) =>
    reportRepo.processCreditPayment(receiptId, amount)
  )
  ipcMain.handle('get-audit-logs', (_, startDate, endDate) =>
    reportRepo.getAuditLogs(startDate, endDate)
  )
  // Add this inside your ipcMain.handle section:
  ipcMain.handle('process-complete-sale', (_, transaction, movements) =>
    stockRepo.processCompleteSale(transaction, movements)
  )

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
