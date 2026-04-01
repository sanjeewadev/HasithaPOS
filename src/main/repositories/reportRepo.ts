// src/main/repositories/reportRepo.ts
import { getDb } from '../database'

// ==========================================
// 📈 1. DASHBOARD KPI METRICS
// ==========================================
export function getDashboardMetrics() {
  const db = getDb()

  const salesData = db
    .prepare(
      `
    SELECT SUM(PaidAmount) as grossSales 
    FROM SalesTransactions 
    WHERE date(TransactionDate, 'localtime') = date('now', 'localtime') AND Status != 3
  `
    )
    .get() as { grossSales: number }

  const costData = db
    .prepare(
      `
    SELECT SUM(Quantity * UnitCost) as totalCost 
    FROM StockMovements 
    WHERE Type = 2 AND date(Date, 'localtime') = date('now', 'localtime') AND IsVoided = 0
  `
    )
    .get() as { totalCost: number }

  const grossSales = salesData?.grossSales || 0
  const totalCost = costData?.totalCost || 0
  const netProfit = grossSales - totalCost

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
    grossSales: grossSales,
    netProfit: netProfit,
    pendingCredit: pendingCredit?.total || 0
  }
}

// ==========================================
// 📊 2. BUSINESS INTELLIGENCE (CHART & LISTS)
// ==========================================
export function getChartData(filter: '7_days' | 'this_month' = '7_days') {
  const db = getDb()
  let dateModifier = '-7 days'
  if (filter === 'this_month') dateModifier = 'start of month'

  return db
    .prepare(
      `
    WITH DailyRevenue AS (
      SELECT date(TransactionDate, 'localtime') as dateLabel, SUM(PaidAmount) as sales
      FROM SalesTransactions
      WHERE Status != 3 AND date(TransactionDate, 'localtime') >= date('now', 'localtime', ?)
      GROUP BY date(TransactionDate, 'localtime')
    ),
    DailyCost AS (
      SELECT date(Date, 'localtime') as dateLabel, SUM(Quantity * UnitCost) as cost
      FROM StockMovements
      WHERE Type = 2 AND IsVoided = 0 AND date(Date, 'localtime') >= date('now', 'localtime', ?)
      GROUP BY date(Date, 'localtime')
    )
    SELECT 
      r.dateLabel,
      r.sales,
      (r.sales - COALESCE(c.cost, 0)) as profit
    FROM DailyRevenue r
    LEFT JOIN DailyCost c ON r.dateLabel = c.dateLabel
    ORDER BY r.dateLabel ASC
  `
    )
    .all(dateModifier, dateModifier)
}

export function getTopSellers(limit: number = 5) {
  const db = getDb()
  return db
    .prepare(
      `
    SELECT p.Name, SUM(m.Quantity) as TotalSold, SUM(m.Quantity * m.UnitPrice) as Revenue
    FROM StockMovements m
    JOIN Products p ON m.ProductId = p.Id
    WHERE m.Type = 2 AND m.IsVoided = 0 AND date(m.Date, 'localtime') >= date('now', 'localtime', 'start of month')
    GROUP BY m.ProductId
    ORDER BY Revenue DESC
    LIMIT ?
  `
    )
    .all(limit)
}

// 🚀 UPGRADED: Pulls ALL items at or below threshold (Default: 10)
export function getLowStockAlerts(threshold: number = 10) {
  const db = getDb()
  return db
    .prepare(
      `
      SELECT Id, Name, Barcode, Quantity, Unit 
      FROM Products 
      WHERE IsActive = 1 AND Quantity <= ?
      ORDER BY Quantity ASC 
    `
    )
    .all(threshold)
}

// ==========================================
// 📜 3. SALES HISTORY & RECEIPTS
// ==========================================
export function getSalesHistory(startDate: string, endDate: string, search: string) {
  const db = getDb()
  let query = `SELECT * FROM SalesTransactions WHERE date(TransactionDate, 'localtime') BETWEEN date(?) AND date(?)`
  const params: any[] = [startDate, endDate]

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
  return getDb()
    .prepare(
      `
    SELECT * FROM SalesTransactions 
    WHERE date(TransactionDate, 'localtime') = date('now', 'localtime')
    ORDER BY TransactionDate DESC
  `
    )
    .all()
}

export function getReceiptItems(receiptId: string) {
  return getDb()
    .prepare(
      `
    SELECT m.*, p.Name as ProductName, p.Unit, p.Barcode, p.SellingPrice as OriginalPrice 
    FROM StockMovements m
    JOIN Products p ON m.ProductId = p.Id
    WHERE m.ReceiptId = ? AND m.Type = 2
  `
    )
    .all(receiptId)
}

export function getBillForReturn(receiptId: string) {
  const db = getDb()
  const txn = db.prepare('SELECT * FROM SalesTransactions WHERE ReceiptId = ?').get(receiptId)
  if (!txn) return null
  const items = db
    .prepare(
      `
    SELECT m.ProductId, p.Name as ProductName, p.Unit, m.StockBatchId, m.UnitPrice, m.UnitCost,
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
// 💳 4. CREDIT & DEBT MANAGEMENT (🚀 REWRITTEN FOR INVOICES)
// ==========================================

export function getPendingCreditAccounts() {
  const db = getDb()
  // 🚀 FIX: No longer grouping by Customer. We return every individual unpaid invoice!
  return db
    .prepare(
      `
    SELECT 
      ReceiptId,
      TransactionDate,
      CustomerName,
      TotalAmount as TotalCredit,
      PaidAmount as TotalPaid,
      (TotalAmount - PaidAmount) as TotalPending
    FROM SalesTransactions
    WHERE IsCredit = 1 
      AND Status IN (1, 2) 
      AND (TotalAmount - PaidAmount) > 0
    ORDER BY TransactionDate DESC
  `
    )
    .all()
}

// 🚀 FIX: Renamed the internal parameter to receiptId to apply payment to ONE exact bill.
export function processCreditPayment(receiptId: string, amountToPay: number) {
  const db = getDb()

  const payTxn = db.transaction((rId, amount) => {
    // 1. Double check the specific bill
    const bill: any = db
      .prepare('SELECT TotalAmount, PaidAmount FROM SalesTransactions WHERE ReceiptId = ?')
      .get(rId)
    if (!bill) throw new Error('Invoice not found!')

    // 2. Safely apply payment and perfectly calculate new Status (0 = Fully Paid, 2 = Partially Paid)
    db.prepare(
      `
      UPDATE SalesTransactions 
      SET PaidAmount = PaidAmount + ?, 
          Status = CASE WHEN PaidAmount + ? >= TotalAmount THEN 0 ELSE 2 END
      WHERE ReceiptId = ?
    `
    ).run(amount, amount, rId)
  })

  payTxn(receiptId, amountToPay)
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
    SELECT m.Id, m.Date, m.Type, m.Quantity, m.UnitPrice, m.UnitCost, m.Note, m.Reason, m.IsVoided, m.ReceiptId, p.Name as ProductName, p.Unit
    FROM StockMovements m
    JOIN Products p ON m.ProductId = p.Id
    WHERE date(m.Date, 'localtime') BETWEEN date(?) AND date(?)
      AND (m.Type IN (3, 4) OR m.IsVoided = 1)
    ORDER BY m.Date DESC
  `
    )
    .all(startDate, endDate)
}
