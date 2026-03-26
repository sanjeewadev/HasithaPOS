import { getDb } from '../database'

export function getAllSuppliers() {
  return getDb().prepare('SELECT * FROM Suppliers ORDER BY Name ASC').all()
}

export function addSupplier(supplier: any) {
  return getDb()
    .prepare('INSERT INTO Suppliers (Name, Phone, Note) VALUES (?, ?, ?)')
    .run(supplier.Name, supplier.Phone, supplier.Note)
}

export function updateSupplier(supplier: any) {
  return getDb()
    .prepare('UPDATE Suppliers SET Name = ?, Phone = ?, Note = ? WHERE Id = ?')
    .run(supplier.Name, supplier.Phone, supplier.Note, supplier.Id)
}

export function deleteSupplier(id: number) {
  return getDb().prepare('DELETE FROM Suppliers WHERE Id = ?').run(id)
}
