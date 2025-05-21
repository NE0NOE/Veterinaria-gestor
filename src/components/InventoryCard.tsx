import React from 'react';
import { InventoryItem } from '../types';
import { Package, AlertTriangle, Calendar, Edit, Trash2 } from 'lucide-react';

interface InventoryCardProps {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

const InventoryCard: React.FC<InventoryCardProps> = ({ item, onEdit, onDelete }) => {
  const isLowStock = item.minimumQuantity !== undefined && item.quantity <= item.minimumQuantity;

  // Basic date formatting (consider a library for more robust formatting)
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Adjust for timezone offset to display the correct date
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
      return adjustedDate.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col justify-between transition-shadow hover:shadow-md">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{item.name}</h3>
          {item.category && (
            <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 text-xs font-medium px-2.5 py-0.5 rounded">
              {item.category}
            </span>
          )}
        </div>
        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
          <div className="flex items-center">
            <Package size={14} className="mr-2 text-gray-400 dark:text-gray-500" />
            <span>Cantidad: {item.quantity} {item.unit || ''}</span>
          </div>
          {item.minimumQuantity !== undefined && (
            <div className={`flex items-center ${isLowStock ? 'text-red-600 font-medium' : ''}`}>
              <AlertTriangle size={14} className={`mr-2 ${isLowStock ? 'text-red-500' : 'text-yellow-500'}`} />
              <span>{isLowStock ? 'Stock bajo' : `Mínimo: ${item.minimumQuantity}`}</span>
            </div>
          )}
          {item.expiryDate && (
            <div className="flex items-center">
              <Calendar size={14} className="mr-2 text-gray-400 dark:text-gray-500" />
              <span>Vence: {formatDate(item.expiryDate)}</span>
            </div>
          )}
           {/* Optionally display description or price if needed */}
           {/* <p className="text-xs text-gray-500 mt-1">{item.description}</p> */}
           {/* <p className="text-xs text-gray-500 mt-1">Precio: {item.price?.toFixed(2)} €</p> */}
        </div>
      </div>
      <div className="flex justify-end space-x-2 border-t dark:border-gray-700 pt-3 mt-3">
        <button
          onClick={() => onEdit(item)}
          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
          title="Editar"
        >
          <Edit size={18} />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
          title="Eliminar"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default InventoryCard;
