import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { X } from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id'> | InventoryItem) => void;
  itemToEdit?: InventoryItem | null;
}

// Define some example categories
const categories = ["Medicamentos", "Alimentos", "Accesorios", "Higiene", "Vacunas", "General"];

const InventoryModal: React.FC<InventoryModalProps> = ({ isOpen, onClose, onSave, itemToEdit }) => {
  const [formData, setFormData] = useState<Omit<InventoryItem, 'id' | 'unit' | 'price' | 'supplier' | 'description'>>({
    name: '',
    category: categories[0], // Default to the first category
    quantity: 0,
    minimumQuantity: 0,
    expiryDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (itemToEdit) {
      setFormData({
        name: itemToEdit.name,
        category: itemToEdit.category || categories[0],
        quantity: itemToEdit.quantity,
        minimumQuantity: itemToEdit.minimumQuantity || 0,
        expiryDate: itemToEdit.expiryDate || '',
      });
      setErrors({}); // Clear errors when loading item
    } else {
      // Reset form for new item
      setFormData({
        name: '',
        category: categories[0],
        quantity: 0,
        minimumQuantity: 0,
        expiryDate: '',
      });
      setErrors({});
    }
  }, [itemToEdit, isOpen]); // Depend on isOpen to reset form when opened for 'new'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
    // Clear specific error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio.';
    }
    if (formData.quantity < 0) {
      newErrors.quantity = 'La cantidad no puede ser negativa.';
    }
     if (formData.minimumQuantity !== undefined && formData.minimumQuantity < 0) {
      newErrors.minimumQuantity = 'La cantidad mínima no puede ser negativa.';
    }
    // Basic date validation (YYYY-MM-DD) - consider a library for robust validation
    if (formData.expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(formData.expiryDate)) {
       newErrors.expiryDate = 'Formato de fecha inválido (AAAA-MM-DD).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const itemData = {
      ...formData,
      // Add back potentially omitted fields if needed, or handle in service
      unit: itemToEdit?.unit || 'unidades', // Default or keep existing
      price: itemToEdit?.price || 0, // Default or keep existing
      description: itemToEdit?.description || '', // Default or keep existing
    };


    if (itemToEdit) {
      onSave({ ...itemData, id: itemToEdit.id });
    } else {
      onSave(itemData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">{itemToEdit ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nombre del Producto</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${errors.quantity ? 'border-red-500' : 'border-gray-300'}`}
                />
                 {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
              </div>
              <div>
                <label htmlFor="minimumQuantity" className="block text-sm font-medium text-gray-700 mb-1">Cantidad Mínima</label>
                <input
                  type="number"
                  id="minimumQuantity"
                  name="minimumQuantity"
                  value={formData.minimumQuantity}
                  onChange={handleChange}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${errors.minimumQuantity ? 'border-red-500' : 'border-gray-300'}`}
                />
                 {errors.minimumQuantity && <p className="text-red-500 text-xs mt-1">{errors.minimumQuantity}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento (Opcional)</label>
              <input
                type="date" // Use type="date" for better UX
                id="expiryDate"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${errors.expiryDate ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="AAAA-MM-DD"
              />
               {errors.expiryDate && <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>}
            </div>

          </div>
          <div className="flex justify-end p-4 border-t bg-gray-50 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryModal;
