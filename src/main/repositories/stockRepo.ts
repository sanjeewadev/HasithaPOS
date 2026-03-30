// src/main/repositories/stockRepo.ts
import { getDb } from '../database'

// ==========================================
// 🚚 0. GOOD RECEIVE NOTE (GRN) MASTER PROCESSING
// ==========================================
export function processGRN(payload: any) {
  const db = getDb()

  const grnTxn = db.transaction((data) => {
    const { SupplierId, ReferenceNo, Items } = data

    // Calculate invoice total
    let totalAmount = 0
    for (const item of Items) {
      totalAmount += item.total
    }

    // 1. Create Purchase Invoice
    const insertInvoice = db
      .prepare(
        `
      INSERT INTO PurchaseInvoices (BillNumber, SupplierId, TotalAmount, Status) 
      VALUES (?, ?, ?, 1)
    `
      )
      .run(ReferenceNo, SupplierId, totalAmount)

    const invoiceId = insertInvoice.lastInsertRowid

    // 2. Prepare statements for high-speed looping
    const insertBatchStmt = db.prepare(`
      INSERT INTO StockBatches (ProductId, InitialQuantity, RemainingQuantity, CostPrice, SellingPrice, Discount, DiscountCode, PurchaseInvoiceId) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertMovementStmt = db.prepare(`
      INSERT INTO StockMovements (ProductId, Type, Quantity, UnitCost, UnitPrice, StockBatchId, ReceiptId) 
      VALUES (?, 1, ?, ?, ?, ?, ?)
    `)

    const updateProductStmt = db.prepare(`
      UPDATE Products 
      SET Quantity = Quantity + ?, 
          BuyingPrice = ?, 
          SellingPrice = ?, 
          DiscountLimit = ? 
      WHERE Id = ?
    `)

    // 3. Process every item in the GRN cart
    for (const item of Items) {
      const rnd = Math.floor(Math.random() * 9)
      const discountCode = `${rnd}${String(item.discountLimit).padStart(3, '0')}${rnd}`

      const batchResult = insertBatchStmt.run(
        item.productId,
        item.qty,
        item.qty,
        item.buyPrice,
        item.sellPrice,
        item.discountLimit,
        discountCode,
        invoiceId
      )
      const batchId = batchResult.lastInsertRowid

      insertMovementStmt.run(
        item.productId,
        item.qty,
        item.buyPrice,
        item.sellPrice,
        batchId,
        ReferenceNo
      )

      updateProductStmt.run(
        item.qty,
        item.buyPrice,
        item.sellPrice,
        item.discountLimit,
        item.productId
      )
    }
  })

  grnTxn(payload)
  return { success: true }
}

// ==========================================
// 🛒 1. THE CHECKOUT ENGINE
// ==========================================
export function processCompleteSale(transaction: any, movements: any[]) {
  const db = getDb()

  const checkoutTransaction = db.transaction((txn, movs) => {
    db.prepare(
      `INSERT INTO SalesTransactions (ReceiptId, TransactionDate, TotalAmount, PaidAmount, IsCredit, CustomerName, Status)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      txn.ReceiptId,
      txn.TransactionDate,
      txn.TotalAmount,
      txn.PaidAmount,
      txn.IsCredit ? 1 : 0,
      txn.CustomerName,
      txn.Status
    )

    const updateBatchStmt = db.prepare('UPDATE StockBatches SET RemainingQuantity = ? WHERE Id = ?')
    const updateProductStmt = db.prepare('UPDATE Products SET Quantity = ? WHERE Id = ?')
    const insertMovementStmt = db.prepare(`
      INSERT INTO StockMovements (Date, ProductId, Type, Quantity, UnitCost, UnitPrice, StockBatchId, Reason, IsVoided, Note, ReceiptId)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `)

    for (const move of movs) {
      const batch: any = db
        .prepare('SELECT RemainingQuantity FROM StockBatches WHERE Id = ?')
        .get(move.StockBatchId)
      if (!batch) throw new Error('Fatal Error: Source stock batch not found.')
      if (batch.RemainingQuantity < move.Quantity)
        throw new Error(`Cart out of sync! Only ${batch.RemainingQuantity} left.`)

      const product: any = db
        .prepare('SELECT Quantity FROM Products WHERE Id = ?')
        .get(move.ProductId)
      if (!product) throw new Error('Fatal Error: Product not found.')

      updateBatchStmt.run(batch.RemainingQuantity - move.Quantity, move.StockBatchId)
      updateProductStmt.run(product.Quantity - move.Quantity, move.ProductId)

      insertMovementStmt.run(
        new Date().toISOString(),
        move.ProductId,
        2,
        move.Quantity,
        move.UnitCost,
        move.UnitPrice,
        move.StockBatchId,
        move.Note || '',
        txn.ReceiptId
      )
    }
  })

  checkoutTransaction(transaction, movements)
}

