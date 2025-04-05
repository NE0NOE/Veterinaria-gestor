import { v4 as uuidv4 } from 'uuid'
import { InventoryItem } from '../types'

const INVENTORY_STORAGE_KEY = 'inventoryItems'

// Helper function to get items from localStorage
const getInventoryItems = (): InventoryItem[] => {
  const itemsJson = localStorage.getItem(INVENTORY_STORAGE_KEY)
  if (!itemsJson) return []
  try {
    // Add basic validation or migration logic if needed in the future
    return JSON.parse(itemsJson) as InventoryItem[]
  } catch (e) {
    console.error("Error parsing inventory items from localStorage", e)
    return [] // Return empty array on parsing error
  }
}

// Helper function to save items to localStorage
const saveInventoryItems = (items: InventoryItem[]) => {
  try {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items))
  } catch (e) {
     console.error("Error saving inventory items to localStorage", e)
     // Handle potential storage errors (e.g., quota exceeded)
  }
}

// --- CRUD Operations ---

export const getAllInventoryItems = (): InventoryItem[] => {
  return getInventoryItems()
}

export const getInventoryItemById = (id: string): InventoryItem | undefined => {
  const items = getInventoryItems()
  return items.find(item => item.id === id)
}

export const addInventoryItem = (itemData: Omit<InventoryItem, 'id'>): InventoryItem => {
  const items = getInventoryItems()
  const newItem: InventoryItem = {
    id: uuidv4(),
    name: itemData.name,
    quantity: itemData.quantity,
    unit: itemData.unit || 'unidades', // Ensure unit has a default
    price: itemData.price || 0, // Ensure price has a default
    category: itemData.category,
    minimumQuantity: itemData.minimumQuantity,
    expiryDate: itemData.expiryDate,
    description: itemData.description, // Include optional fields
    supplier: itemData.supplier,
  }
  const updatedItems = [...items, newItem]
  saveInventoryItems(updatedItems)
  return newItem
}

export const updateInventoryItem = (id: string, updates: Partial<Omit<InventoryItem, 'id'>>): InventoryItem | undefined => {
  const items = getInventoryItems()
  const itemIndex = items.findIndex(item => item.id === id)

  if (itemIndex === -1) {
    console.warn(`Inventory item with id ${id} not found for update.`)
    return undefined // Item not found
  }

  // Create the updated item ensuring all fields are considered
  const updatedItem: InventoryItem = {
    ...items[itemIndex], // Start with the existing item
    ...updates,         // Apply updates
    id: items[itemIndex].id // Ensure ID is not changed by updates
   };

  // Ensure numeric fields are numbers
  updatedItem.quantity = Number(updatedItem.quantity) || 0;
  updatedItem.price = Number(updatedItem.price) || 0;
  if (updatedItem.minimumQuantity !== undefined) {
      updatedItem.minimumQuantity = Number(updatedItem.minimumQuantity) || 0;
  }


  items[itemIndex] = updatedItem
  saveInventoryItems(items)
  return updatedItem
}

export const deleteInventoryItem = (id: string): boolean => {
  const items = getInventoryItems()
  const initialLength = items.length
  const updatedItems = items.filter(item => item.id !== id)

  if (updatedItems.length < initialLength) {
    saveInventoryItems(updatedItems)
    return true // Deletion successful
  } else {
    console.warn(`Inventory item with id ${id} not found for deletion.`)
    return false // Item not found
  }
}
