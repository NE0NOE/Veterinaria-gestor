import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useLocation } from 'react-router-dom'; // Import useLocation
import {
  Truck, PlusCircle, ShoppingCart, Package, Pill, Box, Calendar,
  DollarSign, Tag, Hash, Key, Info, XCircle, FileText, CheckCircle, AlertCircle, Loader2, FlaskConical, Wrench
} from 'lucide-react';

// --- Type Definitions (Basadas en tu esquema actual) ---
interface Proveedor {
  id_proveedor: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
}

interface Compra {
  id_compra: number;
  id_proveedor: number | null;
  fecha_compra: string;
  total_compra: number;
  nombre_proveedor?: string;
  detalles?: DetalleCompra[];
}

interface DetalleCompra {
  id_detalle?: number;
  id_compra: number;
  tipo_item: 'medicamento' | 'suministro';
  id_referencia_item: number;
  cantidad: number;
  costo_unitario: number;
  lote_comprado: string | null;
  fecha_caducidad_comprado: string | null;
  nombre_item?: string;
}

interface MedicamentoCatalogo {
  id_medicamento: number;
  nombre_generico: string;
  nombre_comercial: string | null;
  unidad_medida: string | null;
  precio_venta: number | null;
  categoria: string | null;
  sustancia_controlada: boolean | null;
  principio_activo: string | null;
  presentacion: string | null;
  dosis_recomendada: string | null;
  fabricante: string | null;
}

interface SuministroCatalogo {
  id_suministro: number;
  nombre: string;
  descripcion: string | null;
  unidad_medida: string | null;
  categoria: string | null;
}

interface NewDetalleCompraItemForUI extends Omit<DetalleCompra, 'id_compra' | 'id_detalle'> {
  nombre_item: string;
}

interface InventarioStockItem {
  id_stock?: number;
  tipo_item: 'medicamento' | 'suministro';
  id_referencia_item: number;
  cantidad: number;
  ubicacion: string | null;
  ultima_actualizacion?: string;
  lote: string | null;
  fecha_caducidad_lote: string | null;
}
// --- END Type Definitions ---