// ==========================================
// 📦 2. INVENTORY MANAGEMENT
// ==========================================
export function receiveStock(movement: any) {
  const db = getDb()
  const receiveTxn = db.transaction((mov) => {
    const product: any = db
      .prepare('SELECT SellingPrice, DiscountLimit, Quantity FROM Products WHERE Id = ?')
      .get(mov.ProductId)
    if (!product) throw new Error('Product not found.')

    db.prepare('UPDATE Products SET Quantity = Quantity + ? WHERE Id = ?').run(
      mov.Quantity,
      mov.ProductId
    )
    db.prepare(
      `INSERT INTO StockMovements (Date, ProductId, Type, Quantity, UnitCost, UnitPrice, Reason, IsVoided) VALUES (?, ?, 1, ?, ?, ?, 0, 0)`
    ).run(mov.Date, mov.ProductId, mov.Quantity, mov.UnitCost, product.SellingPrice)

    const rnd = Math.floor(Math.random() * 9)
    const discountCode = `${rnd}${String(product.DiscountLimit).padStart(3, '0')}${rnd}`

    db.prepare(
      `INSERT INTO StockBatches (ProductId, InitialQuantity, RemainingQuantity, CostPrice, SellingPrice, Discount, DiscountCode, ReceivedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      mov.ProductId,
      mov.Quantity,
      mov.Quantity,
      mov.UnitCost,
      product.SellingPrice,
      product.DiscountLimit,
      discountCode,
      mov.Date
    )
  })
  receiveTxn(movement)
}

export function adjustStock(adjustment: any) {
  const db = getDb()
  const adjustTxn = db.transaction((adj) => {
    const batch: any = db
      .prepare('SELECT RemainingQuantity, CostPrice FROM StockBatches WHERE Id = ?')
      .get(adj.StockBatchId)
    if (!batch) throw new Error('Batch not found.')
    if (adj.Quantity > batch.RemainingQuantity)
      throw new Error(`Cannot remove ${adj.Quantity}. Only ${batch.RemainingQuantity} left.`)

    db.prepare(
      'UPDATE StockBatches SET RemainingQuantity = RemainingQuantity - ? WHERE Id = ?'
    ).run(adj.Quantity, adj.StockBatchId)
    db.prepare('UPDATE Products SET Quantity = MAX(0, Quantity - ?) WHERE Id = ?').run(
      adj.Quantity,
      adj.ProductId
    )

    const unitCost = adj.Reason === 0 ? 0 : batch.CostPrice
    db.prepare(
      `INSERT INTO StockMovements (ProductId, Type, Quantity, UnitCost, UnitPrice, StockBatchId, Reason, IsVoided, Note) VALUES (?, 3, ?, ?, 0, ?, ?, 0, ?)`
    ).run(adj.ProductId, adj.Quantity, unitCost, adj.StockBatchId, adj.Reason, adj.Note)
  })
  adjustTxn(adjustment)
}

// ==========================================
// 🔍 3. DATA RETRIEVAL
// ==========================================
export function getActiveBatches() {
  return getDb()
    .prepare(
      `
    SELECT b.*, p.Name as ProductName, p.Barcode 
    FROM StockBatches b
    JOIN Products p ON b.ProductId = p.Id
    WHERE b.RemainingQuantity > 0 
  `
    )
    .all()
}

export function getLowStockProducts(threshold: number) {
  return getDb()
    .prepare(
      `
    SELECT p.*, c.Name as CategoryName 
    FROM Products p
    JOIN Categories c ON p.CategoryId = c.Id
    WHERE p.Quantity <= ?
    ORDER BY p.Quantity ASC
  `
    )
    .all(threshold)
}

// 🚀 THE THREE MISSING GRN/BILLS QUERIES!
export function getSupplierInvoices(supplierId: number) {
  return getDb()
    .prepare('SELECT * FROM PurchaseInvoices WHERE SupplierId = ? ORDER BY Date DESC')
    .all(supplierId)
}

export function getInvoiceItems(invoiceId: number) {
  return getDb()
    .prepare(
      `
    SELECT b.*, p.Name as ProductName 
    FROM StockBatches b
    JOIN Products p ON b.ProductId = p.Id
    WHERE b.PurchaseInvoiceId = ?
  `
    )
    .all(invoiceId)
}

export function getProductBatches(productId: number) {
  return getDb()
    .prepare(
      `
    SELECT b.*, s.Name as SupplierName
    FROM StockBatches b
    LEFT JOIN PurchaseInvoices inv ON b.PurchaseInvoiceId = inv.Id
    LEFT JOIN Suppliers s ON inv.SupplierId = s.Id
    WHERE b.ProductId = ?
    ORDER BY b.ReceivedDate DESC
  `
    )
    .all(productId)
}

// ==========================================
// 🚨 4. SECURITY & VOID LOGIC
// ==========================================
export function voidReceipt(receiptId: string) {
  const db = getDb()

  const voidTxn = db.transaction((rId) => {
    // 1. Find the transaction
    const txn: any = db
      .prepare(
        'SELECT TransactionDate, Status, IsCredit, PaidAmount FROM SalesTransactions WHERE ReceiptId = ?'
      )
      .get(rId)

    if (!txn) throw new Error('Receipt not found.')
    if (txn.Status === 3) throw new Error('This receipt is already voided.')

    // 2. TIME LOCK: Only allow voids for TODAY
    const today = new Date().toISOString().split('T')[0]
    if (!txn.TransactionDate.startsWith(today)) {
      throw new Error(
        'You can only void sales from today. For older sales, please use the Returns page.'
      )
    }

    // 3. Block complex credit voids
    if (txn.IsCredit === 1 && txn.PaidAmount > 0) {
      throw new Error(
        'Cannot void a credit sale with partial payments. Please use the Returns page.'
      )
    }

    // 4. Block if items were already returned
    const hasReturns: any = db
      .prepare('SELECT COUNT(*) as count FROM StockMovements WHERE ReceiptId = ? AND Type = 4')
      .get(rId)
    if (hasReturns && hasReturns.count > 0) {
      throw new Error('Action Blocked: This bill already has returned items.')
    }

    // 5. THE FIX: Mark as Voided (Status = 3). NEVER DELETE!
    db.prepare('UPDATE SalesTransactions SET Status = 3 WHERE ReceiptId = ?').run(rId)

    // 6. Get all the items sold on this bill
    const movements: any[] = db
      .prepare('SELECT * FROM StockMovements WHERE ReceiptId = ? AND IsVoided = 0 AND Type = 2')
      .all(rId)

    const updateMoveStmt = db.prepare(
      "UPDATE StockMovements SET IsVoided = 1, Note = IFNULL(Note, '') || ' [VOIDED]' WHERE Id = ?"
    )
    const updateProdStmt = db.prepare('UPDATE Products SET Quantity = Quantity + ? WHERE Id = ?')
    const updateBatchStmt = db.prepare(
      'UPDATE StockBatches SET RemainingQuantity = RemainingQuantity + ? WHERE Id = ?'
    )

    // 7. Put all items safely back into stock
    for (const move of movements) {
      updateMoveStmt.run(move.Id)
      updateProdStmt.run(move.Quantity, move.ProductId)
      if (move.StockBatchId) updateBatchStmt.run(move.Quantity, move.StockBatchId)
    }
  })

  // Run the transaction
  voidTxn(receiptId)
  return { success: true }
}

export function getProductAdjustments(productId: number) {
  // Type 3 means "Adjustment" in our system!
  return getDb()
    .prepare(
      `
    SELECT * FROM StockMovements 
    WHERE ProductId = ? AND Type = 3 
    ORDER BY Date DESC
  `
    )
    .all(productId)
}

// ==========================================
// 🔄 5. RETURNS ENGINE (Partial & Full)
// ==========================================

export function processReturn(payload: any) {
  const db = getDb()

  const returnTxn = db.transaction((data) => {
    const { ReceiptId, Items, RefundAmount } = data

    // 1. Prepare Statements
    const insertMovementStmt = db.prepare(`
      INSERT INTO StockMovements (Date, ProductId, Type, Quantity, UnitCost, UnitPrice, StockBatchId, Note, ReceiptId, IsVoided)
      VALUES (?, ?, 4, ?, ?, ?, ?, ?, ?, 0)
    `)

    const updateBatchStmt = db.prepare(`
      UPDATE StockBatches SET RemainingQuantity = RemainingQuantity + ? WHERE Id = ?
    `)

    const updateProductStmt = db.prepare(`
      UPDATE Products SET Quantity = Quantity + ? WHERE Id = ?
    `)

    // 2. Loop through items being returned
    for (const item of Items) {
      const timestamp = new Date().toISOString()

      // Add the "Return" movement (Type 4)
      insertMovementStmt.run(
        timestamp,
        item.ProductId,
        item.Quantity, // How many they are bringing back
        item.UnitCost,
        item.UnitPrice,
        item.StockBatchId,
        item.Note || 'Customer Return',
        ReceiptId
      )

      // Put stock back in the batch
      updateBatchStmt.run(item.Quantity, item.StockBatchId)

      // Update main product total
      updateProductStmt.run(item.Quantity, item.ProductId)
    }

    // 3. Financial Adjustment (Optional: You can add logic here to update SalesTransactions
    // if you want to track total "RefundedAmount" on the bill record)
  })

  returnTxn(payload)
  return { success: true }
}
