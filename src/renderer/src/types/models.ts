// src/renderer/src/types/models.ts

export interface User {
  Id: number
  Username: string
  PasswordHash: string // <-- ADD THIS LINE!
  FullName: string
  Role: number
  IsActive: boolean | number // Note: SQLite sometimes returns 1/0 for booleans
  Permissions: string
}

export interface Category {
  Id: number
  Name: string
  ParentId: number | null
}

export interface Product {
  Id: number
  Name: string
  Barcode: string
  Description: string
  Unit: string
  CategoryId: number
  CategoryName?: string // Joined from DB
  BuyingPrice: number
  SellingPrice: number
  DiscountLimit: number
  Quantity: number
  IsActive: boolean
}

export interface Supplier {
  Id: number
  Name: string
  Phone: string
  Note: string
}

export interface StockBatch {
  Id: number
  ProductId: number
  ProductName?: string
  InitialQuantity: number
  RemainingQuantity: number
  CostPrice: number
  SellingPrice: number
  Discount: number
  DiscountCode: string
  ReceivedDate: string
}

export interface SalesTransaction {
  ReceiptId: string
  TransactionDate: string
  TotalAmount: number
  PaidAmount: number
  IsCredit: boolean
  CustomerName: string
  Status: number // 0 = Paid, 1 = Unpaid, 2 = PartiallyPaid
}
