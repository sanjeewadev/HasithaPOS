import { getDb } from '../database'

export function getAllProducts() {
  // We join the category name here so React doesn't have to do it!
  return getDb()
    .prepare(
      `
    SELECT p.*, c.Name as CategoryName 
    FROM Products p 
    LEFT JOIN Categories c ON p.CategoryId = c.Id 
    WHERE p.IsActive = 1
  `
    )
    .all()
}

export function addProduct(product: any) {
  const stmt = getDb().prepare(`
    INSERT INTO Products (Name, Barcode, Description, Unit, CategoryId, BuyingPrice, SellingPrice, DiscountLimit, Quantity, IsActive)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `)
  return stmt.run(
    product.Name,
    product.Barcode,
    product.Description,
    product.Unit,
    product.CategoryId,
    product.BuyingPrice,
    product.SellingPrice,
    product.DiscountLimit,
    product.Quantity || 0
  )
}

export function updateProduct(product: any) {
  // VULNERABILITY FIX: We intentionally IGNORE Quantity here, just like in your C# code!
  const stmt = getDb().prepare(`
    UPDATE Products 
    SET Name = ?, Barcode = ?, Description = ?, Unit = ?, CategoryId = ?, BuyingPrice = ?, SellingPrice = ?, DiscountLimit = ?, IsActive = ? 
    WHERE Id = ?
  `)
  return stmt.run(
    product.Name,
    product.Barcode,
    product.Description,
    product.Unit,
    product.CategoryId,
    product.BuyingPrice,
    product.SellingPrice,
    product.DiscountLimit,
    product.IsActive ? 1 : 0,
    product.Id
  )
}

export function deleteProduct(id: number) {
  // SOFT DELETE: Mangle the barcode and hide it
  const timestamp = new Date().getTime()
  return getDb()
    .prepare(
      `
    UPDATE Products 
    SET IsActive = 0, Barcode = Barcode || '_DEL_' || ? 
    WHERE Id = ?
  `
    )
    .run(timestamp, id)
}
