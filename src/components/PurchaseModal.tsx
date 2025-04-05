import React, { useState, useEffect } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import { PurchaseOrder, Supplier, InventoryItem } from '../types'
import * as purchaseService from '../services/purchaseService'
import * as inventoryService from '../services/inventoryService'
import { formatDate } from '../utils/format'

interface PurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  order?: PurchaseOrder
  onSave: (order: PurchaseOrder) => void
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ isOpen, onClose, order, onSave }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [formData, setFormData] = useState<Omit<PurchaseOrder, 'id' | 'createdAt' | 'total'>>({
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    status: 'pending',
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      loadSuppliers()
      loadInventory()
      if (order) {
        setFormData({
          supplierId: order.supplierId,
          date: order.date,
          items: order.items,
          status: order.status,
          notes: order.notes || ''
        })
      } else {
        setFormData({
          supplierId: '',
          date: new Date().toISOString().split('T')[0],
          items: [],
          status: 'pending',
          notes: ''
        })
      }
    }
  }, [isOpen, order])

  const loadSuppliers = () => {
    const data = purchaseService.getAllSuppliers()
    setSuppliers(data)
  }

  const loadInventory = () => {
    const data = inventoryService.getAllInventoryItems()
    setInventoryItems(data)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (order) {
      // TODO: Implement update
    } else {
      const newOrder = purchaseService.addPurchaseOrder(formData)
      onSave(newOrder)
    }
    onClose()
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        inventoryItemId: '',
        quantity: 1,
        unitPrice: 0
      }]
    })
  }

  const removeItem = (index: number) => {
    const newItems = [...formData.items]
    newItems.splice(index, 1)
    setFormData({
      ...formData,
      items: newItems
    })
  }

  const updateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setFormData({
      ...formData,
      items: newItems
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-lg font-semibold">
            {order ? 'Editar Orden' : 'Nueva Orden de Compra'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor
              </label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Seleccionar proveedor</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Artículos
            </label>
            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select
                      value={item.inventoryItemId}
                      onChange={(e) => updateItem(index, 'inventoryItemId', e.target.value)}
                      className="w-full p-2 border rounded"
                      required
                    >
                      <option value="">Seleccionar artículo</option>
                      {inventoryItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value))}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Minus size={18} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addItem}
                className="flex items-center text-blue-600 hover:text-blue-800 text-sm mt-2"
              >
                <Plus size={16} className="mr-1" />
                Agregar artículo
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PurchaseModal
