import { v4 as uuidv4 } from 'uuid'
import { PurchaseOrder, Supplier } from '../types'

const SUPPLIERS_KEY = 'suppliers'
const PURCHASE_ORDERS_KEY = 'purchaseOrders'

// --- Suppliers CRUD ---
const getSuppliers = (): Supplier[] => {
  const data = localStorage.getItem(SUPPLIERS_KEY)
  return data ? JSON.parse(data) : []
}

const saveSuppliers = (suppliers: Supplier[]) => {
  localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers))
}

export const getAllSuppliers = (): Supplier[] => getSuppliers()

export const getSupplierById = (id: string): Supplier | undefined => {
  return getSuppliers().find(s => s.id === id)
}

export const addSupplier = (supplier: Omit<Supplier, 'id'>): Supplier => {
  const suppliers = getSuppliers()
  const newSupplier = { ...supplier, id: uuidv4() }
  saveSuppliers([...suppliers, newSupplier])
  return newSupplier
}

export const updateSupplier = (id: string, updates: Partial<Supplier>): Supplier | undefined => {
  const suppliers = getSuppliers()
  const index = suppliers.findIndex(s => s.id === id)
  if (index === -1) return undefined
  
  const updated = { ...suppliers[index], ...updates }
  suppliers[index] = updated
  saveSuppliers(suppliers)
  return updated
}

export const deleteSupplier = (id: string): boolean => {
  const suppliers = getSuppliers()
  const filtered = suppliers.filter(s => s.id !== id)
  if (suppliers.length === filtered.length) return false
  
  saveSuppliers(filtered)
  return true
}

// --- Purchase Orders CRUD ---
const getPurchaseOrders = (): PurchaseOrder[] => {
  const data = localStorage.getItem(PURCHASE_ORDERS_KEY)
  return data ? JSON.parse(data) : []
}

const savePurchaseOrders = (orders: PurchaseOrder[]) => {
  localStorage.setItem(PURCHASE_ORDERS_KEY, JSON.stringify(orders))
}

export const getAllPurchaseOrders = (): PurchaseOrder[] => getPurchaseOrders()

export const getPurchaseOrderById = (id: string): PurchaseOrder | undefined => {
  return getPurchaseOrders().find(o => o.id === id)
}

export const addPurchaseOrder = (order: Omit<PurchaseOrder, 'id' | 'createdAt' | 'total'>): PurchaseOrder => {
  const orders = getPurchaseOrders()
  const total = order.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const newOrder = { 
    ...order, 
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    total
  }
  savePurchaseOrders([...orders, newOrder])
  return newOrder
}

export const updatePurchaseOrderStatus = (id: string, status: PurchaseOrder['status']): boolean => {
  const orders = getPurchaseOrders()
  const index = orders.findIndex(o => o.id === id)
  if (index === -1) return false
  
  orders[index] = { 
    ...orders[index], 
    status,
    updatedAt: new Date().toISOString()
  }
  savePurchaseOrders(orders)
  return true
}
