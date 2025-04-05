import React from 'react'
import { Package, Check, X, Clock, Edit, Trash2 } from 'lucide-react'
import { PurchaseOrder } from '../types'
import { formatDate } from '../utils/format'

interface PurchaseCardProps {
  order: PurchaseOrder
  onEdit: () => void
  onDelete: () => void
}

const statusIcons = {
  pending: <Clock className="text-yellow-500" />,
  completed: <Check className="text-green-500" />,
  cancelled: <X className="text-red-500" />
}

const PurchaseCard: React.FC<PurchaseCardProps> = ({ order, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold">Orden #{order.id.slice(0, 8)}</h3>
        <div className="flex items-center gap-1">
          {statusIcons[order.status]}
          <span className="text-sm capitalize">{order.status}</span>
        </div>
      </div>
      
      <div className="text-sm text-gray-600 space-y-1">
        <p>Proveedor: {order.supplierId.slice(0, 8)}...</p>
        <p>Fecha: {formatDate(order.date)}</p>
        <p className="flex items-center">
          <Package className="mr-1" size={14} />
          {order.items.length} items
        </p>
        <p className="font-medium">Total: ${order.total.toFixed(2)}</p>
      </div>

      <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
        <button 
          onClick={onEdit}
          className="text-blue-600 hover:text-blue-800"
          title="Editar"
        >
          <Edit size={18} />
        </button>
        <button 
          onClick={onDelete}
          className="text-red-600 hover:text-red-800"
          title="Eliminar"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  )
}

export default PurchaseCard
