// src/main/repositories/reportRepo.ts
import { getDb } from '../database'

// ==========================================
// 📈 1. DASHBOARD KPI METRICS
// ==========================================
export function getDashboardMetrics() {
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]

  // 1 & 2. Today's Gross Sales & Net Profit
  // We calculate this directly from StockMovements (Type 2 = Sold) to get exact cost vs price
  const salesData = db
    .prepare(
      `
    SELECT 
      SUM(Quantity * UnitPrice) as grossSales,
      SUM(Quantity * (UnitPrice - UnitCost)) as netProfit
    FROM StockMovements 
    WHERE Type = 2 AND IsVoided = 0 AND Date LIKE ?
  `
    )
    .get(`${today}%`) as { grossSales: number; netProfit: number }

  // 3. Total Bills Cut Today
  const totalBills = db
    .prepare(
      `
    SELECT COUNT(ReceiptId) as count 
    FROM SalesTransactions 
    WHERE TransactionDate LIKE ?
  `
    )
    .get(`${today}%`) as { count: number }

  // 4. Pending Credit Collections
  const pendingCredit = db
    .prepare(
      `
    SELECT SUM(TotalAmount - PaidAmount) as total 
    FROM SalesTransactions 
    WHERE IsCredit = 1 AND Status IN (1, 2)
  `
    )
    .get() as { total: number }

  return {
    grossSales: salesData?.grossSales || 0,
    netProfit: salesData?.netProfit || 0,
    totalBills: totalBills?.count || 0,
    pendingCredit: pendingCredit?.total || 0
  }
}

// ==========================================
// 📊 2. BUSINESS INTELLIGENCE (CHART & LISTS)
// ==========================================

export function getChartData(filter: '7_days' | 'this_month' = '7_days') {
  const db = getDb()

  // By default, group by the last 7 days
  let dateModifier = '-7 days'
  if (filter === 'this_month') dateModifier = 'start of month'

  // This powerful query groups all sales by day, and calculates exact Revenue and Profit per day!
  return db
    .prepare(
      `
    SELECT 
      date(Date) as dateLabel,
      SUM(Quantity * UnitPrice) as sales,
      SUM(Quantity * (UnitPrice - UnitCost)) as profit
    FROM StockMovements
    WHERE Type = 2 AND IsVoided = 0 AND date(Date) >= date('now', ?)
    GROUP BY date(Date)
    ORDER BY date(Date) ASC
  `
    )
    .all(dateModifier)
}

export function getTopSellers(limit: number = 5) {
  const db = getDb()
  // Finds the products that brought in the most revenue this month
  return db
    .prepare(
      `
    SELECT 
      p.Name, 
      SUM(m.Quantity) as TotalSold, 
      SUM(m.Quantity * m.UnitPrice) as Revenue
    FROM StockMovements m
    JOIN Products p ON m.ProductId = p.Id
    WHERE m.Type = 2 AND m.IsVoided = 0 AND date(m.Date) >= date('now', 'start of month')
    GROUP BY m.ProductId
    ORDER BY Revenue DESC
    LIMIT ?
  `
    )
    .all(limit)
}

export function getLowStockAlerts(limit: number = 5) {
  const db = getDb()
  // Finds active products closest to running out of stock
  return db
    .prepare(
      `
    SELECT Id, Name, Quantity, Unit 
    FROM Products 
    WHERE IsActive = 1 AND Quantity <= 15
    ORDER BY Quantity ASC 
    LIMIT ?
  `
    )
    .all(limit)
}

