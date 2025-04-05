import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { InventoryItem } from '../types';
import * as inventoryService from '../services/inventoryService';
import InventoryCard from '../components/InventoryCard';
import InventoryModal from '../components/InventoryModal';

const Inventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Fetch items
  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = () => {
     setIsLoading(true);
     setError(null);
    try {
      const fetchedItems = inventoryService.getAllInventoryItems();
      setItems(fetchedItems);
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setError("No se pudo cargar el inventario.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleOpenModal = (item: InventoryItem | null = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null); // Clear editing item on close
  };

 const handleSaveItem = (itemData: Omit<InventoryItem, 'id'> | InventoryItem) => {
    setError(null); // Clear previous errors
    try {
      let savedItem;
      if ('id' in itemData) {
        // Editing existing item
        savedItem = inventoryService.updateInventoryItem(itemData.id, itemData);
        if (savedItem) {
          setItems(items.map(item => item.id === savedItem!.id ? savedItem : item));
        } else {
           setError(`No se pudo actualizar el artículo con ID: ${itemData.id}.`);
           return; // Prevent closing modal if save failed
        }
      } else {
        // Adding new item
        // Ensure required fields from the modal are present
        const newItemData: Omit<InventoryItem, 'id'> = {
          name: itemData.name,
          quantity: itemData.quantity,
          unit: 'unidades', // Default or get from form if added back
          price: 0, // Default or get from form if added back
          category: itemData.category,
          minimumQuantity: itemData.minimumQuantity,
          expiryDate: itemData.expiryDate,
          // Add other fields like description, supplier if they exist in itemData
        };
        savedItem = inventoryService.addInventoryItem(newItemData);
        setItems([...items, savedItem]);
      }
       handleCloseModal(); // Close modal on successful save
    } catch (err) {
      console.error("Error saving item:", err);
      setError(`No se pudo guardar el artículo. ${err instanceof Error ? err.message : ''}`);
      // Keep modal open if there's an error
    }
  };


  const handleDeleteItem = (id: string) => {
     setError(null);
    if (window.confirm('¿Estás seguro de que quieres eliminar este artículo?')) {
      try {
        const success = inventoryService.deleteInventoryItem(id);
        if (success) {
          setItems(items.filter(item => item.id !== id));
        } else {
          setError("No se pudo encontrar o eliminar el artículo.");
        }
      } catch (err) {
        console.error("Error deleting item:", err);
        setError("No se pudo eliminar el artículo.");
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-3xl font-bold text-gray-800">Inventario</h1>
           <p className="text-sm text-gray-500">Control de medicamentos e insumos</p>
        </div>
        <button
          onClick={() => handleOpenModal()} // Open modal for new item
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded inline-flex items-center transition duration-150 ease-in-out"
        >
          <Plus size={18} className="mr-2" />
          Nuevo Producto
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      {isLoading ? (
        <p className="text-center text-gray-500">Cargando inventario...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-10">
            <p className="text-gray-500">No hay artículos en el inventario.</p>
            <button
                onClick={() => handleOpenModal()}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded inline-flex items-center transition duration-150 ease-in-out"
            >
                <Plus size={18} className="mr-2" />
                Añadir Primer Producto
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              onEdit={() => handleOpenModal(item)} // Pass item to edit
              onDelete={handleDeleteItem}
            />
          ))}
        </div>
      )}

      <InventoryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveItem}
        itemToEdit={editingItem}
      />
    </div>
  );
};

export default Inventory;
