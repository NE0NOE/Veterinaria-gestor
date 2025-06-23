import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import {
  Package, Pill, Box, TrendingUp, BarChart2, Loader2, AlertCircle,
  CheckCircle, XCircle, Tag, Calendar, Truck, PlusCircle, Edit, Search,
  ChevronLeft, ChevronRight, EyeOff, ClipboardList, TrendingDown, PackageX, FlaskConical,
  Wrench,
} from 'lucide-react';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- Definiciones de Tipos ---

interface MedicamentoCatalogo {
  id_medicamento: number;
  nombre_generico: string;
  nombre_comercial: string | null;
  principio_activo: string | null;
  presentacion: string | null;
  dosis_recomendada: string | null;
  fabricante: string | null;
  unidad_medida: string | null;
  precio_venta: number | null;
  categoria: string | null;
  sustancia_controlada: boolean | null;
}

interface SuministroCatalogo {
  id_suministro: number;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  unidad_medida: string | null;
}

interface InventarioItemRaw {
  id_stock: number;
  tipo_item: 'medicamento' | 'suministro';
  id_referencia_item: number;
  cantidad: number;
  ubicacion: string | null;
  ultima_actualizacion: string; // ISO string
  lote: string | null;
  fecha_caducidad_lote: string | null; // Date string (YYYY-MM-DD)
}

interface InventarioItem extends InventarioItemRaw {
  nombre_item: string;
  categoria_medicamento?: string | null; // Added for chart logic
  categoria_suministro?: string | null;
  unidad_display?: string | null;
  vencimiento_display?: string | null;
  precio_venta?: number | null;
}

// --- Colores para los gráficos ---
const PIE_COLORS = ['#8884d8', '#4CAF50', '#FFC107', '#2196F3', '#FF5722', '#673AB7', '#00BCD4', '#FFEB3B'];

