import React, { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import * as purchaseService from '../services/purchaseService'
import PurchaseCard from '../components/PurchaseCard'
import PurchaseModal from '../components/PurchaseModal'
import SupplierModal from '../components/SupplierModal'
import { PurchaseOrder, Supplier } from '../types'

const Purchases: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<PurchaseOrder | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setLoading(true)
    try {
      const ordersData = purchaseService.getAllPurchaseOrders()
      const suppliersData = purchaseService.getAllSuppliers()
      setOrders(ordersData)
      setSuppliers(suppliersData)
    } catch (err) {
      setError('Error al cargar datos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar esta orden?')) {
      setOrders(orders.filter(o => o.id !== id))
    }
  }

  const handleSaveOrder = (order: PurchaseOrder) => {
    if (currentOrder) {
      // TODO: Implement update
      setOrders(orders.map(o => o.id === order.id ? order : o))
    } else {
      setOrders([...orders, order])
    }
    setCurrentOrder(null)
  }

  const handleSaveSupplier = (supplier: Supplier) => {
    setSuppliers([...suppliers, supplier])
  }

  const getSupplierName = (id: string) => {
    const supplier = suppliers.find(s => s.id === id)
    return supplier ? supplier.name : 'Proveedor desconocido'
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Compras</h1>
          <p className="text-sm text-gray-500">Gestión de órdenes de compra</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSupplierModal(true)}
            className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded flex items-center"
          >
            <Plus size={18} className="mr-2" />
            Proveedor
          </button>
          <button
            onClick={() => {
              setCurrentOrder(null)
              setShowOrderModal(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center"
          >
            <Plus size={18} className="mr-2" />
            Nueva Orden
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500 mb-4">No hay órdenes registradas</p>
          <button
            onClick={() => setShowOrderModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center mx-auto"
          >
            <Plus size={18} className="mr-2" />
            Crear primera orden
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map(order => (
            <PurchaseCard
              key={order.id}
              order={order}
              onEdit={() => {
                setCurrentOrder(order)
                setShowOrderModal(true)
              }}
              onDelete={() => handleDelete(order.id)}
            />
          ))}
        </div>
      )}

      <PurchaseModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        order={currentOrder}
        onSave={handleSaveOrder}
      />

      <SupplierModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onSave={handleSaveSupplier}
      />
    </div>
  )
}

export default Purchases
