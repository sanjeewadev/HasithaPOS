import { getDb } from '../database'

export function getAllCategories() {
  return getDb().prepare('SELECT * FROM Categories').all()
}

export function addCategory(category: any) {
  return getDb()
    .prepare('INSERT INTO Categories (Name, ParentId) VALUES (?, ?)')
    .run(category.Name, category.ParentId || null)
}

export function updateCategory(category: any) {
  return getDb()
    .prepare('UPDATE Categories SET Name = ?, ParentId = ? WHERE Id = ?')
    .run(category.Name, category.ParentId || null, category.Id)
}

export function deleteCategory(id: number) {
  return getDb().prepare('DELETE FROM Categories WHERE Id = ?').run(id)
}