const InventarioPage: React.FC = () => {
  const navigate = useNavigate(); // Initialize useNavigate

  // Main data states
  const [medicamentosCatalogo, setMedicamentosCatalogo] = useState<MedicamentoCatalogo[]>([]);
  const [suministrosCatalogo, setSuministrosCatalogo] = useState<SuministroCatalogo[]>([]);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);

  // Loading and message states
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // For add/edit/dispatch operations
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // States for management modals (add/edit stock)
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventarioItem | null>(null);
  const [formItem, setFormItem] = useState<{
    id_stock: number;
    tipo_item: 'medicamento' | 'suministro' | '';
    id_referencia_item: number | null; // Changed to number for direct assignment
    cantidad: number;
    ubicacion: string;
    lote: string;
    fecha_caducidad_lote: string;
  }>({
    id_stock: 0,
    tipo_item: '' as 'medicamento' | 'suministro' | '',
    id_referencia_item: null,
    cantidad: 0,
    ubicacion: '',
    lote: '',
    fecha_caducidad_lote: '',
  });

  // States for dispatch modal
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [itemToDispatch, setItemToDispatch] = useState<InventarioItem | null>(null);
  const [dispatchQuantity, setDispatchQuantity] = useState<number>(1);

  // States for chart data (derived from inventario)
  const [dataPorTipo, setDataPorTipo] = useState<any[]>([]);
  const [dataPorCategoriaSuministros, setDataPorCategoriaSuministros] = useState<any[]>([]);
  const [dataVencimientoMedicamentos, setDataVencimientoMedicamentos] = useState<any[]>([]);

  // States for search and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState(''); // 'medicamento' or 'suministro'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const LOW_STOCK_THRESHOLD = 10;

  // New states for the initial choice modal and new catalog item modals
  const [showAddEditItemChoiceModal, setShowAddEditItemChoiceModal] = useState(false); // New choice modal
  const [showNewMedicineModal, setShowNewMedicineModal] = useState(false);
  const [newMedicine, setNewMedicine] = useState<Omit<MedicamentoCatalogo, 'id_medicamento'>>({
    nombre_generico: '', nombre_comercial: null, principio_activo: null, presentacion: null,
    dosis_recomendada: null, fabricante: null, unidad_medida: null, precio_venta: null,
    categoria: null, sustancia_controlada: false,
  });
  const [showNewSuministroModal, setShowNewSuministroModal] = useState(false);
  const [newSuministro, setNewSuministro] = useState<Omit<SuministroCatalogo, 'id_suministro'>>({
    nombre: '', descripcion: null, categoria: null, unidad_medida: null,
  });


  /**
   * Displays a success message that fades out.
   * @param message The success message to display.
   */
  const showSuccess = useCallback((message: string) => {
    setSuccess(message);
    setError(null);
    setTimeout(() => setSuccess(null), 5000);
  }, []);

  /**
   * Displays an error message that fades out.
   * @param message The error message to display.
   */
  const showError = useCallback((message: string) => {
    setError(message);
    setSuccess(null);
    setTimeout(() => setError(null), 8000);
  }, []);

  /**
   * Clears all feedback messages.
   */
  const clearMessages = useCallback(() => {
    setSuccess(null);
    setError(null);
  }, []);

  /**
   * Prepares chart data based on linked inventory items.
   * @param linkedItems Inventory items already combined with catalog data.
   */
  const prepararDatosParaGraficos = useCallback((linkedItems: InventarioItem[]) => {
    // Data by Item Type (for PieChart)
    const tiposMap = new Map<string, number>();
    linkedItems.forEach(item => {
      tiposMap.set(item.tipo_item, (tiposMap.get(item.tipo_item) || 0) + item.cantidad);
    });
    setDataPorTipo(Array.from(tiposMap, ([name, value]) => ({ name, value })));

    // Data by Supply Category (for BarChart - only for supplies)
    const categoriasSuministrosMap = new Map<string, number>();
    linkedItems.filter(item => item.tipo_item === 'suministro').forEach(item => {
      const category = item.categoria_suministro || 'Sin Categoría';
      categoriasSuministrosMap.set(category, (categoriasSuministrosMap.get(category) || 0) + item.cantidad);
    });
    setDataPorCategoriaSuministros(Array.from(categoriasSuministrosMap, ([name, value]) => ({ name, value })));

    // Data for Medicines by Expiry Status (for BarChart)
    const vencimientoMap = new Map<string, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare only dates

    linkedItems.filter(item => item.tipo_item === 'medicamento').forEach(invMedItem => {
      if (invMedItem.fecha_caducidad_lote) {
        const expiryDate = new Date(invMedItem.fecha_caducidad_lote + 'T00:00:00');
        expiryDate.setHours(0, 0, 0, 0); // Reset time to compare only dates

        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days remaining

        let status = 'Vencidos';
        if (diffDays > 90) {
          status = 'Más de 90 días';
        } else if (diffDays > 30) {
          status = '30-90 días';
        } else if (diffDays > 0) {
          status = 'Menos de 30 días';
        }

        vencimientoMap.set(status, (vencimientoMap.get(status) || 0) + invMedItem.cantidad);
      } else {
        vencimientoMap.set('Sin Fecha', (vencimientoMap.get('Sin Fecha') || 0) + invMedItem.cantidad);
      }
    });
    setDataVencimientoMedicamentos(Array.from(vencimientoMap, ([name, value]) => ({ name, value })));
  }, []);

  /**
   * Processes and combines raw inventory data with catalog information.
   * Also sorts data and prepares charts.
   * @param meds Medicine catalog.
   * @param sums Supply catalog.
   * @param invItems Raw inventario_stock items.
   */
  const procesarYCombinarDatos = useCallback((
    meds: MedicamentoCatalogo[],
    sums: SuministroCatalogo[],
    invItems: InventarioItemRaw[]
  ) => {
    const linkedInventario: InventarioItem[] = invItems.map(item => {
      let nombre_item: string = 'Desconocido';
      let categoria_medicamento: string | null = null; // To store medicine category
      let categoria_suministro: string | null = null;
      let unidad_display: string | null = null;
      let vencimiento_display: string | null = null;
      let precio_venta: number | null = null;

      if (item.tipo_item === 'medicamento') {
        const med = meds.find(m => m.id_medicamento === item.id_referencia_item);
        if (med) {
          nombre_item = med.nombre_generico || med.nombre_comercial || 'Medicamento Desconocido';
          unidad_display = med.unidad_medida || null;
          precio_venta = med.precio_venta || null;
          categoria_medicamento = med.categoria || null; // Assign medicine category
        } else {
          nombre_item = `Medicamento Desconocido (ID: ${item.id_referencia_item})`;
        }
        if (item.fecha_caducidad_lote) {
          vencimiento_display = new Date(item.fecha_caducidad_lote + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'numeric', day: 'numeric' });
        }
      } else if (item.tipo_item === 'suministro') {
        const sum = sums.find(s => s.id_suministro === item.id_referencia_item);
        if (sum) {
          nombre_item = sum.nombre;
          categoria_suministro = sum.categoria || null;
          unidad_display = sum.unidad_medida || null;
        } else {
          nombre_item = `Suministro Desconocido (ID: ${item.id_referencia_item})`;
        }
      }

      return {
        ...item,
        nombre_item,
        categoria_medicamento, // Include the new property
        categoria_suministro,
        unidad_display,
        vencimiento_display,
        precio_venta,
      };
    });

    setInventario(linkedInventario.sort((a, b) => new Date(b.ultima_actualizacion).getTime() - new Date(a.ultima_actualizacion).getTime()));
    prepararDatosParaGraficos(linkedInventario);
  }, [prepararDatosParaGraficos]);

  /**
   * Loads all inventory related data (catalogs and stock) from Supabase.
   */
  const cargarDatosInventario = useCallback(async () => {
    setIsLoading(true);
    clearMessages();
    try {
      const { data: medData, error: medError } = await supabase.from('medicamentos').select('*');
      if (medError) throw medError;

      const { data: sumData, error: sumError } = await supabase.from('suministros').select('*');
      if (sumError) throw sumError;

      const { data: invData, error: invError } = await supabase.from('inventario_stock').select('*');
      if (invError) throw invError;

      setMedicamentosCatalogo(medData || []);
      setSuministrosCatalogo(sumData || []);
      procesarYCombinarDatos(medData || [], sumData || [], invData || []);
    } catch (err: any) {
      console.error('Error al cargar datos de inventario:', err);
      showError('Error al cargar datos de inventario: ' + err.message + '. Por favor, asegúrate de que las tablas estén configuradas y las políticas RLS adecuadas (SELECT para el rol actual).');
    } finally {
      setIsLoading(false);
    }
  }, [procesarYCombinarDatos, showError, clearMessages]);

  // Effect to load data on initial render and setup real-time listeners
  useEffect(() => {
    cargarDatosInventario();

    const inventarioChannel = supabase
      .channel('inventario_stock_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario_stock' }, () => {
        console.log('Realtime change for inventario_stock received.');
        cargarDatosInventario();
      })
      .subscribe();

    const medicamentosChannel = supabase
      .channel('medicamentos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicamentos' }, () => {
        console.log('Realtime change for medicamentos received.');
        cargarDatosInventario();
      })
      .subscribe();

    const suministrosChannel = supabase
      .channel('suministros_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suministros' }, () => {
        console.log('Realtime change for suministros received.');
        cargarDatosInventario();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(inventarioChannel);
      supabase.removeChannel(medicamentosChannel);
      supabase.removeChannel(suministrosChannel);
      console.log('Unsubscribed from all inventory-related channels.');
    };
  }, [cargarDatosInventario]);

  // --- CRUD Functions ---

  /**
   * Opens the modal to add/edit an inventory item.
   * @param item The inventory item to edit (optional, for adding).
   */
  const openAddEditModal = (item?: InventarioItem) => {
    clearMessages();
    if (item) {
      setIsEditing(true);
      setItemToEdit(item);
      setFormItem({
        id_stock: item.id_stock,
        tipo_item: item.tipo_item,
        id_referencia_item: item.id_referencia_item,
        cantidad: item.cantidad,
        ubicacion: item.ubicacion || '',
        lote: item.lote || '',
        fecha_caducidad_lote: item.fecha_caducidad_lote || '',
      });
    } else {
      setIsEditing(false);
      setItemToEdit(null);
      setFormItem({
        id_stock: 0,
        tipo_item: '' as 'medicamento' | 'suministro' | '',
        id_referencia_item: null,
        cantidad: 0,
        ubicacion: '',
        lote: '',
        fecha_caducidad_lote: '',
      });
    }
    setShowAddEditModal(true);
    setShowAddEditItemChoiceModal(false); // Close choice modal if open
  };

  /**
   * Handles changes in the add/edit form fields for inventory.
   */
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormItem(prev => ({
      ...prev,
      [name]: name === 'cantidad' || name === 'id_referencia_item' ? Number(value) : value,
    }));
  };

  /**
   * Handles submission of the form to add or edit an inventory item.
   */
  const handleAddEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsProcessing(true);

    const { id_stock, tipo_item, id_referencia_item, cantidad, ubicacion, lote, fecha_caducidad_lote } = formItem;

    if (!tipo_item || cantidad <= 0 || !ubicacion || id_referencia_item === null) {
      showError('Por favor, rellena todos los campos obligatorios: Tipo, Ítem, Cantidad, Ubicación.');
      setIsProcessing(false);
      return;
    }

    if (tipo_item === 'medicamento' && !fecha_caducidad_lote) {
      showError('Para medicamentos, la fecha de caducidad es obligatoria.');
      setIsProcessing(false);
      return;
    }

    const itemData = {
      tipo_item: tipo_item as 'medicamento' | 'suministro',
      id_referencia_item: id_referencia_item,
      cantidad: cantidad,
      ubicacion: ubicacion,
      lote: lote || null,
      fecha_caducidad_lote: fecha_caducidad_lote || null,
      ultima_actualizacion: new Date().toISOString(),
    };

    try {
      if (isEditing && itemToEdit) {
        // Update existing item
        const { error: updateError } = await supabase
          .from('inventario_stock')
          .update(itemData)
          .eq('id_stock', id_stock);
        if (updateError) throw updateError;
        showSuccess('Ítem de inventario actualizado exitosamente.');
      } else {
        // Insert new item
        const { error: insertError } = await supabase
          .from('inventario_stock')
          .insert(itemData);
        if (insertError) throw insertError;
        showSuccess('Nuevo ítem agregado al inventario exitosamente.');
      }
      setShowAddEditModal(false);
      // Data reload is handled by the real-time listener
    } catch (err: any) {
      console.error('Error al guardar ítem de inventario:', err.message);
      showError('Error al guardar el ítem: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Opens the dispatch modal.
   * @param item The inventory item to dispatch.
   */
  const openDispatchModal = (item: InventarioItem) => {
    setItemToDispatch(item);
    setDispatchQuantity(1); // Default quantity
    clearMessages();
    setShowDispatchModal(true);
  };

  /**
   * Handles dispatching an item (reducing quantity).
   */
  const handleDispatch = async () => {
    if (!itemToDispatch || dispatchQuantity <= 0 || dispatchQuantity > itemToDispatch.cantidad) {
      showError('Cantidad de despacho inválida.');
      return;
    }
    setIsProcessing(true);
    clearMessages();
    try {
      const newQuantity = itemToDispatch.cantidad - dispatchQuantity;
      const { error: updateError } = await supabase
        .from('inventario_stock')
        .update({ cantidad: newQuantity, ultima_actualizacion: new Date().toISOString() })
        .eq('id_stock', itemToDispatch.id_stock);
      if (updateError) throw updateError;
      showSuccess(`Se despacharon ${dispatchQuantity} unidades de ${itemToDispatch.nombre_item}.`);
      setShowDispatchModal(false);
      setItemToDispatch(null);
      // Data reload is automatically handled by the real-time listener
    } catch (err: any) {
      console.error('Error al despachar ítem:', err.message);
      showError('Error al despachar el ítem: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Logic for Low Stock Notifications ---
  const lowStockItems = useMemo(() => {
    return inventario.filter(item => item.cantidad <= LOW_STOCK_THRESHOLD && item.cantidad > 0);
  }, [inventario]);

  const outOfStockItems = useMemo(() => {
    return inventario.filter(item => item.cantidad === 0);
  }, [inventario]);

  const expiredItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inventario.filter(item =>
      item.tipo_item === 'medicamento' &&
      item.fecha_caducidad_lote &&
      new Date(item.fecha_caducidad_lote + 'T00:00:00') < today &&
      item.cantidad > 0
    );
  }, [inventario]);

  // --- Calculations for General Summary ---
  const totalUniqueItems = inventario.length;
  const totalQuantity = inventario.reduce((sum, item) => sum + item.cantidad, 0);
  const totalExpiredLots = expiredItems.length;

  // --- Filtering and Pagination Logic ---
  const filteredInventory = useMemo(() => {
    return inventario.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.nombre_item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ubicacion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.lote?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoria_suministro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoria_medicamento?.toLowerCase().includes(searchTerm.toLowerCase()); // Added for medicine category
      const matchesType = filterType === '' || item.tipo_item === filterType;
      return matchesSearch && matchesType;
    });
  }, [inventario, searchTerm, filterType]);

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const paginatedInventory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredInventory.slice(startIndex, endIndex);
  }, [filteredInventory, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // --- Handlers for New Medicine Modal (Catalog) ---
  const handleNewMedicineChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setNewMedicine(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddNewMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsProcessing(true);

    if (!newMedicine.nombre_generico) {
      showError('El nombre genérico del medicamento es obligatorio.');
      setIsProcessing(false);
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('medicamentos')
        .insert([newMedicine])
        .select()
        .single();

      if (insertError) throw insertError;

      showSuccess(`Medicamento "${data.nombre_generico}" añadido exitosamente al catálogo.`);
      setNewMedicine({
        nombre_generico: '', nombre_comercial: null, principio_activo: null, presentacion: null,
        dosis_recomendada: null, fabricante: null, unidad_medida: null, precio_venta: null,
        categoria: null, sustancia_controlada: false,
      });
      setShowNewMedicineModal(false);
      // cargarDatosInventario() will be called by realtime listener for 'medicamentos'
    } catch (err: any) {
      console.error('Error al añadir medicamento:', err);
      showError('Error al añadir medicamento: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Handlers for New Suministro Modal (Catalog) ---
  const handleNewSuministroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewSuministro(prev => ({ ...prev, [name]: value }));
  };

  const handleAddNewSuministro = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsProcessing(true);

    if (!newSuministro.nombre) {
      showError('El nombre del suministro es obligatorio.');
      setIsProcessing(false);
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('suministros')
        .insert([newSuministro])
        .select()
        .single();

      if (insertError) throw insertError;

      showSuccess(`Suministro "${data.nombre}" añadido exitosamente al catálogo.`);
      setNewSuministro({
        nombre: '', descripcion: null, categoria: null, unidad_medida: null,
      });
      setShowNewSuministroModal(false);
      // cargarDatosInventario() will be called by realtime listener for 'suministros'
    } catch (err: any) {
      console.error('Error al añadir suministro:', err);
      showError('Error al añadir suministro: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Navigates to the purchases page with item details for buying.
   */
  const navigateToPurchases = (itemType: 'medicamento' | 'suministro', itemId: number, itemName: string) => {
    navigate('/admin-dashboard/proveedores-compras', {
      state: {
        itemToPurchase: { type: itemType, id: itemId, name: itemName }
      }
    });
  };

  // --- Component Rendering ---
  if (isLoading && inventario.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-950 text-white font-inter">
        <Loader2 className="animate-spin mr-3 text-blue-400" size={36} />
        <p className="text-xl text-blue-400">Cargando datos de inventario...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-950 text-white space-y-12 min-h-screen font-inter">
      <h2 className="text-3xl font-extrabold text-indigo-400 text-center mb-8 flex items-center justify-center gap-3">
        <Package size={28} /> Gestión de Inventario
      </h2>

      {/* Feedback messages (success/error) */}
      {error && (
        <div className="bg-red-800 text-red-100 p-4 rounded-lg text-center border border-red-600 mb-6 flex items-center justify-between shadow-md animate-fade-in">
          <AlertCircle size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">{error}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setError(null)} />
        </div>
      )}
      {success && (
        <div className="bg-green-800 text-green-100 p-4 rounded-lg text-center border border-green-600 mb-6 flex items-center justify-between shadow-md animate-fade-in">
          <CheckCircle size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">{success}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setSuccess(null)} />
        </div>
      )}

      {/* Stock Alerts Section */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0 || expiredItems.length > 0) && (
        <section className="bg-gray-900 p-6 rounded-xl shadow-lg border border-yellow-700">
          <h3 className="text-2xl text-yellow-400 mb-5 font-bold flex items-center gap-2">
            <ClipboardList size={24} /> Alertas de Inventario
          </h3>
          {lowStockItems.length > 0 && (
            <div className="bg-yellow-800/20 text-yellow-100 p-4 rounded-lg border border-yellow-600 mb-4 animate-fade-in">
              <h4 className="font-semibold text-lg mb-3 flex items-center text-yellow-300"><TrendingDown size={20} className="mr-2" /> Stock Bajo (menos de
                {LOW_STOCK_THRESHOLD} unidades)</h4>
              <ul className="list-none space-y-2">
                {lowStockItems.map(item => (
                  <li key={item.id_stock} className="flex items-center text-sm bg-yellow-900/30 p-2 rounded-md border border-yellow-700/50 cursor-pointer"
                      onClick={() => navigateToPurchases(item.tipo_item, item.id_referencia_item, item.nombre_item)}>
                    <AlertCircle size={16} className="flex-shrink-0 text-yellow-300 mr-2" />
                    <span className="font-medium mr-1">{item.nombre_item}:</span>
                    <span className="text-yellow-100">{item.cantidad} unidades restantes en
                      {item.ubicacion} (Lote: {item.lote || 'N/A'}{item.vencimiento_display ? `, Vence:
                      ${item.vencimiento_display}` : ''}).</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {outOfStockItems.length > 0 && (
            <div className="bg-red-800/20 text-red-100 p-4 rounded-lg border border-red-600 mb-4 animate-fade-in">
              <h4 className="font-semibold text-lg mb-3 flex items-center text-red-300"><PackageX size={20} className="mr-2" /> Sin Stock (0 unidades)</h4>
              <ul className="list-none space-y-2">
                {outOfStockItems.map(item => (
                  <li key={item.id_stock} className="flex items-center text-sm bg-red-900/30 p-2 rounded-md border border-red-700/50 cursor-pointer"
                      onClick={() => navigateToPurchases(item.tipo_item, item.id_referencia_item, item.nombre_item)}>
                    <EyeOff size={16} className="flex-shrink-0 text-red-300 mr-2" />
                    <span className="font-medium mr-1">{item.nombre_item}:</span>
                    <span className="text-red-100">Agotado en {item.ubicacion} (Lote: {item.lote ||
                      'N/A'}).</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {expiredItems.length > 0 && (
            <div className="bg-orange-800/20 text-orange-100 p-4 rounded-lg border border-orange-600 animate-fade-in">
              <h4 className="font-semibold text-lg mb-3 flex items-center text-orange-300"><Calendar size={20} className="mr-2" /> Lotes Vencidos</h4>
              <ul className="list-none space-y-2">
                {expiredItems.map(item => (
                  <li key={item.id_stock} className="flex items-center text-sm bg-orange-900/30 p-2 rounded-md border border-orange-700/50 cursor-pointer"
                      onClick={() => navigateToPurchases(item.tipo_item, item.id_referencia_item, item.nombre_item)}>
                    <AlertCircle size={16} className="flex-shrink-0 text-orange-300 mr-2" />
                    <span className="font-medium mr-1">{item.nombre_item}:</span>
                    <span className="text-orange-100">Lote {item.lote || 'N/A'} vencido en
                      {item.vencimiento_display || 'fecha desconocida'} ({item.cantidad} unidades).</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Inventory Summary Section */}
      <section className="bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800">
        <h3 className="text-2xl text-indigo-400 mb-5 font-bold flex items-center gap-2">
          <TrendingUp size={24} /> Resumen del Inventario
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 p-4 rounded-md shadow-md border border-gray-700 flex flex-col items-center justify-center transform hover:scale-105 transition-transform duration-200">
            <p className="text-5xl font-extrabold text-green-400">{totalUniqueItems}</p>
            <p className="text-lg text-gray-300 mt-2">Ítems Únicos en Inventario</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-md shadow-md border border-gray-700 flex flex-col items-center justify-center transform hover:scale-105 transition-transform duration-200">
            <p className="text-5xl font-extrabold text-yellow-400">{totalQuantity}</p>
            <p className="text-lg text-gray-300 mt-2">Cantidad Total de Unidades</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-md shadow-md border border-gray-700 flex flex-col items-center justify-center transform hover:scale-105 transition-transform duration-200">
            <p className="text-5xl font-extrabold text-red-400">{totalExpiredLots}</p>
            <p className="text-lg text-gray-300 mt-2">Lotes de Medicamentos Vencidos</p>
          </div>
        </div>
      </section>

      {/* Visualizations Section */}
      <section className="bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800">
        <h3 className="text-2xl text-indigo-400 mb-5 font-bold flex items-center gap-2">
          <BarChart2 size={24} /> Visualizaciones del Inventario
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pie Chart: Distribution by Item Type */}
          <div className="bg-gray-800 p-4 rounded-md shadow-md border border-gray-700">
            <h4 className="text-xl text-white font-medium mb-4">Distribución por Tipo de Ítem</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dataPorTipo}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }: { name: string; percent: number }) =>
                    `${name.charAt(0).toUpperCase() + name.slice(1)} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {dataPorTipo.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#2d3748', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Bar Chart: Supply Quantity by Category */}
          <div className="bg-gray-800 p-4 rounded-md shadow-md border border-gray-700">
            <h4 className="text-xl text-white font-medium mb-4">Cantidad de Suministros por Categoría</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataPorCategoriaSuministros} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                <XAxis dataKey="name" stroke="#cbd5e0" />
                <YAxis stroke="#cbd5e0" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#2d3748', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                <Bar dataKey="value" fill="#4CAF50" name="Cantidad" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Bar Chart: Medicines by Expiry Status */}
          <div className="bg-gray-800 p-4 rounded-md shadow-md border border-gray-700 lg:col-span-2">
            <h4 className="text-xl text-white font-medium mb-4">Medicamentos por Estado de Vencimiento (Lotes)</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataVencimientoMedicamentos} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                <XAxis dataKey="name" stroke="#cbd5e0" />
                <YAxis stroke="#cbd5e0" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#2d3748', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                <Bar dataKey="value" fill="#FFC107" name="Cantidad de Lotes" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Table Search and Filter Controls */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800 mb-8 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="relative w-full md:w-1/2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, ubicación, lote o categoría..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset pagination on search
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setCurrentPage(1); // Reset pagination on filter
          }}
          className="w-full md:w-1/4 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
        >
          <option value="">Todos los tipos</option>
          <option value="medicamento">Medicamento</option>
          <option value="suministro">Suministro</option>
        </select>
        <button
          onClick={() => setShowAddEditItemChoiceModal(true)} // Open the choice modal
          className="w-full md:w-auto px-6 py-2.5 bg-green-700 hover:bg-green-600 rounded-lg text-white font-semibold flex items-center justify-center transition shadow-md"
        >
          <PlusCircle size={20} className="mr-2" />
          Agregar Nuevo Ítem
        </button>
      </div>

      {/* Inventory Details Section (Table) */}
      <section className="bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800">
        <h3 className="text-2xl text-indigo-400 mb-5 font-bold flex items-center gap-2">
          <Box size={24} /> Detalles del Inventario
        </h3>
        {paginatedInventory.length === 0 && !isLoading ? (
          <p className="text-gray-400 text-center py-4">No hay ítems en el inventario que coincidan con la búsqueda o filtro.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="min-w-full table-auto divide-y divide-gray-700 text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><Tag size={14} /> Ítem</div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    Lote / Categoría
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    Vencimiento / Unidad
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><Calendar size={14} /> Última Actualización</div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-700">
                {paginatedInventory.map((item) => (
                  <tr key={item.id_stock} className="hover:bg-gray-800 transition-colors duration-200">
                    <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                      {item.nombre_item}
                      {item.cantidad <= LOW_STOCK_THRESHOLD && item.cantidad > 0 && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <AlertCircle size={12} className="mr-1" /> Bajo Stock
                        </span>
                      )}
                      {item.cantidad === 0 && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <EyeOff size={12} className="mr-1" /> Agotado
                        </span>
                      )}
                      {item.tipo_item === 'medicamento' && item.fecha_caducidad_lote && new
                        Date(item.fecha_caducidad_lote + 'T00:00:00') < new Date() && item.cantidad > 0 && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <Calendar size={12} className="mr-1" /> Vencido
                          </span>
                        )}
                    </td>
                    <td className="px-4 py-3 capitalize whitespace-nowrap">{item.tipo_item}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{item.cantidad}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.tipo_item === 'medicamento' ? item.lote || 'N/A' : item.categoria_suministro || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.tipo_item === 'medicamento' ? item.vencimiento_display || 'Sin fecha' :
                        item.unidad_display || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{item.ubicacion || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(item.ultima_actualizacion).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openAddEditModal(item)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
                          title="Editar Ítem"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => openDispatchModal(item)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-200"
                          title="Despachar Ítem"
                        >
                          <Truck size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredInventory.length > itemsPerPage && (
          <div className="flex justify-center items-center space-x-2 mt-6">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading || isProcessing}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-gray-300">Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading || isProcessing}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </section>

      {/* Modal for Initial Add/Edit Item Choice */}
      {showAddEditItemChoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 p-8 rounded-lg shadow-xl w-full max-w-sm border border-indigo-700 text-center">
            <h3 className="text-2xl font-bold text-indigo-400 mb-6">¿Qué deseas agregar?</h3>
            <div className="space-y-4">
              <button
                onClick={() => openAddEditModal()} // Opens the stock add/edit modal for existing items
                className="w-full px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-md flex items-center justify-center gap-2"
              >
                <Package size={20} /> Stock de Ítem Existente
              </button>
              <button
                onClick={() => { setShowAddEditItemChoiceModal(false); setShowNewMedicineModal(true); }}
                className="w-full px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition shadow-md flex items-center justify-center gap-2"
              >
                <FlaskConical size={20} /> Nuevo Medicamento (Catálogo)
              </button>
              <button
                onClick={() => { setShowAddEditItemChoiceModal(false); setShowNewSuministroModal(true); }}
                className="w-full px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition shadow-md flex items-center justify-center gap-2"
              >
                <Wrench size={20} /> Nuevo Suministro (Catálogo)
              </button>
            </div>
            <button
              onClick={() => setShowAddEditItemChoiceModal(false)}
              className="mt-6 px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-md"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal for Adding/Editing Inventory Item (STOCK of existing catalog item) */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md space-y-6 border border-blue-700 transform scale-100 animate-scale-in">
            <h3 className="text-2xl font-bold text-blue-400 text-center flex items-center justify-center gap-2">
              {isEditing ? <Edit size={24} /> : <PlusCircle size={24} />}
              {isEditing ? 'Editar Ítem de Inventario' : 'Agregar Stock de Ítem Existente'}
            </h3>
            {error && <p className="bg-red-700 text-red-100 p-3 rounded text-sm mb-4">{error}</p>}
            <form onSubmit={handleAddEditSubmit} className="space-y-4">
              <div>
                <label htmlFor="tipo_item" className="block mb-1 text-gray-300">Tipo de Ítem</label>
                <select
                  name="tipo_item"
                  id="tipo_item"
                  value={formItem.tipo_item}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                  disabled={isEditing}
                >
                  <option value="">Selecciona un tipo</option>
                  <option value="medicamento">Medicamento</option>
                  <option value="suministro">Suministro</option>
                </select>
              </div>

              {/* Selector for existing catalog item */}
              {formItem.tipo_item && (
                <div>
                  <label htmlFor="id_referencia_item" className="block mb-1 text-gray-300">Selecciona el Ítem del Catálogo</label>
                  <select
                    name="id_referencia_item"
                    id="id_referencia_item"
                    value={formItem.id_referencia_item || ''} // Handle null for initial state
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                  >
                    <option value="">Selecciona...</option>
                    {formItem.tipo_item === 'medicamento' && medicamentosCatalogo.map(med => (
                      <option key={med.id_medicamento} value={med.id_medicamento}>
                        {med.nombre_generico} ({med.presentacion || 'N/A'})
                      </option>
                    ))}
                    {formItem.tipo_item === 'suministro' && suministrosCatalogo.map(sum => (
                      <option key={sum.id_suministro} value={sum.id_suministro}>
                        {sum.nombre} ({sum.categoria || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="cantidad" className="block mb-1 text-gray-300">Cantidad</label>
                <input
                  name="cantidad"
                  id="cantidad"
                  type="number"
                  value={formItem.cantidad}
                  onChange={handleFormChange}
                  min="0"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                />
              </div>
              <div>
                <label htmlFor="ubicacion" className="block mb-1 text-gray-300">Ubicación</label>
                <input
                  name="ubicacion"
                  id="ubicacion"
                  placeholder="Ej. Almacén Principal, Farmacia"
                  value={formItem.ubicacion}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                />
              </div>
              <div>
                <label htmlFor="lote" className="block mb-1 text-gray-300">Lote (opcional)</label>
                <input
                  name="lote"
                  id="lote"
                  placeholder="Ej. LOTE001"
                  value={formItem.lote}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
              {formItem.tipo_item === 'medicamento' && (
                <div>
                  <label htmlFor="fecha_caducidad_lote" className="block mb-1 text-gray-300">Fecha de Caducidad (Medicamento)</label>
                  <input
                    name="fecha_caducidad_lote"
                    id="fecha_caducidad_lote"
                    type="date"
                    value={formItem.fecha_caducidad_lote}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                  />
                </div>
              )}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-md"
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-semibold transition shadow-md flex items-center justify-center"
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="animate-spin mr-2" size={20} /> : (isEditing ? <Edit size={20} className="mr-2" /> : <PlusCircle size={20} className="mr-2" />)}
                  {isProcessing ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Agregar Ítem')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {showDispatchModal && itemToDispatch && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md space-y-6 border border-blue-700 transform scale-100 animate-scale-in">
            <h3 className="text-2xl font-bold text-blue-400 text-center flex items-center justify-center gap-2">
              <Truck size={24} /> Despachar Ítem del Inventario
            </h3>
            {error && <p className="bg-red-700 text-red-100 p-3 rounded text-sm mb-4">{error}</p>}
            {success && <p className="bg-green-700 text-green-100 p-3 rounded text-sm mb-4">{success}</p>}
            <p className="text-gray-300 text-center text-lg">
              Vas a despachar: <span className="font-semibold text-white">{itemToDispatch.nombre_item}</span> ({itemToDispatch.tipo_item})
            </p>
            <p className="text-gray-400 text-center text-sm">
              Cantidad disponible: {itemToDispatch.cantidad}
            </p>
            <div>
              <label htmlFor="dispatchQuantity" className="block mb-1 text-gray-300">Cantidad a despachar:</label>
              <input
                id="dispatchQuantity"
                type="number"
                value={dispatchQuantity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDispatchQuantity(val > 0 ? val : 1);
                }}
                min="1"
                max={itemToDispatch.cantidad}
                className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-md"
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDispatch}
                className="px-6 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg font-semibold transition shadow-md flex items-center justify-center"
                disabled={isProcessing || dispatchQuantity > itemToDispatch.cantidad || dispatchQuantity <= 0}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Despachando...
                  </>
                ) : (
                  <>
                    <Truck size={20} className="mr-2" /> Confirmar Despacho
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Añadir Nuevo Medicamento (Catálogo) - SEPARADO */}
      {showNewMedicineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-2xl border border-indigo-700">
            <h3 className="text-2xl font-bold text-indigo-400 mb-6 flex items-center gap-2">
              <FlaskConical size={24} /> Registrar Nuevo Medicamento
            </h3>
            <form onSubmit={handleAddNewMedicine} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="med_nombre_generico" className="block text-sm font-medium text-gray-300">Nombre Genérico:</label>
                  <input type="text" id="med_nombre_generico" name="nombre_generico" value={newMedicine.nombre_generico} onChange={handleNewMedicineChange} required
                         className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label htmlFor="med_nombre_comercial" className="block text-sm font-medium text-gray-300">Nombre Comercial (opcional):</label>
                  <input type="text" id="med_nombre_comercial" name="nombre_comercial" value={newMedicine.nombre_comercial || ''} onChange={handleNewMedicineChange}
                         className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label htmlFor="med_unidad_medida" className="block text-sm font-medium text-gray-300">Unidad de Medida:</label>
                  <input type="text" id="med_unidad_medida" name="unidad_medida" value={newMedicine.unidad_medida || ''} onChange={handleNewMedicineChange}
                         className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label htmlFor="med_precio_venta" className="block text-sm font-medium text-gray-300">Precio de Venta:</label>
                  <input type="number" id="med_precio_venta" name="precio_venta" value={newMedicine.precio_venta || ''} onChange={handleNewMedicineChange} step="0.01" min="0"
                         className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label htmlFor="med_categoria" className="block text-sm font-medium text-gray-300">Categoría:</label>
                  <input type="text" id="med_categoria" name="categoria" value={newMedicine.categoria || ''} onChange={handleNewMedicineChange}
                         className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div className="flex items-center mt-6">
                  <input type="checkbox" id="med_sustancia_controlada" name="sustancia_controlada" checked={newMedicine.sustancia_controlada || false} onChange={handleNewMedicineChange}
                         className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded" />
                  <label htmlFor="med_sustancia_controlada" className="ml-2 block text-sm text-gray-300">Sustancia Controlada</label>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="med_principio_activo" className="block text-sm font-medium text-gray-300">Principio Activo:</label>
                  <textarea id="med_principio_activo" name="principio_activo" value={newMedicine.principio_activo || ''} onChange={handleNewMedicineChange} rows={2}
                            className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500 resize-y"></textarea>
                </div>
                <div>
                  <label htmlFor="med_presentacion" className="block text-sm font-medium text-gray-300">Presentación:</label>
                  <input type="text" id="med_presentacion" name="presentacion" value={newMedicine.presentacion || ''} onChange={handleNewMedicineChange}
                         className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label htmlFor="med_dosis_recomendada" className="block text-sm font-medium text-gray-300">Dosis Recomendada:</label>
                  <input type="text" id="med_dosis_recomendada" name="dosis_recomendada" value={newMedicine.dosis_recomendada || ''} onChange={handleNewMedicineChange}
                         className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label htmlFor="med_fabricante" className="block text-sm font-medium text-gray-300">Fabricante:</label>
                  <input type="text" id="med_fabricante" name="fabricante" value={newMedicine.fabricante || ''} onChange={handleNewMedicineChange}
                         className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowNewMedicineModal(false)} // Just close, no return to other modal
                        className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-md">
                  Cancelar
                </button>
                <button type="submit"
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition shadow-md"
                        disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="animate-spin mr-2" size={20} /> : 'Guardar Medicamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Añadir Nuevo Suministro (Catálogo) - SEPARADO */}
      {showNewSuministroModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-xl border border-indigo-700">
            <h3 className="text-2xl font-bold text-indigo-400 mb-6 flex items-center gap-2">
              <Wrench size={24} /> Registrar Nuevo Suministro
            </h3>
            <form onSubmit={handleAddNewSuministro} className="space-y-4">
              <div>
                <label htmlFor="sum_nombre" className="block text-sm font-medium text-gray-300">Nombre:</label>
                <input type="text" id="sum_nombre" name="nombre" value={newSuministro.nombre} onChange={handleNewSuministroChange} required
                       className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="sum_descripcion" className="block text-sm font-medium text-gray-300">Descripción (opcional):</label>
                <textarea id="sum_descripcion" name="descripcion" value={newSuministro.descripcion || ''} onChange={handleNewSuministroChange} rows={3}
                          className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500 resize-y"></textarea>
              </div>
              <div>
                <label htmlFor="sum_unidad_medida" className="block text-sm font-medium text-gray-300">Unidad de Medida (opcional):</label>
                <input type="text" id="sum_unidad_medida" name="unidad_medida" value={newSuministro.unidad_medida || ''} onChange={handleNewSuministroChange}
                       className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="sum_categoria" className="block text-sm font-medium text-gray-300">Categoría (opcional):</label>
                <input type="text" id="sum_categoria" name="categoria" value={newSuministro.categoria || ''} onChange={handleNewSuministroChange}
                       className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowNewSuministroModal(false)} // Just close, no return to other modal
                        className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-md">
                  Cancelar
                </button>
                <button type="submit"
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition shadow-md"
                        disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="animate-spin mr-2" size={20} /> : 'Guardar Suministro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioPage;
