import { getDb } from '../database'

// ==========================================
// 🛒 1. THE CHECKOUT ENGINE (With Strict Transactions)
// ==========================================
export function processCompleteSale(transaction: any, movements: any[]) {
  const db = getDb()

  // We wrap the entire checkout process in a database transaction.
  // If anything throws an error, SQLite automatically rolls back ALL changes.
  const checkoutTransaction = db.transaction((txn, movs) => {
    // 1. Insert the Receipt
    db.prepare(
      `
      INSERT INTO SalesTransactions (ReceiptId, TransactionDate, TotalAmount, PaidAmount, IsCredit, CustomerName, Status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      txn.ReceiptId,
      txn.TransactionDate,
      txn.TotalAmount,
      txn.PaidAmount,
      txn.IsCredit ? 1 : 0,
      txn.CustomerName,
      txn.Status
    )

    // 2. Process every item in the cart
    const updateBatchStmt = db.prepare('UPDATE StockBatches SET RemainingQuantity = ? WHERE Id = ?')
    const updateProductStmt = db.prepare('UPDATE Products SET Quantity = ? WHERE Id = ?')
    const insertMovementStmt = db.prepare(`
      INSERT INTO StockMovements (Date, ProductId, Type, Quantity, UnitCost, UnitPrice, StockBatchId, Reason, IsVoided, Note, ReceiptId)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `)

    for (const move of movs) {
      // Security Check 1: Verify Batch Stock
      const batch: any = db
        .prepare('SELECT RemainingQuantity FROM StockBatches WHERE Id = ?')
        .get(move.StockBatchId)
      if (!batch) throw new Error('Fatal Error: Source stock batch not found.')
      if (batch.RemainingQuantity < move.Quantity) {
        throw new Error(
          `Cart out of sync! Only ${batch.RemainingQuantity} left in batch, but you tried to sell ${move.Quantity}.`
        )
      }

      // Security Check 2: Verify Product Stock
      const product: any = db
        .prepare('SELECT Quantity FROM Products WHERE Id = ?')
        .get(move.ProductId)
      if (!product) throw new Error('Fatal Error: Product catalog entry not found.')
      if (product.Quantity < move.Quantity) {
        throw new Error(`Cart out of sync! Total product stock is only ${product.Quantity}.`)
      }

      // Deduct Inventory
      updateBatchStmt.run(batch.RemainingQuantity - move.Quantity, move.StockBatchId)
      updateProductStmt.run(product.Quantity - move.Quantity, move.ProductId)

      // Log the Movement
      insertMovementStmt.run(
        new Date().toISOString(),
        move.ProductId,
        2, // 2 = Out
        move.Quantity,
        move.UnitCost,
        move.UnitPrice,
        move.StockBatchId,
        move.Note || '',
        txn.ReceiptId
      )
    }
  })

  // Execute the transaction!
  checkoutTransaction(transaction, movements)
}

// ==========================================
// 📦 2. INVENTORY MANAGEMENT (GRN & Adjustments)
// ==========================================
export function receiveStock(movement: any) {
  const db = getDb()
  const receiveTxn = db.transaction((mov) => {
    const product: any = db
      .prepare('SELECT SellingPrice, DiscountLimit, Quantity FROM Products WHERE Id = ?')
      .get(mov.ProductId)
    if (!product) throw new Error('Product not found.')

    // 1. Add to Product Total
    db.prepare('UPDATE Products SET Quantity = Quantity + ? WHERE Id = ?').run(
      mov.Quantity,
      mov.ProductId
    )

    // 2. Log Movement
    db.prepare(
      `
      INSERT INTO StockMovements (Date, ProductId, Type, Quantity, UnitCost, UnitPrice, Reason, IsVoided)
      VALUES (?, ?, 1, ?, ?, ?, 0, 0)
    `
    ).run(mov.Date, mov.ProductId, mov.Quantity, mov.UnitCost, product.SellingPrice)

    // 3. Create Batch
    const rnd = Math.floor(Math.random() * 9)
    const discountCode = `${rnd}${String(product.DiscountLimit).padStart(3, '0')}${rnd}`

    db.prepare(
      `
      INSERT INTO StockBatches (ProductId, InitialQuantity, RemainingQuantity, CostPrice, SellingPrice, Discount, DiscountCode, ReceivedDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
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

    const product: any = db.prepare('SELECT Quantity FROM Products WHERE Id = ?').get(adj.ProductId)

    // Deduct
    db.prepare(
      'UPDATE StockBatches SET RemainingQuantity = RemainingQuantity - ? WHERE Id = ?'
    ).run(adj.Quantity, adj.StockBatchId)
    db.prepare('UPDATE Products SET Quantity = MAX(0, Quantity - ?) WHERE Id = ?').run(
      adj.Quantity,
      adj.ProductId
    )

    // Log
    const unitCost = adj.Reason === 0 ? 0 : batch.CostPrice // 0 = Correction
    db.prepare(
      `
      INSERT INTO StockMovements (ProductId, Type, Quantity, UnitCost, UnitPrice, StockBatchId, Reason, IsVoided, Note)
      VALUES (?, 3, ?, ?, 0, ?, ?, 0, ?)
    `
    ).run(adj.ProductId, adj.Quantity, unitCost, adj.StockBatchId, adj.Reason, adj.Note)
  })

  adjustTxn(adjustment)
}

// ==========================================
// 🔍 3. DATA RETRIEVAL (The "Include" Queries)
// ==========================================
export function getActiveBatches() {
  return getDb()
    .prepare(
      `
    SELECT b.*, p.Name as ProductName, p.Barcode 
    FROM StockBatches b
    JOIN Products p ON b.ProductId = p.Id
    WHERE b.RemainingQuantity > 0 
    -- Note: Add Invoice status check here later if needed
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

// ==========================================
// 🚨 4. SECURITY & VOID LOGIC
// ==========================================
export function voidReceipt(receiptId: string) {
  const db = getDb()
  const voidTxn = db.transaction((rId) => {
    // 1. Security Check: Partial Payments
    const txn: any = db
      .prepare('SELECT IsCredit, PaidAmount FROM SalesTransactions WHERE ReceiptId = ?')
      .get(rId)
    if (txn && txn.IsCredit === 1 && txn.PaidAmount > 0) {
      throw new Error('Cannot void a credit sale that already has partial payments. Use Returns.')
    }

    // 2. Security Check: Returns Exist
    const hasReturns: any = db
      .prepare('SELECT COUNT(*) as count FROM StockMovements WHERE ReceiptId = ? AND Type = 4')
      .get(rId)
    if (hasReturns && hasReturns.count > 0) {
      throw new Error(
        'Action Blocked: This receipt contains Returned items. Voiding it now would corrupt the database.'
      )
    }

    // 3. Delete the Transaction
    db.prepare('DELETE FROM SalesTransactions WHERE ReceiptId = ?').run(rId)

    // 4. Find all Outbound Movements and reverse them
    const movements: any[] = db
      .prepare('SELECT * FROM StockMovements WHERE ReceiptId = ? AND IsVoided = 0 AND Type = 2')
      .all(rId)

    const updateMoveStmt = db.prepare(
      "UPDATE StockMovements SET IsVoided = 1, Note = Note || ' [VOIDED]' WHERE Id = ?"
    )
    const updateProdStmt = db.prepare('UPDATE Products SET Quantity = Quantity + ? WHERE Id = ?')
    const updateBatchStmt = db.prepare(
      'UPDATE StockBatches SET RemainingQuantity = RemainingQuantity + ? WHERE Id = ?'
    )

    for (const move of movements) {
      updateMoveStmt.run(move.Id)
      updateProdStmt.run(move.Quantity, move.ProductId)
      if (move.StockBatchId) {
        updateBatchStmt.run(move.Quantity, move.StockBatchId)
      }
    }
  })

  voidTxn(receiptId)
}