const ProveedoresComprasPage: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [medicamentosCatalogo, setMedicamentosCatalogo] = useState<MedicamentoCatalogo[]>([]);
  const [suministrosCatalogo, setSuministrosCatalogo] = useState<SuministroCatalogo[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [purchaseGuidance, setPurchaseGuidance] = useState<string | null>(null); // New state for guidance message

  const [activeTab, setActiveTab] = useState<'proveedores' | 'compras'>('compras');

  // New states for new catalog item modals
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


  // State for new provider form
  const [newProveedor, setNewProveedor] = useState<Omit<Proveedor, 'id_proveedor'>>({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
  });

  // State for new purchase form
  const [newCompra, setNewCompra] = useState<{
    id_proveedor: number | null;
    fecha_compra: string;
    detalles: NewDetalleCompraItemForUI[];
  }>({
    id_proveedor: null,
    fecha_compra: new Date().toISOString().split('T')[0],
    detalles: [],
  });

  // State for adding individual purchase detail (item by item)
  const [newDetalleCompraItem, setNewDetalleCompraItem] = useState<{
    tipo_item: 'medicamento' | 'suministro' | '';
    id_referencia_item: number | null;
    cantidad: number;
    costo_unitario: number;
    lote_comprado: string;
    fecha_caducidad_comprado: string;
  }>({
    tipo_item: '',
    id_referencia_item: null,
    cantidad: 1,
    costo_unitario: 0,
    lote_comprado: '',
    fecha_caducidad_comprado: '',
  });

  const location = useLocation(); // Initialize useLocation

  // Effect to handle navigation state for pre-filling purchase form
  useEffect(() => {
    if (location.state && (location.state as any).itemToPurchase) {
      const { type, id, name } = (location.state as any).itemToPurchase;
      setPurchaseGuidance(`¡Necesitas comprar "${name}" (${type === 'medicamento' ? 'medicamento' : 'suministro'})! Añádelo a tu nueva compra.`);
      setNewDetalleCompraItem(prev => ({
        ...prev,
        tipo_item: type,
        id_referencia_item: id,
      }));
      setActiveTab('compras'); // Switch to purchases tab
      // Clear the state from history to prevent re-triggering on refresh
      window.history.replaceState({}, document.title, location.pathname);
      // Optional: Clear guidance message after a few seconds
      setTimeout(() => setPurchaseGuidance(null), 10000);
    }
  }, [location.state]); // Depend on location.state


  /**
   * Displays a success message that fades out.
   * @param message The success message to display.
   */
  const showSuccess = useCallback((message: string) => {
    setSuccess(message);
    setError(null);
    setPurchaseGuidance(null);
    setTimeout(() => setSuccess(null), 5000);
  }, []);

  /**
   * Displays an error message that fades out.
   * @param message The error message to display.
   */
  const showError = useCallback((message: string) => {
    setError(message);
    setSuccess(null);
    setPurchaseGuidance(null);
    setTimeout(() => setError(null), 8000);
  }, []);

  /**
   * Clears all feedback messages.
   */
  const clearMessages = useCallback(() => {
    setSuccess(null);
    setError(null);
    setPurchaseGuidance(null);
  }, []);

  /**
   * Loads all necessary data for the page: providers, medicine catalog, supply catalog, and purchases.
   * Links purchases with providers and details.
   */
  const cargarDatos = useCallback(async () => {
    setIsLoading(true);
    clearMessages();
    try {
      // Fetch Proveedores
      const { data: proveedoresData, error: provError } = await supabase
        .from('proveedores')
        .select('*')
        .order('nombre', { ascending: true });
      if (provError) throw provError;
      setProveedores(proveedoresData || []);

      // Fetch Catálogo de Medicamentos
      const { data: medsData, error: medsError } = await supabase
        .from('medicamentos')
        .select('*') // Select all columns for full details (price, category, etc.)
        .order('nombre_generico', { ascending: true });
      if (medsError) throw medsError;
      setMedicamentosCatalogo(medsData || []);

      // Fetch Catálogo de Suministros
      const { data: sumsData, error: sumsError } = await supabase
        .from('suministros')
        .select('*') // Select all columns for full details
        .order('nombre', { ascending: true });
      if (sumsError) throw sumsError;
      setSuministrosCatalogo(sumsData || []);

      // Fetch Compras
      const { data: comprasData, error: comprasError } = await supabase
        .from('compras')
        .select('*')
        .order('fecha_compra', { ascending: false });
      if (comprasError) throw comprasError;

      // Fetch Detalle Compras para enlazar
      const { data: detallesData, error: detallesError } = await supabase
        .from('detalle_compras')
        .select('*');
      if (detallesError) throw detallesError;

      // Enlazar compras con proveedores y detalles
      const linkedCompras: Compra[] = (comprasData || []).map(compra => {
        const proveedor = (proveedoresData || []).find(p => p.id_proveedor === compra.id_proveedor);
        return {
          ...compra,
          nombre_proveedor: proveedor ? proveedor.nombre : 'Proveedor Desconocido',
          detalles: (detallesData || [])
            .filter(d => d.id_compra === compra.id_compra)
            .map(d => {
              let nombre_item = 'Item Desconocido';
              if (d.tipo_item === 'medicamento') {
                const med = (medsData || []).find(m => m.id_medicamento === d.id_referencia_item);
                nombre_item = med ? med.nombre_generico : 'Medicamento Desconocido';
              } else if (d.tipo_item === 'suministro') {
                const sum = (sumsData || []).find(s => s.id_suministro === d.id_referencia_item);
                nombre_item = sum ? sum.nombre : 'Suministro Desconocido';
              }
              return { ...d, nombre_item };
            }),
        };
      });

      setCompras(linkedCompras);

    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      showError('Error al cargar datos: ' + err.message + '. Asegúrate de que las tablas estén configuradas y las políticas RLS adecuadas.');
    } finally {
      setIsLoading(false);
    }
  }, [clearMessages, showError]);

  useEffect(() => {
    cargarDatos();

    // Setup Realtime Listeners for all relevant tables
    const proveedoresChannel = supabase
      .channel('proveedores_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proveedores' }, () => {
        console.log('Realtime change for proveedores received.');
        cargarDatos();
      })
      .subscribe();

    const comprasChannel = supabase
      .channel('compras_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compras' }, () => {
        console.log('Realtime change for compras received.');
        cargarDatos();
      })
      .subscribe();

    const detalleComprasChannel = supabase
      .channel('detalle_compras_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detalle_compras' }, () => {
        console.log('Realtime change for detalle_compras received.');
        cargarDatos();
      })
      .subscribe();

    const inventarioStockChannel = supabase
      .channel('inventario_stock_changes_compras')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario_stock' }, () => {
        console.log('Realtime change for inventario_stock received in Compras page.');
        cargarDatos();
      })
      .subscribe();

    const medicamentosChannel = supabase
      .channel('medicamentos_changes_compras')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicamentos' }, () => {
        console.log('Realtime change for medicamentos received in Compras page.');
        cargarDatos();
      })
      .subscribe();

    const suministrosChannel = supabase
      .channel('suministros_changes_compras')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suministros' }, () => {
        console.log('Realtime change for suministros received in Compras page.');
        cargarDatos();
      })
      .subscribe();


    return () => {
      supabase.removeChannel(proveedoresChannel);
      supabase.removeChannel(comprasChannel);
      supabase.removeChannel(detalleComprasChannel);
      supabase.removeChannel(inventarioStockChannel);
      supabase.removeChannel(medicamentosChannel);
      supabase.removeChannel(suministrosChannel);
      console.log('Unsubscribed from all purchases-related channels.');
    };
  }, [cargarDatos]);


  /**
   * Handles changes in the new provider form fields.
   */
  const handleNewProveedorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewProveedor(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Adds a new provider to the database.
   */
  const handleAddProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsProcessing(true);

    if (!newProveedor.nombre) {
      showError('El nombre del proveedor es obligatorio.');
      setIsProcessing(false);
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('proveedores')
        .insert([newProveedor])
        .select()
        .single();

      if (insertError) throw insertError;

      showSuccess('Proveedor añadido exitosamente.');
      setNewProveedor({ nombre: '', telefono: '', email: '', direccion: '' }); // Reset form
    } catch (err: any) {
      console.error('Error al añadir proveedor:', err);
      showError('Error al añadir proveedor: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles changes in the new purchase form fields.
   */
  const handleNewCompraChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCompra(prev => ({ ...prev, [name]: name === 'id_proveedor' ? parseInt(value) : value }));
  };

  /**
   * Handles changes in the fields for an individual purchase detail item.
   */
  const handleNewDetalleCompraItemChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewDetalleCompraItem(prev => ({
      ...prev,
      [name]: (name === 'cantidad' || name === 'costo_unitario' || name === 'id_referencia_item')
        ? parseFloat(value)
        : value,
    }));
  };

  /**
   * Adds an item to the current new purchase's details array.
   */
  const handleAddItemToCompra = () => {
    clearMessages();
    const { tipo_item, id_referencia_item, cantidad, costo_unitario, lote_comprado, fecha_caducidad_comprado } = newDetalleCompraItem;

    if (!tipo_item || id_referencia_item === null || cantidad <= 0 || costo_unitario < 0) {
      showError('Por favor, completa los campos obligatorios del ítem de compra (Tipo, Ítem, Cantidad, Costo Unitario).');
      return;
    }

    if (tipo_item === 'medicamento' && (!lote_comprado || !fecha_caducidad_comprado)) {
      showError('Para medicamentos, el lote y la fecha de caducidad son obligatorios.');
      return;
    }

    let nombre_item_display = 'Ítem Desconocido';
    if (tipo_item === 'medicamento') {
      const med = medicamentosCatalogo.find(m => m.id_medicamento === id_referencia_item);
      nombre_item_display = med ? med.nombre_generico : 'Medicamento Desconocido';
    } else if (tipo_item === 'suministro') {
      const sum = suministrosCatalogo.find(s => s.id_suministro === id_referencia_item);
      nombre_item_display = sum ? sum.nombre : 'Suministro Desconocido';
    }

    setNewCompra(prev => ({
      ...prev,
      detalles: [
        ...prev.detalles,
        {
          tipo_item: tipo_item as 'medicamento' | 'suministro',
          id_referencia_item: id_referencia_item,
          cantidad: cantidad,
          costo_unitario: costo_unitario,
          lote_comprado: tipo_item === 'medicamento' ? lote_comprado : null,
          fecha_caducidad_comprado: tipo_item === 'medicamento' ? fecha_caducidad_comprado : null,
          nombre_item: nombre_item_display,
        },
      ],
    }));

    setNewDetalleCompraItem({
      tipo_item: '',
      id_referencia_item: null,
      cantidad: 1,
      costo_unitario: 0,
      lote_comprado: '',
      fecha_caducidad_comprado: '',
    });
    showSuccess('Ítem añadido a la lista de compra.');
  };

  /**
   * Removes an item from the current new purchase's details array.
   */
  const handleRemoveItemFromCompra = (indexToRemove: number) => {
    setNewCompra(prev => ({
      ...prev,
      detalles: prev.detalles.filter((_, index) => index !== indexToRemove),
    }));
    showSuccess('Ítem eliminado de la lista de compra.');
  };

  /**
   * Calculates the total for the current purchase.
   */
  const calculateCurrentCompraTotal = useCallback(() => {
    return newCompra.detalles.reduce((total, detalle) => total + (detalle.cantidad * detalle.costo_unitario), 0);
  }, [newCompra.detalles]);

  /**
   * Saves the new purchase and updates the inventory.
   */
  const handleAddCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsProcessing(true);

    if (!newCompra.id_proveedor) {
      showError('Por favor, selecciona un proveedor para la compra.');
      setIsProcessing(false);
      return;
    }
    if (newCompra.detalles.length === 0) {
      showError('Añade al menos un ítem a la compra antes de registrarla.');
      setIsProcessing(false);
      return;
    }

    const totalCompra = calculateCurrentCompraTotal();

    try {
      // 1. Insertar la cabecera de la compra
      const { data: compraData, error: compraError } = await supabase
        .from('compras')
        .insert([{
          id_proveedor: newCompra.id_proveedor,
          fecha_compra: newCompra.fecha_compra,
          total_compra: totalCompra,
        }])
        .select('id_compra')
        .single();

      if (compraError) throw compraError;

      const id_compra_nueva = compraData.id_compra;

      // 2. Insertar los detalles de la compra y actualizar el inventario_stock
      for (const detalle of newCompra.detalles) {
        // Insertar en detalle_compras
        const { error: detalleError } = await supabase
          .from('detalle_compras')
          .insert([{
            id_compra: id_compra_nueva,
            tipo_item: detalle.tipo_item,
            id_referencia_item: detalle.id_referencia_item,
            cantidad: detalle.cantidad,
            costo_unitario: detalle.costo_unitario,
            lote_comprado: detalle.lote_comprado,
            fecha_caducidad_comprado: detalle.fecha_caducidad_comprado,
          }]);

        if (detalleError) throw detalleError;

        // Actualizar inventario_stock
        if (detalle.tipo_item === 'medicamento') {
          // Buscar si ya existe una entrada para este medicamento y lote
          const { data: existingStock, error: stockError } = await supabase
            .from('inventario_stock')
            .select('id_stock, cantidad')
            .eq('tipo_item', 'medicamento')
            .eq('id_referencia_item', detalle.id_referencia_item)
            .eq('lote', detalle.lote_comprado)
            .single();

          if (stockError && stockError.code !== 'PGRST116') {
            throw stockError;
          }

          if (existingStock) {
            // Actualizar cantidad si el lote ya existe
            const { error: updateError } = await supabase
              .from('inventario_stock')
              .update({ cantidad: existingStock.cantidad + detalle.cantidad, ultima_actualizacion: new Date().toISOString() })
              .eq('id_stock', existingStock.id_stock);
            if (updateError) throw updateError;
          } else {
            // Insertar nuevo registro si el lote no existe
            const { error: insertStockError } = await supabase
              .from('inventario_stock')
              .insert([{
                tipo_item: 'medicamento',
                id_referencia_item: detalle.id_referencia_item,
                cantidad: detalle.cantidad,
                lote: detalle.lote_comprado,
                fecha_caducidad_lote: detalle.fecha_caducidad_comprado,
                ubicacion: 'Almacén Principal',
                ultima_actualizacion: new Date().toISOString(),
              }]);
            if (insertStockError) throw insertStockError;
          }
        } else if (detalle.tipo_item === 'suministro') {
          // Buscar si ya existe una entrada para este suministro
          const { data: existingStock, error: stockError } = await supabase
            .from('inventario_stock')
            .select('id_stock, cantidad')
            .eq('tipo_item', 'suministro')
            .eq('id_referencia_item', detalle.id_referencia_item)
            .single();

          if (stockError && stockError.code !== 'PGRST116') {
            throw stockError;
          }

          if (existingStock) {
            // Actualizar cantidad si el suministro ya existe
            const { error: updateError } = await supabase
              .from('inventario_stock')
              .update({ cantidad: existingStock.cantidad + detalle.cantidad, ultima_actualizacion: new Date().toISOString() })
              .eq('id_stock', existingStock.id_stock);
            if (updateError) throw updateError;
          } else {
            // Insertar nuevo registro si el suministro no existe
            const { error: insertStockError } = await supabase
              .from('inventario_stock')
              .insert([{
                tipo_item: 'suministro',
                id_referencia_item: detalle.id_referencia_item,
                cantidad: detalle.cantidad,
                lote: null,
                fecha_caducidad_lote: null,
                ubicacion: 'Almacén Principal',
                ultima_actualizacion: new Date().toISOString(),
              }]);
            if (insertStockError) throw insertStockError;
          }
        }
      }

      setNewCompra({
        id_proveedor: null,
        fecha_compra: new Date().toISOString().split('T')[0],
        detalles: [],
      });
      setNewDetalleCompraItem({
        tipo_item: '',
        id_referencia_item: null,
        cantidad: 1,
        costo_unitario: 0,
        lote_comprado: '',
        fecha_caducidad_comprado: '',
      });
      showSuccess('Compra registrada y inventario actualizado exitosamente.');
    } catch (err: any) {
      console.error('Error al registrar compra o actualizar inventario:', err);
      showError('Error al registrar compra o actualizar inventario: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Exports the purchase history to a CSV file (semicolon delimited).
   * Each purchase detail (item) gets its own row.
   */
  const exportComprasToCsv = () => {
    if (compras.length === 0) {
      showError('No hay compras para exportar.');
      return;
    }

    // Use semicolon as delimiter for better Excel compatibility in many locales
    const DELIMITER = ';';

    const headers = [
      'ID Compra', 'Proveedor', 'Fecha Compra', 'Total Compra',
      'Tipo Item', 'Nombre Item', 'Cantidad', 'Costo Unitario', 'Lote', 'Fecha Caducidad Lote'
    ];

    // Helper function to escape CSV values for semicolon delimiter
    const escapeCsvValue = (value: any): string => {
      if (value === null || value === undefined) return '';
      let stringValue = String(value);
      // If the string contains the delimiter, double quote, or newline, enclose it in double quotes
      // and escape any existing double quotes by doubling them.
      if (stringValue.includes(DELIMITER) || stringValue.includes('"') || stringValue.includes('\n')) {
        stringValue = stringValue.replace(/"/g, '""');
        return `"${stringValue}"`;
      }
      return stringValue;
    };

    // Add BOM for UTF-8 encoding. No 'sep=,' or special header needed for semicolon delimited CSVs.
    let csvContent = '\uFEFF' + headers.map(escapeCsvValue).join(DELIMITER) + '\n';

    compras.forEach(compra => {
      if (compra.detalles && compra.detalles.length > 0) {
        compra.detalles.forEach(detalle => {
          const row = [
            escapeCsvValue(compra.id_compra),
            escapeCsvValue(compra.nombre_proveedor),
            escapeCsvValue(new Date(compra.fecha_compra).toLocaleDateString('es-ES')),
            escapeCsvValue(compra.total_compra.toFixed(2)),
            escapeCsvValue(detalle.tipo_item),
            escapeCsvValue(detalle.nombre_item),
            escapeCsvValue(detalle.cantidad),
            escapeCsvValue(detalle.costo_unitario.toFixed(2)),
            escapeCsvValue(detalle.lote_comprado || 'N/A'),
            escapeCsvValue(detalle.fecha_caducidad_comprado ? new Date(detalle.fecha_caducidad_comprado + 'T00:00:00').toLocaleDateString('es-ES') : 'N/A') // Ensure date parsing for consistency
          ];
          csvContent += row.join(DELIMITER) + '\n';
        });
      } else {
        // Fallback for purchases without details (should ideally not happen with current logic)
        const row = [
          escapeCsvValue(compra.id_compra),
          escapeCsvValue(compra.nombre_proveedor),
          escapeCsvValue(new Date(compra.fecha_compra).toLocaleDateString('es-ES')),
          escapeCsvValue(compra.total_compra.toFixed(2)),
          escapeCsvValue('N/A'), escapeCsvValue('N/A'), escapeCsvValue('N/A'), escapeCsvValue('N/A'), escapeCsvValue('N/A'), escapeCsvValue('N/A') // Empty values for details
        ];
        csvContent += row.join(DELIMITER) + '\n';
      }
    });

    // Use 'text/csv' MIME type, and keep .csv extension
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `historial_compras_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess('Historial de compras exportado a CSV.');
    } else {
      showError('Tu navegador no soporta la descarga de archivos CSV directamente.');
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
      // cargarDatos() will be called by realtime listener for 'medicamentos'
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
      // cargarDatos() will be called by realtime listener for 'suministros'
    } catch (err: any) {
      console.error('Error al añadir suministro:', err);
      showError('Error al añadir suministro: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white font-inter">
        <Loader2 className="animate-spin mr-3 text-blue-400" size={36} />
        <p className="text-xl text-indigo-400">Cargando datos de proveedores y compras...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-950 text-white space-y-12 min-h-screen font-inter">
      <h2 className="text-3xl font-extrabold text-indigo-400 text-center mb-8 flex items-center justify-center gap-2">
        <Truck size={30} /> Gestión de Proveedores y Compras
      </h2>

      {/* Feedback messages (success/error/guidance) */}
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
      {purchaseGuidance && (
        <div className="bg-blue-800 text-blue-100 p-4 rounded-lg text-center border border-blue-600 mb-6 flex items-center justify-between shadow-md animate-fade-in">
          <Info size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">{purchaseGuidance}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setPurchaseGuidance(null)} />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => setActiveTab('proveedores')}
          className={`px-6 py-3 rounded-t-lg font-semibold transition ${
            activeTab === 'proveedores' ? 'bg-indigo-700 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Proveedores
        </button>
        <button
          onClick={() => setActiveTab('compras')}
          className={`px-6 py-3 rounded-t-lg font-semibold transition ${
            activeTab === 'compras' ? 'bg-indigo-700 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Compras
        </button>
      </div>

      {/* Providers Tab Content */}
      {activeTab === 'proveedores' && (
        <section className="bg-gray-800 p-6 rounded-xl shadow-lg border border-blue-800">
          <h3 className="text-2xl text-indigo-300 mb-6 font-semibold flex items-center gap-2">
            <Info size={24} /> Listado de Proveedores
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-700 mb-8">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-200 uppercase bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3">Nombre</th>
                  <th scope="col" className="px-6 py-3">Teléfono</th>
                  <th scope="col" className="px-6 py-3">Email</th>
                  <th scope="col" className="px-6 py-3">Dirección</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No hay proveedores registrados.</td>
                  </tr>
                ) : (
                  proveedores.map(prov => (
                    <tr key={prov.id_proveedor} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700 transition-colors duration-200">
                      <td className="px-6 py-4 font-medium text-white">{prov.nombre}</td>
                      <td className="px-6 py-4">{prov.telefono || 'N/A'}</td>
                      <td className="px-6 py-4">{prov.email || 'N/A'}</td>
                      <td className="px-6 py-4">{prov.direccion || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <h3 className="text-2xl text-indigo-300 mb-4 font-semibold flex items-center gap-2">
            <PlusCircle size={24} /> Añadir Nuevo Proveedor
          </h3>
          <form onSubmit={handleAddProveedor} className="space-y-4">
            <div>
              <label htmlFor="nombre_prov" className="block text-sm font-medium text-gray-300">Nombre:</label>
              <input
                type="text"
                id="nombre_prov"
                name="nombre"
                value={newProveedor.nombre}
                onChange={handleNewProveedorChange}
                className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="telefono_prov" className="block text-sm font-medium text-gray-300">Teléfono:</label>
              <input
                type="text"
                id="telefono_prov"
                name="telefono"
                value={newProveedor.telefono || ''}
                onChange={handleNewProveedorChange}
                className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="email_prov" className="block text-sm font-medium text-gray-300">Email:</label>
              <input
                type="email"
                id="email_prov"
                name="email"
                value={newProveedor.email || ''}
                onChange={handleNewProveedorChange}
                className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="direccion_prov" className="block text-sm font-medium text-gray-300">Dirección:</label>
              <input
                type="text"
                id="direccion_prov"
                name="direccion"
                value={newProveedor.direccion || ''}
                onChange={handleNewProveedorChange}
                className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition shadow-md"
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="animate-spin mr-2" size={20} /> : 'Añadir Proveedor'}
            </button>
          </form>
        </section>
      )}

      {/* Purchases Tab Content */}
      {activeTab === 'compras' && (
        <section className="bg-gray-800 p-6 rounded-xl shadow-lg border border-blue-800">
          <h3 className="text-2xl text-indigo-300 mb-6 font-semibold flex items-center gap-2">
            <ShoppingCart size={24} /> Registrar Nueva Compra
          </h3>
          <form onSubmit={handleAddCompra} className="space-y-6">
            {/* Purchase Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="id_proveedor" className="block text-sm font-medium text-gray-300">Proveedor:</label>
                <select
                  id="id_proveedor"
                  name="id_proveedor"
                  value={newCompra.id_proveedor || ''}
                  onChange={handleNewCompraChange}
                  className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">Selecciona un proveedor</option>
                  {proveedores.map(prov => (
                    <option key={prov.id_proveedor} value={prov.id_proveedor}>
                      {prov.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="fecha_compra" className="block text-sm font-medium text-gray-300">Fecha de Compra:</label>
                <input
                  type="date"
                  id="fecha_compra"
                  name="fecha_compra"
                  value={newCompra.fecha_compra}
                  onChange={handleNewCompraChange}
                  className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Purchase Details (Add Items) */}
            <div className="border-t border-gray-700 pt-6 mt-6">
              <h4 className="text-xl font-semibold text-indigo-400 mb-4 flex items-center gap-2">
                <Package size={20} /> Añadir Ítems a la Compra
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label htmlFor="tipo_item" className="block text-sm font-medium text-gray-300">Tipo de Ítem:</label>
                  <select
                    id="tipo_item"
                    name="tipo_item"
                    value={newDetalleCompraItem.tipo_item}
                    onChange={handleNewDetalleCompraItemChange}
                    className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Selecciona tipo</option>
                    <option value="medicamento">Medicamento</option>
                    <option value="suministro">Suministro</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="id_referencia_item" className="block text-sm font-medium text-gray-300">Seleccionar Ítem:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <select
                      id="id_referencia_item"
                      name="id_referencia_item"
                      value={newDetalleCompraItem.id_referencia_item || ''}
                      onChange={handleNewDetalleCompraItemChange}
                      className="block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      disabled={!newDetalleCompraItem.tipo_item}
                    >
                      <option value="">Selecciona un ítem</option>
                      {newDetalleCompraItem.tipo_item === 'medicamento' &&
                        medicamentosCatalogo.map(med => (
                          <option key={med.id_medicamento} value={med.id_medicamento}>
                            {med.nombre_generico} ({med.nombre_comercial || 'N/A'})
                          </option>
                        ))}
                      {newDetalleCompraItem.tipo_item === 'suministro' &&
                        suministrosCatalogo.map(sum => (
                          <option key={sum.id_suministro} value={sum.id_suministro}>
                            {sum.nombre} ({sum.unidad_medida || 'N/A'})
                          </option>
                        ))}
                    </select>
                    {/* Buttons to create new catalog items */}
                    {newDetalleCompraItem.tipo_item === 'medicamento' && (
                      <button type="button" onClick={() => setShowNewMedicineModal(true)}
                              className="p-2.5 bg-purple-600 rounded-md hover:bg-purple-700 text-white flex items-center justify-center transition-colors"
                              title="Registrar Nuevo Medicamento al Catálogo">
                        <FlaskConical size={20} />
                      </button>
                    )}
                    {newDetalleCompraItem.tipo_item === 'suministro' && (
                      <button type="button" onClick={() => setShowNewSuministroModal(true)}
                              className="p-2.5 bg-purple-600 rounded-md hover:bg-purple-700 text-white flex items-center justify-center transition-colors"
                              title="Registrar Nuevo Suministro al Catálogo">
                        <Wrench size={20} />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="cantidad" className="block text-sm font-medium text-gray-300">Cantidad:</label>
                  <input
                    type="number"
                    id="cantidad"
                    name="cantidad"
                    value={newDetalleCompraItem.cantidad}
                    onChange={handleNewDetalleCompraItemChange}
                    className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="costo_unitario" className="block text-sm font-medium text-gray-300">Costo Unitario:</label>
                  <input
                    type="number"
                    id="costo_unitario"
                    name="costo_unitario"
                    value={newDetalleCompraItem.costo_unitario}
                    onChange={handleNewDetalleCompraItemChange}
                    className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                {newDetalleCompraItem.tipo_item === 'medicamento' && (
                  <>
                    <div>
                      <label htmlFor="lote_comprado" className="block text-sm font-medium text-gray-300">Lote:</label>
                      <input
                        type="text"
                        id="lote_comprado"
                        name="lote_comprado"
                        value={newDetalleCompraItem.lote_comprado}
                        onChange={handleNewDetalleCompraItemChange}
                        className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                        required={newDetalleCompraItem.tipo_item === 'medicamento'}
                      />
                    </div>
                    <div>
                      <label htmlFor="fecha_caducidad_comprado" className="block text-sm font-medium text-gray-300">Fecha Caducidad Lote:</label>
                      <input
                        type="date"
                        id="fecha_caducidad_comprado"
                        name="fecha_caducidad_comprado"
                        value={newDetalleCompraItem.fecha_caducidad_comprado}
                        onChange={handleNewDetalleCompraItemChange}
                        className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                        required={newDetalleCompraItem.tipo_item === 'medicamento'}
                      />
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddItemToCompra}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition shadow-md mt-4"
                disabled={isProcessing}
              >
                <PlusCircle size={16} className="mr-2" /> Añadir Ítem a la Lista
              </button>
            </div>

            {/* List of Items in Current Purchase */}
            {newCompra.detalles.length > 0 && (
              <div className="border-t border-gray-700 pt-6 mt-6">
                <h4 className="text-xl font-semibold text-indigo-400 mb-4">Ítems en esta Compra:</h4>
                <div className="overflow-x-auto rounded-lg border border-gray-700">
                  <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-200 uppercase bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3">Ítem</th>
                        <th scope="col" className="px-6 py-3">Tipo</th>
                        <th scope="col" className="px-6 py-3">Cantidad</th>
                        <th scope="col" className="px-6 py-3">Costo Unitario</th>
                        <th scope="col" className="px-6 py-3">Lote</th>
                        <th scope="col" className="px-6 py-3">Caducidad Lote</th>
                        <th scope="col" className="px-6 py-3">Subtotal</th>
                        <th scope="col" className="px-6 py-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newCompra.detalles.map((detalle, index) => (
                        <tr key={index} className="bg-gray-800 border-b border-gray-700">
                          <td className="px-6 py-4 font-medium text-white">{detalle.nombre_item}</td>
                          <td className="px-6 py-4 capitalize">{detalle.tipo_item}</td>
                          <td className="px-6 py-4">{detalle.cantidad}</td>
                          <td className="px-6 py-4">${detalle.costo_unitario.toFixed(2)}</td>
                          <td className="px-6 py-4">{detalle.lote_comprado || 'N/A'}</td>
                          <td className="px-6 py-4">{detalle.fecha_caducidad_comprado ? new Date(detalle.fecha_caducidad_comprado).toLocaleDateString('es-ES') : 'N/A'}</td>
                          <td className="px-6 py-4">${(detalle.cantidad * detalle.costo_unitario).toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <button type="button" onClick={() => handleRemoveItemFromCompra(index)} className="text-red-400 hover:text-red-500 transition">
                              <XCircle size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-700 font-bold text-white">
                        <td colSpan={6} className="px-6 py-4 text-right">Total de la Compra:</td>
                        <td className="px-6 py-4">${calculateCurrentCompraTotal().toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <button
              type="submit"
              className="w-full flex items-center justify-center px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition shadow-md mt-6"
              disabled={isProcessing || !newCompra.id_proveedor || newCompra.detalles.length === 0}
            >
              {isProcessing ? <Loader2 className="animate-spin mr-2" size={20} /> : 'Registrar Compra'}
            </button>
          </form>

          {/* List of Existing Purchases */}
          <h3 className="text-2xl text-indigo-300 mb-6 mt-12 font-semibold flex items-center gap-2">
            <ShoppingCart size={24} /> Historial de Compras
          </h3>
          <div className="flex justify-end mb-4">
              <button
                  onClick={exportComprasToCsv}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold flex items-center transition shadow-md"
                  disabled={compras.length === 0 || isProcessing}
              >
                  <FileText size={20} className="mr-2" /> Exportar a CSV
              </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-200 uppercase bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3">ID Compra</th>
                  <th scope="col" className="px-6 py-3">Proveedor</th>
                  <th scope="col" className="px-6 py-3">Fecha</th>
                  <th scope="col" className="px-6 py-3">Total</th>
                  <th scope="col" className="px-6 py-3">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {compras.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No hay compras registradas.</td>
                  </tr>
                ) : (
                  compras.map(compra => (
                    <tr key={compra.id_compra} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700 transition-colors duration-200">
                      <td className="px-6 py-4 font-medium text-white">{compra.id_compra}</td>
                      <td className="px-6 py-4">{compra.nombre_proveedor}</td>
                      <td className="px-6 py-4">{new Date(compra.fecha_compra).toLocaleDateString('es-ES')}</td>
                      <td className="px-6 py-4">${compra.total_compra.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <ul className="list-disc list-inside text-gray-300">
                          {compra.detalles && compra.detalles.map((detalle: DetalleCompra, idx: number) => (
                            <li key={idx}>
                              {detalle.nombre_item} ({detalle.cantidad} x ${detalle.costo_unitario.toFixed(2)})
                              {detalle.lote_comprado && ` Lote: ${detalle.lote_comprado}`}
                              {detalle.fecha_caducidad_comprado && ` Vence: ${new Date(detalle.fecha_caducidad_comprado).toLocaleDateString('es-ES')}`}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal para Añadir Nuevo Medicamento (Catálogo) */}
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

      {/* Modal para Añadir Nuevo Suministro (Catálogo) */}
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

export default ProveedoresComprasPage;
