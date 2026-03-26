import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// ==========================================
// THE BRIDGE (Custom APIs for React Renderer)
// ==========================================
const api = {
  // --- USERS ---
  getUserByUsername: (username: string) => ipcRenderer.invoke('get-user-by-username', username),
  getUsers: () => ipcRenderer.invoke('get-users'),
  addUser: (user: any) => ipcRenderer.invoke('add-user', user),
  updateUser: (user: any) => ipcRenderer.invoke('update-user', user),
  deleteUser: (id: number) => ipcRenderer.invoke('delete-user', id),

  // --- CATEGORIES ---
  getCategories: () => ipcRenderer.invoke('get-categories'),
  addCategory: (cat: any) => ipcRenderer.invoke('add-category', cat),
  updateCategory: (cat: any) => ipcRenderer.invoke('update-category', cat),
  deleteCategory: (id: number) => ipcRenderer.invoke('delete-category', id),

  // --- SUPPLIERS ---
  getSuppliers: () => ipcRenderer.invoke('get-suppliers'),
  addSupplier: (sup: any) => ipcRenderer.invoke('add-supplier', sup),
  updateSupplier: (sup: any) => ipcRenderer.invoke('update-supplier', sup),
  deleteSupplier: (id: number) => ipcRenderer.invoke('delete-supplier', id),

  // --- PRODUCTS ---
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (prod: any) => ipcRenderer.invoke('add-product', prod),
  updateProduct: (prod: any) => ipcRenderer.invoke('update-product', prod),
  deleteProduct: (id: number) => ipcRenderer.invoke('delete-product', id),

  // --- STOCK & CHECKOUT ENGINE ---
  processSale: (txn: any, movs: any[]) => ipcRenderer.invoke('process-sale', txn, movs),
  receiveStock: (mov: any) => ipcRenderer.invoke('receive-stock', mov),
  adjustStock: (adj: any) => ipcRenderer.invoke('adjust-stock', adj),
  getActiveBatches: () => ipcRenderer.invoke('get-active-batches'),
  getLowStock: (threshold: number) => ipcRenderer.invoke('get-low-stock', threshold),
  voidReceipt: (id: string) => ipcRenderer.invoke('void-receipt', id),

  // Add these inside the api object:
  getDashboardMetrics: () => ipcRenderer.invoke('getDashboardMetrics'),
  getRecentTransactions: (limit: number) => ipcRenderer.invoke('getRecentTransactions', limit),

  getSalesHistory: (dateStr: string, search: string) =>
    ipcRenderer.invoke('getSalesHistory', dateStr, search),
  getReceiptDetails: (receiptId: string) => ipcRenderer.invoke('getReceiptDetails', receiptId)
}

// ==========================================
// SECURE EXPOSURE LOGIC
// ==========================================
// This safely attaches our bridge to the React `window` object
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