// ==========================================
// 📜 3. SALES HISTORY & RECEIPTS
// ==========================================
export function getSalesHistory(startDate: string, endDate: string, search: string) {
  const db = getDb()

  // Base query: Filter strictly between the Start and End dates (inclusive)
  let query = `
    SELECT * FROM SalesTransactions 
    WHERE date(TransactionDate) BETWEEN date(?) AND date(?)
  `
  const params: any[] = [startDate, endDate]

  // Add the search filter if the user typed something
  if (search) {
    query += ' AND (ReceiptId LIKE ? OR CustomerName LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }

  query += ' ORDER BY TransactionDate DESC'
  return db.prepare(query).all(...params)
}

export function getReceiptDetails(receiptId: string) {
  const db = getDb()
  const transaction = db
    .prepare('SELECT * FROM SalesTransactions WHERE ReceiptId = ?')
    .get(receiptId)
  const items = db
    .prepare(
      `
    SELECT m.*, p.Name as ProductName 
    FROM StockMovements m
    JOIN Products p ON m.ProductId = p.Id
    WHERE m.ReceiptId = ? AND m.Type = 2
  `
    )
    .all(receiptId)

  return { transaction, items }
}

export function getTodaySales() {
  const today = new Date().toISOString().split('T')[0]
  return getDb()
    .prepare(
      `
    SELECT * FROM SalesTransactions 
    WHERE TransactionDate LIKE ? 
    ORDER BY TransactionDate DESC
  `
    )
    .all(today + '%')
}

export function getReceiptItems(receiptId: string) {
  return getDb()
    .prepare(
      `
    SELECT m.*, p.Name as ProductName, p.Unit 
    FROM StockMovements m
    JOIN Products p ON m.ProductId = p.Id
    WHERE m.ReceiptId = ? AND m.Type = 2
  `
    )
    .all(receiptId)
}

export function getBillForReturn(receiptId: string) {
  const db = getDb()

  // 1. Get the main transaction
  const txn = db.prepare('SELECT * FROM SalesTransactions WHERE ReceiptId = ?').get(receiptId)
  if (!txn) return null

  // 2. Get items and calculate "Already Returned" quantity
  // We sum movements of Type 2 (Out) and subtract Type 4 (Return/In)
  const items = db
    .prepare(
      `
    SELECT 
      m.ProductId,
      p.Name as ProductName,
      p.Unit,
      m.StockBatchId,
      m.UnitPrice,
      m.UnitCost,
      SUM(CASE WHEN m.Type = 2 THEN m.Quantity ELSE 0 END) as OriginalQty,
      SUM(CASE WHEN m.Type = 4 THEN m.Quantity ELSE 0 END) as ReturnedQty
    FROM StockMovements m
    JOIN Products p ON m.ProductId = p.Id
    WHERE m.ReceiptId = ? AND m.IsVoided = 0
    GROUP BY m.ProductId, m.StockBatchId
  `
    )
    .all(receiptId)

  return { transaction: txn, items }
}

// ==========================================
// 💳 4. CREDIT & DEBT MANAGEMENT
// ==========================================

export function getPendingCreditAccounts() {
  const db = getDb()

  // This groups the debt by Customer Name!
  return db
    .prepare(
      `
    SELECT 
      CustomerName,
      COUNT(ReceiptId) as TotalUnpaidBills,
      SUM(TotalAmount) as TotalCredit,
      SUM(PaidAmount) as TotalPaid,
      SUM(TotalAmount - PaidAmount) as TotalPending
    FROM SalesTransactions
    WHERE IsCredit = 1 AND Status IN (1, 2) 
      AND (TotalAmount - PaidAmount) > 0
      AND IsVoided = 0
    GROUP BY CustomerName
    ORDER BY TotalPending DESC
  `
    )
    .all()
}

export function getCustomerCreditBills(customerName: string) {
  const db = getDb()

  // Fetches the specific unpaid bills for a single customer
  return db
    .prepare(
      `
    SELECT * FROM SalesTransactions
    WHERE IsCredit = 1 AND Status IN (1, 2) 
      AND (TotalAmount - PaidAmount) > 0
      AND CustomerName = ?
      AND IsVoided = 0
    ORDER BY TransactionDate ASC
  `
    )
    .all(customerName)
}

export function processCreditPayment(customerName: string, amountToPay: number) {
  const db = getDb()

  const payTxn = db.transaction((name, amount) => {
    let remainingPayment = amount

    // 1. Fetch all unpaid bills for this customer, oldest first
    const bills: any[] = db
      .prepare(
        `
      SELECT ReceiptId, TotalAmount, PaidAmount 
      FROM SalesTransactions
      WHERE CustomerName = ? AND IsCredit = 1 AND Status != 3 AND (TotalAmount - PaidAmount) > 0
      ORDER BY TransactionDate ASC
    `
      )
      .all(name)

    const updateBillStmt = db.prepare(`
      UPDATE SalesTransactions 
      SET PaidAmount = PaidAmount + ?, 
          Status = CASE WHEN PaidAmount + ? >= TotalAmount THEN 2 ELSE Status END
      WHERE ReceiptId = ?
    `)

    // 2. Distribute the cash across the bills
    for (const bill of bills) {
      if (remainingPayment <= 0) break

      const owedOnBill = bill.TotalAmount - bill.PaidAmount
      const paymentForThisBill = Math.min(owedOnBill, remainingPayment)

      updateBillStmt.run(paymentForThisBill, paymentForThisBill, bill.ReceiptId)
      remainingPayment -= paymentForThisBill
    }
  })

  payTxn(customerName, amountToPay)
  return { success: true }
}

// ==========================================
// 🛡️ 5. AUDIT & SECURITY LOGS
// ==========================================

export function getAuditLogs(startDate: string, endDate: string) {
  const db = getDb()

  return db
    .prepare(
      `
    SELECT 
      m.Id,
      m.Date,
      m.Type,
      m.Quantity,
      m.UnitPrice,
      m.UnitCost,
      m.Note,
      m.Reason,
      m.IsVoided,
      m.ReceiptId,
      p.Name as ProductName,
      p.Unit
    FROM StockMovements m
    JOIN Products p ON m.ProductId = p.Id
    WHERE date(m.Date) BETWEEN date(?) AND date(?)
      AND (m.Type IN (3, 4) OR m.IsVoided = 1)
    ORDER BY m.Date DESC
  `
    )
    .all(startDate, endDate)
}
