import { v4 as uuidv4 } from 'uuid'

export interface InventoryItem {
  id: string
  name: string
  quantity: number
  unit: string
  price: number
  category: string
  minimumQuantity?: number
  expiryDate?: string
  description?: string
  supplier?: string
}
// En src/types.ts (o donde tengas tus tipos)
export type Permission = 'admin' | 'cliente' | 'veterinario' | 'asistente' | 'appointments' | 'pets' | 'patients' | 'inventory' | 'purchases' | 'users';

export interface Supplier {
  id: string
  name: string
  contact: string
  phone: string
  email?: string
  address?: string
  taxId?: string
  notes?: string
}

export interface PurchaseItem {
  inventoryItemId: string
  quantity: number
  unitPrice: number
}

export interface PurchaseOrder {
  id: string
  supplierId: string
  date: string
  items: PurchaseItem[]
  status: 'pending' | 'completed' | 'cancelled'
  total: number
  notes?: string
  createdAt: string
  updatedAt?: string
}
