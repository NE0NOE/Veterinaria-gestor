import React, {useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient'; // Importación centralizada
import {
  ArrowLeft, PlusCircle, Edit, Save, XCircle, Trash2, Search,
  Loader2, AlertCircle, CheckCircle, Dog, User, ClipboardList, Calendar, Pill,
  Package, Truck // Nuevos iconos para consumo/inventario
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

// --- Type Definitions (Extendidas para Consumos e Inventario) ---

type Cliente = {
  id_cliente: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  recibir_recordatorios: boolean | null;
};

type Mascota = {
  id_mascota: number;
  id_cliente: number | null; // Cambiado a null, porque si cliente es invitado, id_cliente puede ser null
  nombre: string;
  especie: string;
  raza: string | null;
  edad: number | null;
  peso: number | null;
  cliente_nombre?: string; // Propiedad derivada para mostrar el nombre del cliente
};

type HistorialClinicoEntry = {
  id_historial: number;
  id_mascota: number;
  id_cita: number | null;
  fecha_consulta: string;
  motivo_consulta: string;
  diagnostico: string;
  tratamiento: string;
  observaciones: string | null;
  detalles_tratamiento?: TratamientoDetalle[];
  prescripciones?: PrescripcionDetalle[];
  consumos?: ConsumoItem []; // NUEVO: Consumos asociados al historial
};

type TratamientoDetalle = {
  id_tratamiento_detalle?: number;
  id_historial: number;
  nombre_tratamiento: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
};

type PrescripcionDetalle = {
  id_prescripcion?: number;
  id_historial: number;
  id_medicamento: number;
  cantidad_prescrita: number;
  dosis: string;
  frecuencia: string;
  duracion: string | null;
  fecha_prescripcion: string;
  instrucciones_adicionales: string | null;
  nombre_medicamento?: string; // Propiedad opcional para mostrar el nombre en la UI
};

type MedicamentoCatalogo = {
  id_medicamento: number;
  nombre_generico: string;
  nombre_comercial: string | null;
  unidad_medida: string | null;
  principio_activo?: string | null;
  presentacion?: string | null;
  dosis_recomendada?: string | null;
  fabricante?: string | null;
  precio_venta?: number | null;
  categoria?: string | null;
  sustancia_controlada?: boolean | null;
};

// NUEVO TIPO: para el catálogo de suministros
type SuministroCatalogo = {
  id_suministro: number;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  unidad_medida: string | null;
};

// NUEVO TIPO: para los ítems en inventario_stock
type InventarioStockItem = {
  id_stock: number;
  tipo_item: 'medicamento' | 'suministro';
  id_referencia_item: number;
  cantidad: number;
  ubicacion: string | null;
  ultima_actualizacion: string;
  lote: string | null;
  fecha_caducidad_lote: string | null;
  nombre_item?: string; // Derivado para mostrar en la UI
  vencimiento_display?: string; // Derivado para mostrar fecha de vencimiento
};

// NUEVO TIPO: para los registros de consumo_historial
type ConsumoItem = {
  id_consumo?: number;
  id_historial: number;
  tipo_item: 'medicamento' | 'suministro';
  id_medicamento_consumido: number | null;
  id_suministro_consumido: number | null;
  cantidad_consumida: number;
  lote_consumido: string | null; // Lote es un string, puede ser vacío o null
  fecha_consumo: string;
  observaciones: string | null;
  nombre_item?: string; // Derivado para mostrar en la UI
};

const HistorialClinicoPage: React.FC = () => {
  const { mascotaId: urlMascotaId } = useParams<{ mascotaId?: string }>();
  const navigate = useNavigate();

  // Estados para controlar la vista
  const [viewMode, setViewMode] = useState<'clientList' | 'petList' | 'historyDetail'>(
    urlMascotaId ? 'historyDetail' : 'clientList'
  );

  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [selectedMascota, setSelectedMascota] = useState<Mascota | null>(null);

  // Datos principales
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [historialRecords, setHistorialRecords] = useState<HistorialClinicoEntry[]>([]);

  // Catálogos e Inventario
  const [medicamentosCatalogo, setMedicamentosCatalogo] = useState<MedicamentoCatalogo[]>([]);
  const [suministrosCatalogo, setSuministrosCatalogo] = useState<SuministroCatalogo[]>([]);
  const [inventarioStock, setInventarioStock] = useState<InventarioStockItem[]>([]);

  // Estados de carga y error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Para indicar si se está guardando/eliminando

  // Estados para el formulario de nuevo registro de historial
  const [newRecord, setNewRecord] = useState<Omit<HistorialClinicoEntry, 'id_historial' |
    'detalles_tratamiento' | 'prescripciones' | 'consumos'>>({
    id_mascota: 0,
    id_cita: null,
    fecha_consulta: new Date().toISOString().split('T')[0],
    motivo_consulta: "",
    diagnostico: "",
    tratamiento: "",
    observaciones: null,
  });

  const [newTratamientosDetalles, setNewTratamientosDetalles] =
    useState<Omit<TratamientoDetalle, 'id_historial' | 'id_tratamiento_detalle'>[]>([]);

  const [newPrescripciones, setNewPrescripciones] =
    useState<Omit<PrescripcionDetalle, 'id_historial' | 'id_prescripcion'>[]>([]);

  // Estado para el item de tratamiento/prescripción individual en el formulario
  const [currentNewTratamiento, setCurrentNewTratamiento] =
    useState<Omit<TratamientoDetalle, 'id_historial' | 'id_tratamiento_detalle'>>({
      nombre_tratamiento: "",
      descripcion: null,
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: null,
    });

  const [currentNewPrescripcion, setCurrentNewPrescripcion] =
    useState<Omit<PrescripcionDetalle, 'id_historial' | 'id_prescripcion' |
      'nombre_medicamento'>>({
      id_medicamento: 0,
      cantidad_prescrita: 1,
      dosis: "",
      frecuencia: "",
      duracion: null,
      fecha_prescripcion: new Date().toISOString().split('T')[0],
      instrucciones_adicionales: null,
    });

  // NUEVOS ESTADOS para el stock y estado de disponibilidad del medicamento
  // seleccionado en el formulario de prescripción
  const [selectedMedTotalStock, setSelectedMedTotalStock] = useState<number | null>(null);
  const [selectedMedAvailabilityStatus, setSelectedMedAvailabilityStatus] =
    useState<'DISPONIBLE' | 'AGOTADO' | 'NO_EN_CLINICA' | null>(null);

  // Estado para edición
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [editedRecord, setEditedRecord] = useState<HistorialClinicoEntry | null>(null);

  // Estados para el modal de consumo de ítems
  const [showConsumeItemModal, setShowConsumeItemModal] = useState(false);
  const [currentRecordForConsumption, setCurrentRecordForConsumption] =
    useState<HistorialClinicoEntry | null>(null);

  const [consumeItem, setConsumeItem] = useState<{
    tipo_item: 'medicamento' | 'suministro' | "";
    id_referencia_item: number | null;
    cantidad_consumida: number;
    lote_consumido: string;
    observaciones: string;
  }>({
    tipo_item: "",
    id_referencia_item: null,
    cantidad_consumida: 1,
    lote_consumido: "",
    observaciones: "",
  });

  const [availableLotsForConsumption, setAvailableLotsForConsumption] =
    useState<InventarioStockItem[]>([]);

  //--- Funciones de Utilidad y Fetching (Mantienen useCallback)

  const showSuccess = useCallback((message: string) => {
    setSuccess(message);
    setError(null);
    setTimeout(() => setSuccess(null), 5000);
  }, []);

  const showError = useCallback((message: string) => {
    setError(message);
    setSuccess(null);
    setTimeout(() => setError(null), 8000);
  }, []);

  const clearMessages = useCallback(() => {
    setSuccess(null);
    setError(null);
  }, []);

  // Función para cargar clientes
  const fetchClientes = useCallback(async () => {
    setIsLoading(true);
    clearMessages();
    try {
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true });

      if (clientesError) throw clientesError;
      setClientes(clientesData || []);
    } catch (err: any) {
      console.error('Error al cargar clientes:', err);
      showError('Error al cargar clientes: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [clearMessages, showError]);

  // Función para cargar mascotas de un cliente específico
  const fetchMascotas = useCallback(async (clientId: number) => {
    setIsLoading(true);
    clearMessages();
    try {
      const { data: mascotasData, error: mascotasError } = await supabase
        .from('mascotas')
        .select('*')
        .eq('id_cliente', clientId)
        .order('nombre', { ascending: true });

      if (mascotasError) throw mascotasError;
      setMascotas(mascotasData || []);
    } catch (err: any) {
      console.error('Error al cargar mascotas:', err);
      showError('Error al cargar mascotas: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [clearMessages, showError]);

  // Función para cargar catálogos y el inventario
  const fetchCatalogsAndInventory = useCallback(async () => {
    try {
      const [{ data: medsData, error: medsError },
             { data: sumsData, error: sumsError },
             { data: invData, error: invError }] = await Promise.all([
          supabase.from('medicamentos').select('*'),
          supabase.from('suministros').select('*'),
          supabase.from('inventario_stock').select('*')
      ]);

      if (medsError) throw medsError;
      setMedicamentosCatalogo(medsData || []);

      if (sumsError) throw sumsError;
      setSuministrosCatalogo(sumsData || []);

      if (invError) throw invError;
      const enhancedInventario = (invData || []).map(item => {
        let nombre_item = 'Desconocido';
        let vencimiento_display = null;
        if (item.tipo_item === 'medicamento') {
          const med = (medsData || []).find(m => m.id_medicamento === item.id_referencia_item);
          nombre_item = med ? (med.nombre_generico || med.nombre_comercial ||
            'Medicamento Desconocido') : `Med. ID ${item.id_referencia_item}`;
          if (item.fecha_caducidad_lote) {
            vencimiento_display = new Date(item.fecha_caducidad_lote +
              'T00:00:00').toLocaleDateString('es-ES');
          }
        } else if (item.tipo_item === 'suministro') {
          const sum = (sumsData || []).find(s => s.id_suministro === item.id_referencia_item);
          nombre_item = sum ? sum.nombre : `Sum. ID ${item.id_referencia_item}`;
        }
        return { ...item, nombre_item, vencimiento_display };
      });
      setInventarioStock(enhancedInventario);
    } catch (err: any) {
      console.error('Error al cargar catálogos o inventario:', err);
      showError('Error al cargar catálogos o inventario: ' + err.message);
    }
  }, [showError]);

  // Función para cargar el historial de una mascota específica
  const fetchHistorial = useCallback(async (mascotaId: number) => {
    setIsLoading(true);
    clearMessages();
    try {
      const { data: historialData, error: historialError } = await supabase
        .from('historial_clinico')
        .select('*')
        .eq('id_mascota', mascotaId)
        .order('fecha_consulta', { ascending: false });

      if (historialError) throw historialError;

      const processedHistorial: HistorialClinicoEntry[] = [];
      const allMedicamentos = medicamentosCatalogo;
      const allSuministros = suministrosCatalogo;

      for (const entry of (historialData || [])) {
        const [{ data: tratamientosData, error: tratamientosError },
               { data: prescripcionesData, error: prescripcionesError },
               { data: consumosData, error: consumosError }] = await Promise.all([
            supabase.from('tratamientos_detalles').select('*').eq('id_historial',
              entry.id_historial).order('fecha_inicio', { ascending: false }),
            supabase.from('prescripciones').select('*').eq('id_historial',
              entry.id_historial).order('fecha_prescripcion', { ascending: false }),
            supabase.from('consumos_historial').select('*').eq('id_historial',
              entry.id_historial).order('fecha_consumo', { ascending: false })
        ]);

        if (tratamientosError) throw tratamientosError;
        if (prescripcionesError) throw prescripcionesError;
        if (consumosError) throw consumosError;

        const linkedPrescripciones = (prescripcionesData || []).map(p => ({
          ...p,
          nombre_medicamento: allMedicamentos.find(m => m.id_medicamento ===
            p.id_medicamento)?.nombre_generico || 'Medicamento Desconocido'
        }));

        const linkedConsumos = (consumosData || []).map(c => {
          let nombre_item = 'Desconocido';
          if (c.tipo_item === 'medicamento' && c.id_medicamento_consumido) {
            const med = allMedicamentos.find(m => m.id_medicamento ===
              c.id_medicamento_consumido);
            nombre_item = med ? (med.nombre_generico || med.nombre_comercial ||
              'Medicamento Consumido') : `Med. ID ${c.id_medicamento_consumido}`;
          } else if (c.tipo_item === 'suministro' && c.id_suministro_consumido) {
            const sum = allSuministros.find(s => s.id_suministro === c.id_suministro_consumido);
            nombre_item = sum ? sum.nombre : `Sum. ID ${c.id_suministro_consumido}`;
          }
          return { ...c, nombre_item };
        });

        processedHistorial.push({
          ...entry,
          detalles_tratamiento: tratamientosData || [],
          prescripciones: linkedPrescripciones,
          consumos: linkedConsumos,
        });
      }
      setHistorialRecords(processedHistorial);
      setNewRecord(prev => ({ ...prev, id_mascota: mascotaId }));
    } catch (err: any) {
      console.error('Error al cargar historial clínico:', err);
      showError('Error al cargar historial clínico: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [clearMessages, showError, medicamentosCatalogo, suministrosCatalogo]);

  // --- useEffect 1: Carga inicial de catálogos e inventario y sus listeners Realtime ---
  useEffect(() => {
    fetchCatalogsAndInventory(); // Llamada inicial al montar

    // Suscripciones de Realtime para catálogos e inventario
    const medicamentosChannel = supabase
      .channel('medicamentos_changes_historial_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicamentos' }, () => {
        console.log('Realtime change for medicamentos received. Refetching catalogs and inventory.');
        fetchCatalogsAndInventory();
      })
      .subscribe();

    const suministrosChannel = supabase
      .channel('suministros_changes_historial_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suministros' }, () => {
        console.log('Realtime change for suministros received. Refetching catalogs and inventory.');
        fetchCatalogsAndInventory();
      })
      .subscribe();

    const inventarioStockChannel = supabase
      .channel('inventario_stock_changes_historial_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario_stock' }, () => {
        console.log('Realtime change for inventario_stock received. Refetching catalogs and inventory.');
        fetchCatalogsAndInventory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(medicamentosChannel);
      supabase.removeChannel(suministrosChannel);
      supabase.removeChannel(inventarioStockChannel);
      console.log('Unsubscribed from catalogs and inventory channels.');
    };
  }, [fetchCatalogsAndInventory]);

  // --- useEffect 2: Carga de datos de la vista actual y otros listeners Realtime ---
  useEffect(() => {
    const areCatalogsReady = medicamentosCatalogo.length > 0 || suministrosCatalogo.length > 0;

    if (!areCatalogsReady && viewMode === 'historyDetail') {
      console.log("HistorialClinicoPage: Esperando carga de catálogos e inventario para la vista de historial...");
      setIsLoading(true);
      return;
    }

    // Suscripciones en tiempo real para el historial clínico y sus detalles
    const historialChannel = supabase
      .channel('historial_clinico_changes_main')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_clinico' }, payload => {
        console.log('Realtime change for historial_clinico received:', payload);
        if (selectedMascota) fetchHistorial(selectedMascota.id_mascota);
      })
      .subscribe();

    const tratamientosChannel = supabase
      .channel('tratamientos_detalles_changes_main')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tratamientos_detalles' }, payload => {
        console.log('Realtime change for tratamientos_detalles received:', payload);
        if (selectedMascota) fetchHistorial(selectedMascota.id_mascota);
      })
      .subscribe();

    const prescripcionesChannel = supabase
      .channel('prescripciones_changes_main')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescripciones' }, payload => {
        console.log('Realtime change for prescripciones received:', payload);
        if (selectedMascota) fetchHistorial(selectedMascota.id_mascota);
      })
      .subscribe();

    const consumosHistorialChannel = supabase
      .channel('consumos_historial_changes_main')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consumos_historial' }, payload => {
        console.log('Realtime change for consumos_historial received:', payload);
        if (selectedMascota) fetchHistorial(selectedMascota.id_mascota);
      })
      .subscribe();

    if (viewMode === 'clientList') {
      fetchClientes();
    } else if (viewMode === 'petList' && selectedClient) {
      fetchMascotas(selectedClient.id_cliente);
    } else if (viewMode === 'historyDetail') {
      if (urlMascotaId && !selectedMascota) {
        const loadMascotaAndHistoryFromUrl = async () => {
          setIsLoading(true);
          clearMessages();
          try {
            // Actualizado para seleccionar nombre, email y teléfono del cliente
            const { data: mascotaData, error: mascotaError } = await supabase
              .from('mascotas')
              .select(`*, clientes(id_cliente, nombre, email, telefono)`)
              .eq('id_mascota', parseInt(urlMascotaId))
              .single();

            if (mascotaError) throw mascotaError;
            if (!mascotaData) {
              showError("Mascota no encontrada para la URL.");
              setIsLoading(false);
              return;
            }

            // Set selectedMascota with the derived client name
            // Prioriza el nombre del cliente enlazado o 'Desconocido'
            setSelectedMascota({
              ...mascotaData,
              cliente_nombre: (mascotaData as any).clientes?.nombre || 'Desconocido'
            });

            // Establecer selectedClient con la información completa del cliente
            if (mascotaData.clientes) {
                setSelectedClient({
                    id_cliente: (mascotaData as any).clientes.id_cliente,
                    // CORRECCIÓN CLAVE: Asegurar un fallback para el nombre del cliente
                    nombre: (mascotaData as any).clientes.nombre || 'Nombre no disponible',
                    email: (mascotaData as any).clientes.email,
                    telefono: (mascotaData as any).clientes.telefono,
                    direccion: null,
                    ciudad: null,
                    recibir_recordatorios: null
                });
            } else {
                setSelectedClient(null); // Asegurar que sea null si no hay cliente
            }

            if (areCatalogsReady) {
              await fetchHistorial(parseInt(urlMascotaId));
            } else {
              console.log("Catálogos aún no cargados para fetchHistorial desde URL, esperando...");
            }
          } catch (err: any) {
            console.error('Error al cargar mascota o historial desde URL:', err);
            showError('Error al cargar la mascota o su historial: ' + err.message);
          } finally {
            setIsLoading(false);
          }
        };
        loadMascotaAndHistoryFromUrl();
      } else if (selectedMascota && areCatalogsReady) {
        fetchHistorial(selectedMascota.id_mascota);
      } else if (selectedMascota && !areCatalogsReady) {
        setIsLoading(true);
        console.log("HistorialClinicoPage: Mascota seleccionada, pero esperando catálogos para fetchHistorial.");
      }
    }

    return () => {
      supabase.removeChannel(historialChannel);
      supabase.removeChannel(tratamientosChannel);
      supabase.removeChannel(prescripcionesChannel);
      supabase.removeChannel(consumosHistorialChannel);
      console.log('Desuscribiéndose de los canales principales relacionados con el historial.');
    };
  }, [viewMode, selectedClient, selectedMascota, urlMascotaId,
      fetchClientes, fetchMascotas, fetchHistorial,
      medicamentosCatalogo.length, suministrosCatalogo.length,
      showError, clearMessages]);

  //--- Handlers para Navegación ---
  const handleSelectClient = (client: Cliente) => {
    setSelectedClient(client);
    setMascotas([]);
    setViewMode('petList');
    setHistorialRecords([]);
    setSelectedMascota(null);
  };

  const handleBackToClients = () => {
    setSelectedClient(null);
    setMascotas([]);
    setViewMode('clientList');
    setHistorialRecords([]);
    setSelectedMascota(null);
  };

  const handleSelectMascota = (mascota: Mascota) => {
    setSelectedMascota(mascota);
    setHistorialRecords([]);
    setViewMode('historyDetail');
    // Cuando seleccionamos una mascota, si tiene un id_cliente asociado,
    // debemos cargar la información completa de ese cliente para 'selectedClient'
    if (mascota.id_cliente) {
        const client = clientes.find(c => c.id_cliente === mascota.id_cliente);
        if (client) {
            setSelectedClient({
                ...client,
                // CORRECCIÓN CLAVE: Asegurar un fallback para el nombre del cliente
                nombre: client.nombre || 'Nombre no disponible',
            });
        } else {
            setSelectedClient(null);
        }
    } else {
        setSelectedClient(null); // Si no hay id_cliente, resetear selectedClient
    }
  };

  const handleBackToPets = () => {
    setSelectedMascota(null);
    setHistorialRecords([]);
    setViewMode('petList');
  };

  //--- Handlers para Nuevo Registro de Historial ---
  const handleNewRecordChange = (e: React.ChangeEvent<HTMLInputElement |
    HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewRecord(prev => ({ ...prev, [name]: value }));
  };

  const handleNewTratamientoChange = (e: React.ChangeEvent<HTMLInputElement |
    HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentNewTratamiento(prev => prev ? { ...prev, [name]: value } : prev);
  };

  const addTratamientoToNewRecord = () => {
    clearMessages();
    if (!currentNewTratamiento.nombre_tratamiento ||
      !currentNewTratamiento.fecha_inicio) {
      showError('Nombre y fecha de inicio del tratamiento son obligatorios.');
      return;
    }
    setNewTratamientosDetalles(prev => [...prev, currentNewTratamiento]);
    setCurrentNewTratamiento({
      nombre_tratamiento: '', descripcion: null,
      fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin: null
    });
    showSuccess("Tratamiento añadido a la lista.");
  };

  const removeTratamientoFromNewRecord = (index: number) => {
    setNewTratamientosDetalles(prev => prev.filter((_, i) => i !== index));
    showSuccess("Tratamiento eliminado de la lista.");
  };

  const handleNewPrescripcionChange = (e:
    React.ChangeEvent<HTMLSelectElement | HTMLInputElement |
    HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'id_medicamento') {
      const medId = parseInt(value);
      setCurrentNewPrescripcion(prev => ({
        ...prev!,
        [name]: medId
      }));
      // Determinar el estado de disponibilidad del medicamento
      const matchingStockItems = inventarioStock.filter(item =>
        item.tipo_item === 'medicamento' && item.id_referencia_item === medId
      );
      if (matchingStockItems.length === 0) {
        setSelectedMedAvailabilityStatus('NO_EN_CLINICA');
        setSelectedMedTotalStock(0);
      } else {
        const totalStock = matchingStockItems.reduce((sum, item) => sum + item.cantidad, 0);
        setSelectedMedTotalStock(totalStock);
        if (totalStock === 0) {
          setSelectedMedAvailabilityStatus('AGOTADO');
        } else {
          setSelectedMedAvailabilityStatus('DISPONIBLE');
        }
      }
    } else {
      setCurrentNewPrescripcion(prev => ({
        ...prev!,
        [name]: (name === 'cantidad_prescrita') ? parseInt(value) : value
      }));
    }
  };

  const addPrescripcionToNewRecord = () => {
    clearMessages();
    if (!currentNewPrescripcion.id_medicamento || currentNewPrescripcion.id_medicamento
      === 0 ||
      !currentNewPrescripcion.cantidad_prescrita ||
      currentNewPrescripcion.cantidad_prescrita <= 0 ||
      !currentNewPrescripcion.dosis || !currentNewPrescripcion.frecuencia ||
      !currentNewPrescripcion.fecha_prescripcion
    ) {
      showError('Por favor, completa todos los campos obligatorios para la prescripción (medicamento, cantidad, dosis, frecuencia, fecha).');
      return;
    }

    // --- LÓGICA DE VERIFICACIÓN DE STOCK Y ADVERTENCIA MEJORADA ---
    const requiredQuantity = currentNewPrescripcion.cantidad_prescrita;
    const medicationName = medicamentosCatalogo.find(m => m.id_medicamento ===
      currentNewPrescripcion.id_medicamento)?.nombre_generico || 'Medicamento Desconocido';

    let confirmMessage = '';
    let proceedWithPrescription = true;

    if (selectedMedAvailabilityStatus === 'NO_EN_CLINICA') {
      // Usar un modal personalizado en lugar de window.confirm para mejor UX
      // Por simplicidad en este ejemplo, se mantiene window.confirm, pero se recomienda cambiarlo.
      confirmMessage = `Advertencia: El medicamento "${medicationName}" no está registrado como disponible en la clínica. \n\n¿Desea continuar con esta prescripción? (Esta acción solo registra la prescripción y NO afecta el inventario).`;
      proceedWithPrescription = window.confirm(confirmMessage);
    } else if (selectedMedAvailabilityStatus === 'AGOTADO') {
      confirmMessage = `Advertencia: El medicamento "${medicationName}" está actualmente AGOTADO en la clínica. \n\n¿Desea continuar con esta prescripción? (Esta acción solo registra la prescripción y NO afecta el inventario).`;
      proceedWithPrescription = window.confirm(confirmMessage);
    } else if (selectedMedAvailabilityStatus === 'DISPONIBLE' && selectedMedTotalStock !==
      null && requiredQuantity > selectedMedTotalStock) {
      confirmMessage = `Advertencia: La cantidad prescrita de "${medicationName}" (${requiredQuantity} unid.) es mayor que el stock disponible (${selectedMedTotalStock} unid.).\n\n¿Desea continuar con esta prescripción de todos modos? (Esta acción solo registra la prescripción y NO afecta el inventario directamente).`;
      proceedWithPrescription = window.confirm(confirmMessage);
    }

    if (!proceedWithPrescription) {
      showError("Prescripción cancelada por el usuario.");
      return;
    }

    // --- FIN DE LÓGICA DE VERIFICACIÓN DE STOCK Y ADVERTENCIA ---

    const medName = medicamentosCatalogo.find(m => m.id_medicamento ===
      currentNewPrescripcion.id_medicamento)?.nombre_generico || 'Medicamento Desconocido';

    setNewPrescripciones(prev => [...prev, { ...currentNewPrescripcion,
      nombre_medicamento: medName
    }]);

    // Resetear los estados de prescripción y stock
    setCurrentNewPrescripcion({
      id_medicamento: 0, cantidad_prescrita: 1, dosis: '', frecuencia: '',
      duracion: null, fecha_prescripcion: new Date().toISOString().split('T')[0],
      instrucciones_adicionales: null,
    });
    setSelectedMedTotalStock(null);
    setSelectedMedAvailabilityStatus(null);
    showSuccess("Prescripción añadida a la lista.");
  };

  const removePrescripcionFromNewRecord = (index: number) => {
    setNewPrescripciones(prev => prev.filter((_, i) => i !== index));
    showSuccess("Prescripción eliminada de la lista.");
  };

  const handleAddHistorialRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!selectedMascota) {
      showError('No hay mascota seleccionada.');
      return;
    }
    if (!newRecord.motivo_consulta || !newRecord.diagnostico ||
      !newRecord.tratamiento || !newRecord.fecha_consulta) {
      showError('Por favor, completa los campos obligatorios del historial clínico.');
      return;
    }
    setIsProcessing(true);
    try {
      const { data: historialData, error: historialError } = await supabase
        .from('historial_clinico')
        .insert([{ ...newRecord, id_mascota: selectedMascota.id_mascota }])
        .select()
        .single();

      if (historialError) throw historialError;
      const id_historial_nuevo = historialData.id_historial;

      // Insertar tratamientos detalles
      for (const tratamiento of newTratamientosDetalles) {
        const { error: tratamientoError } = await supabase
          .from('tratamientos_detalles')
          .insert([{ ...tratamiento, id_historial: id_historial_nuevo }]);
        if (tratamientoError) throw tratamientoError;
      }

      // Insertar prescripciones
      for (const prescripcion of newPrescripciones) {
        const { error: prescripcionError } = await supabase
          .from('prescripciones')
          .insert([{
            id_historial: id_historial_nuevo,
            id_medicamento: prescripcion.id_medicamento,
            cantidad_prescrita: prescripcion.cantidad_prescrita,
            dosis: prescripcion.dosis,
            frecuencia: prescripcion.frecuencia,
            duracion: prescripcion.duracion,
            fecha_prescripcion: prescripcion.fecha_prescripcion,
            instrucciones_adicionales: prescripcion.instrucciones_adicionales,
          }]);
        if (prescripcionError) throw prescripcionError;
      }

      showSuccess("Nuevo registro de historial creado exitosamente.");
      // Resetear el formulario y recargar historial
      setNewRecord({
        id_mascota: selectedMascota.id_mascota,
        id_cita: null,
        fecha_consulta: new Date().toISOString().split('T')[0],
        motivo_consulta: '',
        diagnostico: '',
        tratamiento: '',
        observaciones: null,
      });
      setNewTratamientosDetalles([]);
      setNewPrescripciones([]);
      setCurrentNewTratamiento({ nombre_tratamiento: '', descripcion: null,
        fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin: null
      });
      setCurrentNewPrescripcion({ id_medicamento: 0, cantidad_prescrita: 1, dosis: '',
        frecuencia: '',
        duracion: null, fecha_prescripcion: new Date().toISOString().split('T')[0],
        instrucciones_adicionales: null
      });
      setSelectedMedTotalStock(null);
      setSelectedMedAvailabilityStatus(null); // También resetear el estado de disponibilidad
      fetchHistorial(selectedMascota.id_mascota); // Recargar el historial después de añadir
    } catch (err: any) {
      console.error('Error al añadir registro de historial:', err);
      showError('Error al añadir registro de historial: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Handlers para Edición ---
  const handleEditClick = (record: HistorialClinicoEntry) => {
    clearMessages();
    setEditingRecordId(record.id_historial);
    setEditedRecord({ ...record });
    setNewTratamientosDetalles(record.detalles_tratamiento || []);
    setNewPrescripciones((record.prescripciones || []).map(p => ({
      ...p,
      cantidad_prescrita: p.cantidad_prescrita || 1,
      frecuencia: p.frecuencia || '',
      instrucciones_adicionales: p.instrucciones_adicionales || null,
      duracion: p.duracion || null
    })));
    setSelectedMedTotalStock(null); // Limpiar stock al editar para no confundir
    setSelectedMedAvailabilityStatus(null);
  };

  const handleCancelEdit = () => {
    clearMessages();
    setEditingRecordId(null);
    setEditedRecord(null);
    setNewTratamientosDetalles([]);
    setNewPrescripciones([]);
    setCurrentNewTratamiento({ nombre_tratamiento: '', descripcion: null,
      fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin: null
    });
    setCurrentNewPrescripcion({ id_medicamento: 0, cantidad_prescrita: 1, dosis: '',
      frecuencia: '',
      duracion: null, fecha_prescripcion: new Date().toISOString().split('T')[0],
      instrucciones_adicionales: null
    });
    setSelectedMedTotalStock(null);
    setSelectedMedAvailabilityStatus(null);
  };

  const handleEditedRecordChange = (e: React.ChangeEvent<HTMLInputElement |
    HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedRecord(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!editedRecord || !editingRecordId) {
      showError('No hay registro para editar.');
      return;
    }
    // Corregido: removida la doble verificación que causaba un error lógico
    if (!editedRecord.motivo_consulta || !editedRecord.diagnostico ||
      !editedRecord.tratamiento || !editedRecord.fecha_consulta) {
      showError('Por favor, completa los campos obligatorios del historial clínico.');
      return;
    }
    setIsProcessing(true);
    try {
      const { error: updateHistorialError } = await supabase
        .from('historial_clinico')
        .update({
          fecha_consulta: editedRecord.fecha_consulta,
          motivo_consulta: editedRecord.motivo_consulta,
          diagnostico: editedRecord.diagnostico,
          tratamiento: editedRecord.tratamiento,
          observaciones: editedRecord.observaciones,
        })
        .eq('id_historial', editingRecordId);
      if (updateHistorialError) throw updateHistorialError;

      // Eliminar tratamientos y prescripciones existentes y re-insertar
      await supabase.from('tratamientos_detalles').delete().eq('id_historial', editingRecordId);
      for (const tratamiento of newTratamientosDetalles) {
        const { error: insertTratamientoError } = await supabase
          .from('tratamientos_detalles')
          .insert([{ ...tratamiento, id_historial: editingRecordId }]);
        if (insertTratamientoError) throw insertTratamientoError;
      }

      await supabase.from('prescripciones').delete().eq('id_historial', editingRecordId);
      for (const prescripcion of newPrescripciones) {
        const { error: insertPrescripcionError } = await supabase
          .from('prescripciones')
          .insert([{
            id_historial: editingRecordId,
            id_medicamento: prescripcion.id_medicamento,
            cantidad_prescrita: prescripcion.cantidad_prescrita,
            dosis: prescripcion.dosis,
            frecuencia: prescripcion.frecuencia,
            duracion: prescripcion.duracion,
            fecha_prescripcion: prescripcion.fecha_prescripcion,
            instrucciones_adicionales: prescripcion.instrucciones_adicionales,
          }]);
        if (insertPrescripcionError) throw insertPrescripcionError;
      }

      showSuccess("Registro de historial actualizado exitosamente.");
      setEditingRecordId(null);
      setEditedRecord(null);
      setNewTratamientosDetalles([]);
      setNewPrescripciones([]);
      setCurrentNewTratamiento({ nombre_tratamiento: '', descripcion: null,
        fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin: null
      });
      setCurrentNewPrescripcion({ id_medicamento: 0, cantidad_prescrita: 1, dosis: '',
        frecuencia: '',
        duracion: null, fecha_prescripcion: new Date().toISOString().split('T')[0],
        instrucciones_adicionales: null
      });
      setSelectedMedTotalStock(null);
      setSelectedMedAvailabilityStatus(null);
      if (selectedMascota) { // Recargar solo si hay una mascota seleccionada
          fetchHistorial(selectedMascota.id_mascota);
      }
    } catch (err: any) {
      console.error('Error al actualizar registro de historial:', err);
      showError('Error al actualizar registro de historial: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRecord = async (id_historial: number) => {
    // Usar modal de confirmación en lugar de window.confirm
    // Por simplicidad en este ejemplo, se mantiene window.confirm, pero se recomienda cambiarlo.
    if (!window.confirm("¿Estás seguro de que quieres eliminar este registro de historial clínico y todos sus tratamientos, prescripciones y consumos asociados?")) {
      return;
    }
    setIsProcessing(true);
    clearMessages();
    try {
      // 1. Eliminar consumos_historial asociados primero
      const { error: deleteConsumosError } = await supabase
        .from('consumos_historial')
        .delete()
        .eq('id_historial', id_historial);
      if (deleteConsumosError) throw deleteConsumosError;

      // 2. Eliminar tratamientos_detalles asociados
      const { error: deleteTreatmentsError } = await supabase
        .from('tratamientos_detalles')
        .delete()
        .eq('id_historial', id_historial);
      if (deleteTreatmentsError) throw deleteTreatmentsError;

      // 3. Eliminar prescripciones asociadas
      const { error: deletePrescriptionsError } = await supabase
        .from('prescripciones')
        .delete()
        .eq('id_historial', id_historial);
      if (deletePrescriptionsError) throw deletePrescriptionsError;

      // 4. Finalmente, eliminar el registro de historial clínico
      const { error: historialError } = await supabase
        .from('historial_clinico')
        .delete()
        .eq('id_historial', id_historial);
      if (historialError) throw historialError;

      showSuccess("Registro de historial eliminado exitosamente.");
      setHistorialRecords(prev => prev.filter(rec => rec.id_historial !== id_historial));
    } catch (err: any) {
      console.error('Error al eliminar registro:', err);
      showError('Error al eliminar registro: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Handlers: Consumo de Ítems (Despacho) CRUD ---
  const openConsumeItemModal = (record: HistorialClinicoEntry) => {
    clearMessages();
    setCurrentRecordForConsumption(record);
    setConsumeItem({
      tipo_item: '',
      id_referencia_item: null,
      cantidad_consumida: 1,
      lote_consumido: '',
      observaciones: '',
    });
    setAvailableLotsForConsumption([]);
    setShowConsumeItemModal(true);
  };

  const handleConsumeItemChange = (e: React.ChangeEvent<HTMLInputElement |
    HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConsumeItem(prev => ({
      ...prev,
      [name]: (name === 'cantidad_consumida' || name === 'id_referencia_item') ?
        Number(value) : value,
    }));
  };

  useEffect(() => {
    if (consumeItem.tipo_item && consumeItem.id_referencia_item) {
      const filteredLots = inventarioStock.filter(stockItem =>
        stockItem.tipo_item === consumeItem.tipo_item &&
        stockItem.id_referencia_item === consumeItem.id_referencia_item &&
        stockItem.cantidad > 0
      );
      setAvailableLotsForConsumption(filteredLots);
      if (filteredLots.length === 1 && consumeItem.tipo_item === 'medicamento') {
        setConsumeItem(prev => ({ ...prev, lote_consumido: filteredLots[0].lote || '' }));
      } else {
        setConsumeItem(prev => ({ ...prev, lote_consumido: '' }));
      }
    } else {
      setAvailableLotsForConsumption([]);
    }
  }, [consumeItem.tipo_item, consumeItem.id_referencia_item, inventarioStock]);

  const handleSaveConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsProcessing(true);
    if (!currentRecordForConsumption || !consumeItem.tipo_item ||
      consumeItem.id_referencia_item === null || consumeItem.cantidad_consumida <= 0) {
      showError("Por favor, completa los campos obligatorios para registrar el consumo.");
      setIsProcessing(false);
      return;
    }

    let stockItemToUpdate: InventarioStockItem | undefined;
    if (consumeItem.tipo_item === 'medicamento') {
      stockItemToUpdate = inventarioStock.find(item =>
        item.tipo_item === 'medicamento' &&
        item.id_referencia_item === consumeItem.id_referencia_item &&
        item.lote === consumeItem.lote_consumido
      );
    } else {
      stockItemToUpdate = inventarioStock.find(item =>
        item.tipo_item === 'suministro' &&
        item.id_referencia_item === consumeItem.id_referencia_item
      );
    }

    if (!stockItemToUpdate || stockItemToUpdate.cantidad <
      consumeItem.cantidad_consumida) {
      showError("Stock insuficiente o lote no encontrado para el consumo solicitado.");
      setIsProcessing(false);
      return;
    }

    try {
      const newConsumption: Omit<ConsumoItem, 'id_consumo' | 'nombre_item'> = {
        id_historial: currentRecordForConsumption.id_historial,
        tipo_item: consumeItem.tipo_item,
        id_medicamento_consumido: consumeItem.tipo_item === 'medicamento' ?
          consumeItem.id_referencia_item : null,
        id_suministro_consumido: consumeItem.tipo_item === 'suministro' ?
          consumeItem.id_referencia_item : null,
        cantidad_consumida: consumeItem.cantidad_consumida,
        lote_consumido: consumeItem.tipo_item === 'medicamento' ?
          consumeItem.lote_consumido || null : null,
        fecha_consumo: new Date().toISOString().split('T')[0],
        observaciones: consumeItem.observaciones || null,
      };

      const { error: consumeError } = await supabase
        .from('consumos_historial')
        .insert([newConsumption]);
      if (consumeError) throw consumeError;

      const updatedQuantity = stockItemToUpdate.cantidad -
        consumeItem.cantidad_consumida;
      const { error: updateStockError } = await supabase
        .from('inventario_stock')
        .update({ cantidad: updatedQuantity, ultima_actualizacion: new Date().toISOString() })
        .eq('id_stock', stockItemToUpdate.id_stock);
      if (updateStockError) throw updateStockError;

      showSuccess('Consumo registrado y stock actualizado exitosamente.');
      setShowConsumeItemModal(false);
      // Recargar historial para reflejar el consumo
      if (selectedMascota) {
        fetchHistorial(selectedMascota.id_mascota);
      }
    } catch (err: any) {
      console.error('Error al registrar consumo o actualizar stock:', err.message);
      showError('Error al registrar consumo o actualizar stock: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteConsumption = async (id_consumo: number, tipo_item: 'medicamento' |
    'suministro', id_referencia_item: number, cantidad_consumida: number, lote_consumido:
    string | null) => {
    // Usar un modal personalizado en lugar de window.confirm
    // Por simplicidad en este ejemplo, se mantiene window.confirm, pero se recomienda cambiarlo.
    if (!window.confirm("¿Estás seguro de que quieres eliminar este registro de consumo? Esto DEVOLVERÁ la cantidad al inventario.")) {
      return;
    }
    setIsProcessing(true);
    clearMessages();
    try {
      // 1. Eliminar de consumos_historial
      const { error: deleteError } = await supabase
        .from('consumos_historial')
        .delete()
        .eq('id_consumo', id_consumo);
      if (deleteError) throw deleteError;

      // 2. Devolver al inventario_stock
      let query = supabase.from('inventario_stock').select('id_stock, cantidad').eq('tipo_item',
        tipo_item).eq('id_referencia_item', id_referencia_item);
      if (tipo_item === 'medicamento') {
        query = query.eq('lote', lote_consumido);
      }
      const { data: stockData, error: stockError } = await query.single();
      if (stockError && stockError.code === 'PGRST116') { // No rows found
        showError("No se encontró el ítem de stock original para devolver la cantidad (posiblemente eliminado del inventario). Por favor, ajusta manualmente el inventario si es necesario.");
        setIsProcessing(false); // Detener el procesamiento aquí
        return; // Salir de la función
      }
      if (stockError) throw stockError;

      const { error: updateStockError } = await supabase
        .from('inventario_stock')
        .update({ cantidad: stockData.cantidad + cantidad_consumida, ultima_actualizacion: new Date().toISOString() })
        .eq('id_stock', stockData.id_stock);
      if (updateStockError) throw updateStockError;

      showSuccess("Consumo eliminado y stock devuelto exitosamente.");
      // Recargar historial para reflejar la eliminación del consumo y el ajuste de stock
      if (selectedMascota) {
        fetchHistorial(selectedMascota.id_mascota);
      }
    } catch (err: any) {
      console.error('Error al eliminar consumo o devolver stock:', err.message);
      showError('Error al eliminar consumo o devolver stock: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Renderizado condicional de la pantalla de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white
        font-inter">
        <Loader2 className="animate-spin mr-3 text-blue-400" size={36} />
        <p className="text-xl text-indigo-400">Cargando datos del sistema...</p>
      </div>
    );
  }

  // Renderizado condicional de errores globales (persistentes)
  if (error) {
    return (
      <div className="p-6 bg-gray-950 text-white min-h-screen font-inter">
        <div className="bg-red-800 p-4 rounded-lg text-red-100 mb-6 flex items-center justify-between shadow-md animate-fade-in">
          <AlertCircle size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">Error: {error}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setError(null)} />
        </div>
        <button
          onClick={() => {
            clearMessages();
            setIsLoading(true);
            // Al hacer clic en reintentar, volvemos a la lista de clientes o intentamos cargar de URL
            if (viewMode === 'clientList') {
              fetchClientes();
            } else if (viewMode === 'historyDetail' && urlMascotaId) {
                // Forzar recarga completa de mascota y su historial
                const loadMascotaAndHistoryFromUrl = async () => {
                    setIsLoading(true);
                    clearMessages();
                    try {
                        const { data: mascotaData, error: mascotaError } = await supabase
                            .from('mascotas')
                            .select(`*, clientes(id_cliente, nombre, email, telefono)`)
                            .eq('id_mascota', parseInt(urlMascotaId))
                            .single();

                        if (mascotaError) throw mascotaError;
                        if (!mascotaData) {
                            showError("Mascota no encontrada para la URL.");
                            setIsLoading(false);
                            return;
                        }

                        setSelectedMascota({
                            ...mascotaData,
                            cliente_nombre: (mascotaData as any).clientes?.nombre || 'Desconocido'
                        });

                        if (mascotaData.clientes) {
                            setSelectedClient({
                                id_cliente: (mascotaData as any).clientes.id_cliente,
                                nombre: (mascotaData as any).clientes.nombre || 'Nombre no disponible', // Fallback aquí también
                                email: (mascotaData as any).clientes.email,
                                telefono: (mascotaData as any).clientes.telefono,
                                direccion: null,
                                ciudad: null,
                                recibir_recordatorios: null
                            });
                        } else {
                            setSelectedClient(null);
                        }

                        if (medicamentosCatalogo.length > 0 || suministrosCatalogo.length > 0) { // Check if catalogs are ready
                            await fetchHistorial(parseInt(urlMascotaId));
                        } else {
                            console.log("Catálogos aún no cargados para fetchHistorial desde URL, esperando...");
                        }
                    } catch (err: any) {
                        console.error('Error al cargar mascota o historial desde URL en reintento:', err);
                        showError('Error al cargar la mascota o su historial: ' + err.message);
                    } finally {
                        setIsLoading(false);
                    }
                };
                loadMascotaAndHistoryFromUrl();
            }
          }}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition
            shadow-md"
        >
          Reintentar Carga
        </button>
      </div>
    );
  }

  // Filtra los registros de historial basados en el término de búsqueda (del campo motivo_consulta del nuevoRecord)
  const filteredHistorial = historialRecords.filter(record => {
    if (!newRecord.motivo_consulta) { // Si el campo de búsqueda está vacío, mostrar todo
      return true;
    }
    const searchTerm = newRecord.motivo_consulta.toLowerCase();
    const matchesMotivo = record.motivo_consulta.toLowerCase().includes(searchTerm);
    const matchesDiagnostico = record.diagnostico.toLowerCase().includes(searchTerm);
    const matchesTratamiento = record.tratamiento.toLowerCase().includes(searchTerm);
    const matchesObservaciones =
      record.observaciones?.toLowerCase().includes(searchTerm) || false;
    const matchesDetalleTratamiento = record.detalles_tratamiento?.some(t =>
      t.nombre_tratamiento.toLowerCase().includes(searchTerm) ||
      t.descripcion?.toLowerCase().includes(searchTerm)
    ) || false;
    const matchesPrescripcion = record.prescripciones?.some(p =>
      (p.nombre_medicamento?.toLowerCase().includes(searchTerm) ||
        p.dosis.toLowerCase().includes(searchTerm) ||
        p.frecuencia?.toLowerCase().includes(searchTerm))
    ) || false;
    const matchesConsumo = record.consumos?.some(c =>
      c.nombre_item?.toLowerCase().includes(searchTerm) ||
      c.observaciones?.toLowerCase().includes(searchTerm) ||
      c.lote_consumido?.toLowerCase().includes(searchTerm)
    ) || false;

    return matchesMotivo || matchesDiagnostico || matchesTratamiento ||
           matchesObservaciones || matchesDetalleTratamiento ||
           matchesPrescripcion || matchesConsumo;
  });

  return (
    <div className="p-6 bg-gray-950 text-white space-y-12 min-h-screen font-inter">
      <h2 className="text-3xl font-extrabold text-indigo-400 text-center mb-8 flex items-center
        justify-center gap-2">
        <ClipboardList size={28} /> Historial Clínico
      </h2>

      {/* Mensajes de feedback */}
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

      {/* Vista: Lista de Clientes */}
      {viewMode === 'clientList' && (
        <section className="bg-gray-800 p-6 rounded-lg shadow-lg border border-indigo-700">
          <h3 className="text-2xl text-indigo-300 mb-6 font-semibold flex items-center gap-2">
            <Search size={24} /> Seleccionar Cliente
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-200 uppercase bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3">Nombre</th>
                  <th scope="col" className="px-6 py-3">Email</th>
                  <th scope="col" className="px-6 py-3">Teléfono</th>
                  <th scope="col" className="px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No hay clientes
                      registrados.</td>
                  </tr>
                ) : (
                  clientes.map(cliente => (
                    <tr key={cliente.id_cliente} className="bg-gray-800 border-b border-gray-700
                      hover:bg-gray-700 transition-colors duration-200">
                      <td className="px-6 py-4 font-medium text-white">{cliente.nombre}</td>
                      <td className="px-6 py-4">{cliente.email}</td>
                      <td className="px-6 py-4">{cliente.telefono}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleSelectClient(cliente)}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition shadow-md"
                        >
                          Ver Mascotas
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Vista: Lista de Mascotas para el Cliente Seleccionado */}
      {viewMode === 'petList' && selectedClient && (
        <section className="bg-gray-800 p-6 rounded-lg shadow-lg border border-indigo-700">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBackToClients}
              className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition shadow-md"
            >
              <ArrowLeft size={18} className="mr-2" /> Volver a Clientes
            </button>
            <h3 className="text-2xl text-indigo-300 font-semibold flex-grow text-center">
              Mascotas de {selectedClient.nombre}
            </h3>
            <div className="w-24"></div> {/* Placeholder for alignment */}
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-200 uppercase bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3">Nombre</th>
                  <th scope="col" className="px-6 py-3">Especie</th>
                  <th scope="col" className="px-6 py-3">Raza</th>
                  <th scope="col" className="px-6 py-3">Edad</th>
                  <th scope="col" className="px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mascotas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No hay mascotas
                      registradas para este cliente.</td>
                  </tr>
                ) : (
                  mascotas.map(mascota => (
                    <tr key={mascota.id_mascota} className="bg-gray-800 border-b border-gray-700
                      hover:bg-gray-700 transition-colors duration-200">
                      <td className="px-6 py-4 font-medium text-white">{mascota.nombre}</td>
                      <td className="px-6 py-4">{mascota.especie}</td>
                      <td className="px-6 py-4">{mascota.raza || 'N/A'}</td>
                      <td className="px-6 py-4">{mascota.edad ?
                        `${mascota.edad} años` : 'N/A'}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleSelectMascota(mascota)}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition shadow-md"
                        >
                          Ver Historial
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Vista: Detalles del Historial Clínico de la Mascota Seleccionada */}
      {viewMode === 'historyDetail' && selectedMascota && (
        <section className="bg-gray-800 p-6 rounded-xl shadow-lg border border-blue-800">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={handleBackToPets}
              className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition shadow-md"
            >
              <ArrowLeft size={18} className="mr-2" /> Volver a Mascotas
            </button>
            <h3 className="text-2xl font-extrabold text-indigo-300 text-center flex-grow flex items-center justify-center gap-2">
              <Dog size={24} /> Historial de {selectedMascota.nombre} ({selectedMascota.especie})
            </h3>
            <div className="w-24"></div> {/* Placeholder for alignment */}
          </div>
          <div className="bg-gray-700 p-4 rounded-lg shadow-md mb-8 text-lg">
            <p><strong className="text-indigo-200"><User size={18} className="inline mr-1" />
              Propietario:</strong>
              {selectedClient?.nombre || 'Desconocido'} {/* CORRECCIÓN CLAVE: Usar directamente selectedClient?.nombre */}
            </p>
            {/* Solo muestra contacto si selectedClient tiene datos */}
            {selectedClient?.telefono || selectedClient?.email ? (
                <p><strong className="text-indigo-200">Contacto:</strong>
                {selectedClient.telefono && selectedClient.email ? (
                  `${selectedClient.telefono} | ${selectedClient.email}`
                ) : selectedClient.telefono ? (
                  selectedClient.telefono
                ) : (
                  selectedClient.email
                )}
              </p>
            ) : null}
          </div>
          {/* Formulario para Añadir Nuevo Registro */}
          <div className="bg-gray-700 p-6 rounded-lg shadow-md mb-8">
            <h4 className="text-xl font-semibold text-indigo-300 mb-4 flex items-center gap-2">
              <PlusCircle size={20} /> Añadir Nuevo Registro Clínico
            </h4>
            <form onSubmit={handleAddHistorialRecord} className="space-y-4">
              <div>
                <label htmlFor="fecha_consulta" className="block text-sm
                  font-medium text-gray-300">Fecha de Consulta:</label>
                <input
                  type="date"
                  id="fecha_consulta"
                  name="fecha_consulta"
                  value={newRecord.fecha_consulta}
                  onChange={handleNewRecordChange}
                  className="mt-1 block w-full p-2.5 bg-gray-600 border
                    border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="motivo_consulta" className="block text-sm
                  font-medium text-gray-300">Motivo de Consulta:</label>
                <textarea
                  id="motivo_consulta"
                  name="motivo_consulta"
                  value={newRecord.motivo_consulta}
                  onChange={handleNewRecordChange}
                  rows={2}
                  className="mt-1 block w-full p-2.5 bg-gray-600 border
                    border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                  required
                ></textarea>
              </div>
              <div>
                <label htmlFor="diagnostico" className="block text-sm font-medium text-gray-300">Diagnóstico:</label>
                <textarea
                  id="diagnostico"
                  name="diagnostico"
                  value={newRecord.diagnostico}
                  onChange={handleNewRecordChange}
                  rows={3}
                  className="mt-1 block w-full p-2.5 bg-gray-600 border
                    border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                  required
                ></textarea>
              </div>
              <div>
                <label htmlFor="tratamiento" className="block text-sm font-medium text-gray-300">Resumen de Tratamiento:</label>
                <textarea
                  id="tratamiento"
                  name="tratamiento"
                  value={newRecord.tratamiento}
                  onChange={handleNewRecordChange}
                  rows={3}
                  className="mt-1 block w-full p-2.5 bg-gray-600 border
                    border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                  required
                ></textarea>
              </div>
              <div>
                <label htmlFor="observaciones" className="block text-sm
                  font-medium text-gray-300">Observaciones (Opcional):</label>
                <textarea
                  id="observaciones"
                  name="observaciones"
                  value={newRecord.observaciones || ''}
                  onChange={handleNewRecordChange}
                  rows={2}
                  className="mt-1 block w-full p-2.5 bg-gray-600 border
                    border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                ></textarea>
              </div>
              {/* Sección para añadir Tratamientos Específicos */}
              <div className="bg-gray-600 p-4 rounded-md mt-4 border border-gray-500">
                <h5 className="text-lg font-semibold text-indigo-200 mb-3">Detalles de
                  Tratamiento</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new_tratamiento_nombre" className="block
                      text-sm font-medium text-gray-300">Nombre del Tratamiento:</label>
                    <input
                      type="text"
                      id="new_tratamiento_nombre"
                      name="nombre_tratamiento"
                      value={currentNewTratamiento.nombre_tratamiento}
                      onChange={handleNewTratamientoChange}
                      className="mt-1 block w-full p-2.5 bg-gray-700 border
                        border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="new_tratamiento_descripcion"
                      className="block text-sm font-medium text-gray-300">Descripción:</label>
                    <input
                      type="text"
                      id="new_tratamiento_descripcion"
                      name="descripcion"
                      value={currentNewTratamiento.descripcion || ''}
                      onChange={handleNewTratamientoChange}
                      className="mt-1 block w-full p-2.5 bg-gray-700 border
                        border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="new_tratamiento_fecha_inicio"
                      className="block text-sm font-medium text-gray-300">Fecha Inicio:</label>
                    <input
                      type="date"
                      id="new_tratamiento_fecha_inicio"
                      name="fecha_inicio"
                      value={currentNewTratamiento.fecha_inicio}
                      onChange={handleNewTratamientoChange}
                      className="mt-1 block w-full p-2.5 bg-gray-700 border
                        border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="new_tratamiento_fecha_fin"
                      className="block text-sm font-medium text-gray-300">Fecha Fin
                      (Opcional):</label>
                    <input
                      type="date"
                      id="new_tratamiento_fecha_fin"
                      name="fecha_fin"
                      value={currentNewTratamiento.fecha_fin || ''}
                      onChange={handleNewTratamientoChange}
                      className="mt-1 block w-full p-2.5 bg-gray-700 border
                        border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addTratamientoToNewRecord}
                  className="mt-3 px-4 py-2 bg-emerald-600 text-white
                    rounded-md hover:bg-emerald-700 transition flex items-center gap-1 shadow-md"
                >
                  <PlusCircle size={18} /> Añadir Tratamiento
                </button>
                {newTratamientosDetalles.length > 0 && (
                  <ul className="mt-4 space-y-2 text-gray-300">
                    {newTratamientosDetalles.map((t, index) => (
                      <li key={index} className="flex justify-between items-center bg-gray-700 p-2
                        rounded-md">
                        <span>{t.nombre_tratamiento} ({t.fecha_inicio}
                          {t.fecha_fin ? ` - ${t.fecha_fin}` : ''})</span>
                        <button type="button" onClick={() =>
                          removeTratamientoFromNewRecord(index)} className="text-red-400
                          hover:text-red-600" title="Eliminar Tratamiento">
                          <XCircle size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Sección para añadir Prescripciones */}
              <div className="bg-gray-600 p-4 rounded-md mt-4 border border-gray-500">
                <h5 className="text-lg font-semibold text-indigo-200 mb-3">Prescripciones</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new_prescripcion_medicamento"
                      className="block text-sm font-medium text-gray-300">Medicamento:</label>
                    <select
                      id="new_prescripcion_medicamento"
                      name="id_medicamento"
                      value={currentNewPrescripcion.id_medicamento}
                      onChange={handleNewPrescripcionChange}
                      className="mt-1 block w-full p-2.5 bg-gray-700 border
                        border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value={0}>Selecciona un medicamento</option>
                      {medicamentosCatalogo.map(med => (
                        <option key={med.id_medicamento}
                          value={med.id_medicamento}>
                          {med.nombre_generico} {med.nombre_comercial ?
                            `(${med.nombre_comercial})` : ''}
                        </option>
                      ))}
                    </select>
                    {/* Visualización del stock disponible / estado de disponibilidad */}
                    {currentNewPrescripcion.id_medicamento > 0 && selectedMedAvailabilityStatus
                      && (
                        <p className={`text-sm mt-1
                          ${selectedMedAvailabilityStatus === 'DISPONIBLE' && selectedMedTotalStock
                            !== null && currentNewPrescripcion.cantidad_prescrita <= selectedMedTotalStock ? 'text-green-300' : ''}
                          ${selectedMedAvailabilityStatus === 'AGOTADO' ? 'text-red-300' : ''}
                          ${selectedMedAvailabilityStatus === 'NO_EN_CLINICA' ? 'text-gray-400' : ''}
                          ${selectedMedAvailabilityStatus === 'DISPONIBLE' && selectedMedTotalStock
                            !== null && currentNewPrescripcion.cantidad_prescrita > selectedMedTotalStock ? 'text-orange-300' : ''}
                          `}>
                          {selectedMedAvailabilityStatus === 'DISPONIBLE' && `Stock Disponible:
                            ${selectedMedTotalStock} unidades.`}
                          {selectedMedAvailabilityStatus === 'AGOTADO' && `Stock: Agotado
                            (${selectedMedTotalStock} unidades).`}
                          {selectedMedAvailabilityStatus === 'NO_EN_CLINICA' && `Estado: No
                            disponible en la clínica (sin stock registrado).`}
                          {selectedMedAvailabilityStatus === 'DISPONIBLE' && selectedMedTotalStock
                            !== null && currentNewPrescripcion.cantidad_prescrita > selectedMedTotalStock && <span>(Cantidad excede stock disponible)</span>}
                        </p>
                      )}
                  </div>
                  <div>
                    <label htmlFor="new_prescripcion_cantidad" className="block
                      text-sm font-medium text-gray-300">Cantidad (por dosis):</label>
                    <input
                      type="number"
                      id="new_prescripcion_cantidad"
                      name="cantidad_prescrita"
                      value={currentNewPrescripcion.cantidad_prescrita}
                      onChange={handleNewPrescripcionChange}
                      className="mt-1 block w-full p-2.5 bg-gray-700 border
                        border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="new_prescripcion_dosis" className="block
                      text-sm font-medium text-gray-300">Dosis (ej. 10mg):</label>
                    <input
                      type="text"
                      id="new_prescripcion_dosis"
                      name="dosis"
                      value={currentNewPrescripcion.dosis}
                      onChange={handleNewPrescripcionChange}
                      className="mt-1 block w-full p-2.5 bg-gray-700 border
                        border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="new_prescripcion_frecuencia" className="block
                      text-sm font-medium text-gray-300">Frecuencia (ej. Cada 8 horas):</label>
                    <input
                      type="text"
                      id="new_prescripcion_frecuencia"
                      name="frecuencia"
                      value={currentNewPrescripcion.frecuencia}
                      onChange={handleNewPrescripcionChange}
                      className="mt-1 block w-full p-2.5 bg-gray-700 border
                        border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="new_prescripcion_duracion"
                      className="block text-sm font-medium text-gray-300">Duración
                      (ej. 7 días, Hasta terminar):</label>
                    <input
                      type="text"
                      id="new_prescripcion_duracion"
                      name="duracion"
                      value={currentNewPrescripcion.duracion || ''}
                      onChange={handleNewPrescripcionChange}
                      className="mt-1 block w-full p-2.5 bg-gray-700 border
                        border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="new_prescripcion_fecha" className="block
                      text-sm font-medium text-gray-300">Fecha Prescripción:</label>
                    <input
                      type="date"
                      id="new_prescripcion_fecha"
                      name="fecha_prescripcion"
                      value={currentNewPrescripcion.fecha_prescripcion}
                      onChange={handleNewPrescripcionChange}
                      className="mt-1 block w-full p-2.5 bg-gray-700 border
                        border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="new_prescripcion_instrucciones" className="block
                      text-sm font-medium text-gray-300">Instrucciones Adicionales
                      (Opcional):</label>
                    <textarea
                      id="new_prescripcion_instrucciones"
                      name="instrucciones_adicionales"
                      value={currentNewPrescripcion.instrucciones_adicionales || ''}
                      onChange={handleNewPrescripcionChange}
                      rows={2}
                      className="mt-1 block w-full p-2.5 bg-gray-700 border
                        border-gray-500 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500 resize-y"
                    ></textarea>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addPrescripcionToNewRecord}
                  className="mt-3 px-4 py-2 bg-emerald-600 text-white
                    rounded-md hover:bg-emerald-700 transition flex items-center gap-1 shadow-md"
                >
                  <PlusCircle size={18} /> Añadir Prescripción
                </button>
                {newPrescripciones.length > 0 && (
                  <ul className="mt-4 space-y-2 text-gray-300">
                    {newPrescripciones.map((p, index) => (
                      <li key={index} className="flex justify-between items-center bg-gray-700 p-2
                        rounded-md">
                        <span><strong className="text-gray-200">Medicamento:</strong>
                          {p.nombre_medicamento} - <strong className="text-gray-200">Dosis:</strong> {p.dosis}
                          ({p.cantidad_prescrita} unid.) - <strong className="text-gray-200">Frecuencia:</strong>
                          {p.frecuencia}
                          (<span className="text-xs">{new
                              Date(p.fecha_prescripcion).toLocaleDateString('es-ES')}</span>)</span>
                        <button type="button" onClick={() =>
                          removePrescripcionFromNewRecord(index)} className="text-red-400
                          hover:text-red-600" title="Eliminar Prescripción">
                          <XCircle size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md
                  hover:bg-indigo-700 transition shadow-lg flex items-center justify-center gap-2"
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="animate-spin mr-2" size={20} /> : <Save
                  size={20} />}
                {isProcessing ? 'Guardando...' : 'Guardar Nuevo Registro'}
              </button>
            </form>
          </div>
          {/* Lista de Registros del Historial Clínico */}
          <h4 className="text-xl font-semibold text-indigo-300 mb-4 flex items-center gap-2">
            Registros Existentes
          </h4>
          {historialRecords.length === 0 ? (
            <p className="text-gray-400 text-center py-8 bg-gray-700 rounded-lg shadow-md">No
              hay registros
            </p>
          ) : (
            <div className="space-y-6">
              {filteredHistorial.map(record => (
                <div key={record.id_historial} className="bg-gray-700 p-5
                  rounded-lg shadow-md border border-gray-600">
                  {editingRecordId === record.id_historial ? (
                    <form onSubmit={handleUpdateRecord} className="space-y-4">
                      <h5 className="text-lg font-bold text-indigo-200 mb-3">Editando Registro: {new
                        Date(record.fecha_consulta).toLocaleDateString('es-ES')}</h5>
                      <div>
                        <label
                          htmlFor={`edit_fecha_consulta_${record.id_historial}`} className="block
                          text-sm font-medium text-gray-300">Fecha de Consulta:</label>
                        <input
                          type="date"
                          id={`edit_fecha_consulta_${record.id_historial}`}
                          name="fecha_consulta"
                          value={editedRecord?.fecha_consulta.split('T')[0] || ''}
                          onChange={handleEditedRecordChange}
                          className="mt-1 block w-full p-2.5 bg-gray-600
                            border border-gray-500 rounded-md text-white"
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`edit_motivo_consulta_${record.id_historial}`} className="block
                          text-sm font-medium text-gray-300">Motivo de Consulta:</label>
                        <textarea
                          id={`edit_motivo_consulta_${record.id_historial}`}
                          name="motivo_consulta"
                          value={editedRecord?.motivo_consulta || ''}
                          onChange={handleEditedRecordChange}
                          rows={2}
                          className="mt-1 block w-full p-2.5 bg-gray-600
                            border border-gray-500 rounded-md text-white resize-y"
                          required
                        ></textarea>
                      </div>
                      <div>
                        <label
                          htmlFor={`edit_diagnostico_${record.id_historial}`} className="block text-sm
                          font-medium text-gray-300">Diagnóstico:</label>
                        <textarea
                          id={`edit_diagnostico_${record.id_historial}`}
                          name="diagnostico"
                          value={editedRecord?.diagnostico || ''}
                          onChange={handleEditedRecordChange}
                          rows={3}
                          className="mt-1 block w-full p-2.5 bg-gray-600
                            border border-gray-500 rounded-md text-white resize-y"
                          required
                        ></textarea>
                      </div>
                      <div>
                        <label
                          htmlFor={`edit_tratamiento_${record.id_historial}`} className="block text-sm
                          font-medium text-gray-300">Resumen de Tratamiento:</label>
                        <textarea
                          id={`edit_tratamiento_${record.id_historial}`}
                          name="tratamiento"
                          value={editedRecord?.tratamiento || ''}
                          onChange={handleEditedRecordChange}
                          rows={3}
                          className="mt-1 block w-full p-2.5 bg-gray-600
                            border border-gray-500 rounded-md text-white resize-y"
                          required
                        ></textarea>
                      </div>
                      <div>
                        <label
                          htmlFor={`edit_observaciones_${record.id_historial}`} className="block text-sm font-medium text-gray-300">Observaciones (Opcional):</label>
                        <textarea
                          id={`edit_observaciones_${record.id_historial}`}
                          name="observaciones"
                          value={editedRecord?.observaciones || ''}
                          onChange={handleEditedRecordChange}
                          rows={2}
                          className="mt-1 block w-full p-2.5 bg-gray-600
                            border border-gray-500 rounded-md text-white resize-y"
                        ></textarea>
                      </div>
                      {/* Edición de Tratamientos Específicos */}
                      <div className="bg-gray-600 p-4 rounded-md mt-4 border border-gray-500">
                        <h5 className="text-base font-semibold text-indigo-200 mb-3">Detalles de
                          Tratamiento (Edición)</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="edit_tratamiento_nombre"
                              className="block text-sm font-medium text-gray-300">Nombre del
                              Tratamiento:</label>
                            <input
                              type="text"
                              id="edit_tratamiento_nombre"
                              name="nombre_tratamiento"
                              value={currentNewTratamiento.nombre_tratamiento}
                              onChange={handleNewTratamientoChange}
                              className="mt-1 block w-full p-2.5 bg-gray-700
                                border border-gray-500 rounded-md text-white"
                            />
                          </div>
                          <div>
                            <label htmlFor="edit_tratamiento_descripcion"
                              className="block text-sm font-medium text-gray-300">Descripción:</label>
                            <input
                              type="text"
                              id="edit_tratamiento_descripcion"
                              name="descripcion"
                              value={currentNewTratamiento.descripcion || ''}
                              onChange={handleNewTratamientoChange}
                              className="mt-1 block w-full p-2.5 bg-gray-700
                                border border-gray-500 rounded-md text-white"
                            />
                          </div>
                          <div>
                            <label htmlFor="edit_tratamiento_fecha_inicio"
                              className="block text-sm font-medium text-gray-300">Fecha Inicio:</label>
                            <input
                              type="date"
                              id="edit_tratamiento_fecha_inicio"
                              name="fecha_inicio"
                              value={currentNewTratamiento.fecha_inicio}
                              onChange={handleNewTratamientoChange}
                              className="mt-1 block w-full p-2.5 bg-gray-700
                                border border-gray-500 rounded-md text-white"
                            />
                          </div>
                          <div>
                            <label htmlFor="edit_tratamiento_fecha_fin"
                              className="block text-sm font-medium text-gray-300">Fecha Fin
                              (Opcional):</label>
                            <input
                              type="date"
                              id="edit_tratamiento_fecha_fin"
                              name="fecha_fin"
                              value={currentNewTratamiento.fecha_fin || ''}
                              onChange={handleNewTratamientoChange}
                              className="mt-1 block w-full p-2.5 bg-gray-700
                                border border-gray-500 rounded-md text-white"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={addTratamientoToNewRecord}
                          className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition flex items-center gap-1 shadow-md"
                        >
                          <PlusCircle size={18} /> Añadir Tratamiento
                        </button>
                        {newTratamientosDetalles.length > 0 && (
                          <ul className="mt-4 space-y-2 text-gray-300">
                            {newTratamientosDetalles.map((t, index) => (
                              <li key={index} className="flex justify-between items-center bg-gray-700 p-2
                                rounded-md">
                                <span>{t.nombre_tratamiento}
                                  ({t.fecha_inicio} {t.fecha_fin ? ` - ${t.fecha_fin}` : ''})</span>
                                <button type="button" onClick={() =>
                                  removeTratamientoFromNewRecord(index)} className="text-red-400
                                  hover:text-red-600" title="Eliminar Tratamiento">
                                  <XCircle size={18} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {/* Edición de Prescripciones */}
                      <div className="bg-gray-600 p-4 rounded-md mt-4 border border-gray-500">
                        <h5 className="text-base font-semibold text-indigo-200 mb-3">Prescripciones
                          (Edición)</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="edit_prescripcion_medicamento"
                              className="block text-sm font-medium text-gray-300">Medicamento:</label>
                            <select
                              id="edit_prescripcion_medicamento"
                              name="id_medicamento"
                              value={currentNewPrescripcion.id_medicamento}
                              onChange={handleNewPrescripcionChange}
                              className="mt-1 block w-full p-2.5 bg-gray-700
                                border border-gray-500 rounded-md text-white"
                              required
                            >
                              <option value={0}>Selecciona un
                                medicamento</option>
                              {medicamentosCatalogo.map(med => (
                                <option key={med.id_medicamento}
                                  value={med.id_medicamento}>
                                  {med.nombre_generico}
                                  {med.nombre_comercial ? `(${med.nombre_comercial})` : ''}
                                </option>
                              ))}
                            </select>
                            {/* Visualización del stock disponible para edición (similar a nueva) */}
                            {currentNewPrescripcion.id_medicamento > 0 &&
                              selectedMedAvailabilityStatus && (
                                <p className={`text-sm mt-1
                                  ${selectedMedAvailabilityStatus === 'DISPONIBLE' &&
                                    selectedMedTotalStock !== null && currentNewPrescripcion.cantidad_prescrita <=
                                    selectedMedTotalStock ? 'text-green-300' : ''}
                                  ${selectedMedAvailabilityStatus === 'AGOTADO' ? 'text-red-300' : ''}
                                  ${selectedMedAvailabilityStatus === 'NO_EN_CLINICA' ? 'text-gray-400' : ''}
                                  ${selectedMedAvailabilityStatus === 'DISPONIBLE' &&
                                    selectedMedTotalStock !== null && currentNewPrescripcion.cantidad_prescrita >
                                    selectedMedTotalStock ? 'text-orange-300' : ''}
                                  `}>
                                  {selectedMedAvailabilityStatus === 'DISPONIBLE' && `Stock Disponible:
                                    ${selectedMedTotalStock} unidades.`}
                                  {selectedMedAvailabilityStatus === 'AGOTADO' && `Stock: Agotado
                                    (${selectedMedTotalStock} unidades).`}
                                  {selectedMedAvailabilityStatus === 'NO_EN_CLINICA' && `Estado: No
                                    disponible en la clínica (sin stock registrado).`}
                                  {selectedMedAvailabilityStatus === 'DISPONIBLE' && selectedMedTotalStock
                                    !== null && currentNewPrescripcion.cantidad_prescrita > selectedMedTotalStock && <span>(Cantidad excede stock disponible)</span>}
                                </p>
                              )}
                          </div>
                          <div>
                            <label htmlFor="edit_prescripcion_cantidad" className="block
                              text-sm font-medium text-gray-300">Cantidad (por dosis):</label>
                            <input
                              type="number"
                              id="edit_prescripcion_cantidad"
                              name="cantidad_prescrita"
                              value={currentNewPrescripcion.cantidad_prescrita}
                              onChange={handleNewPrescripcionChange}
                              className="mt-1 block w-full p-2.5 bg-gray-700 border
                                border-gray-500 rounded-md text-white"
                              min="1"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="edit_prescripcion_dosis"
                              className="block text-sm font-medium text-gray-300">Dosis:</label>
                            <input
                              type="text"
                              id="edit_prescripcion_dosis"
                              name="dosis"
                              value={currentNewPrescripcion.dosis}
                              onChange={handleNewPrescripcionChange}
                              className="mt-1 block w-full p-2.5 bg-gray-700
                                border border-gray-500 rounded-md text-white"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="edit_prescripcion_frecuencia" className="block
                              text-sm font-medium text-gray-300">Frecuencia:</label>
                            <input
                              type="text"
                              id="edit_prescripcion_frecuencia"
                              name="frecuencia"
                              value={currentNewPrescripcion.frecuencia}
                              onChange={handleNewPrescripcionChange}
                              className="mt-1 block w-full p-2.5 bg-gray-700 border
                                border-gray-500 rounded-md text-white"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="edit_prescripcion_duracion"
                              className="block text-sm font-medium text-gray-300">Duración
                              (Opcional):</label>
                            <input
                              type="text"
                              id="edit_prescripcion_duracion"
                              name="duracion"
                              value={currentNewPrescripcion.duracion || ''}
                              onChange={handleNewPrescripcionChange}
                              className="mt-1 block w-full p-2.5 bg-gray-700
                                border border-gray-500 rounded-md text-white"
                            />
                          </div>
                          <div>
                            <label htmlFor="edit_prescripcion_fecha"
                              className="block text-sm font-medium text-gray-300">Fecha
                              Prescripción:</label>
                            <input
                              type="date"
                              id="edit_prescripcion_fecha"
                              name="fecha_prescripcion"
                              value={currentNewPrescripcion.fecha_prescripcion}
                              onChange={handleNewPrescripcionChange}
                              className="mt-1 block w-full p-2.5 bg-gray-700
                                border border-gray-500 rounded-md text-white"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="edit_prescripcion_instrucciones" className="block
                              text-sm font-medium text-gray-300">Instrucciones Adicionales
                              (Opcional):</label>
                            <textarea
                              id="edit_prescripcion_instrucciones"
                              name="instrucciones_adicionales"
                              value={currentNewPrescripcion.instrucciones_adicionales || ''}
                              onChange={handleNewPrescripcionChange}
                              rows={2}
                              className="mt-1 block w-full p-2.5 bg-gray-700 border
                                border-gray-500 rounded-md text-white resize-y"
                            ></textarea>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={addPrescripcionToNewRecord}
                          className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition flex items-center gap-1 shadow-md"
                        >
                          <PlusCircle size={18} /> Añadir Prescripción
                        </button>
                        {newPrescripciones.length > 0 && (
                          <ul className="mt-4 space-y-2 text-gray-300">
                            {newPrescripciones.map((p, index) => (
                              <li key={index} className="flex justify-between items-center bg-gray-700 p-2
                                rounded-md">
                                <span><strong className="text-gray-200">Medicamento:</strong>
                                  {p.nombre_medicamento} - <strong className="text-gray-200">Dosis:</strong> {p.dosis}
                                  ({p.cantidad_prescrita} unid.) - <strong className="text-gray-200">Frecuencia:</strong>
                                  {p.frecuencia}
                                  (<span className="text-xs">{new
                                      Date(p.fecha_prescripcion).toLocaleDateString('es-ES')}</span>)</span>
                                <button type="button" onClick={() =>
                                  removePrescripcionFromNewRecord(index)} className="text-red-400
                                  hover:text-red-600" title="Eliminar Prescripción">
                                  <XCircle size={18} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex justify-end gap-3 mt-4">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 text-white
                            rounded-md hover:bg-indigo-700 transition flex items-center gap-2 shadow-md"
                          disabled={isProcessing}
                        >
                          {isProcessing ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save
                            size={18} />}
                          {isProcessing ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-500 text-white
                            rounded-md hover:bg-gray-600 transition flex items-center gap-2 shadow-md"
                          disabled={isProcessing}
                        >
                          <XCircle size={18} /> Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xl font-bold text-indigo-200 flex items-center gap-2">
                            <Calendar size={20} /> Fecha: {new
                              Date(record.fecha_consulta).toLocaleDateString('es-ES')}
                          </p>
                          {record.id_cita && <p className="text-sm text-gray-400">ID Cita:
                            {record.id_cita}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditClick(record)}
                            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700
                              transition shadow-sm"
                            aria-label="Editar registro"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteRecord(record.id_historial)}
                            className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition
                              shadow-sm"
                            aria-label="Eliminar registro"
                            disabled={isProcessing}
                          >
                            {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Trash2
                              size={18} />}
                          </button>
                        </div>
                      </div>
                      <p className="mb-2"><strong className="text-gray-300">Motivo:</strong>
                        {record.motivo_consulta}</p>
                      <p className="mb-2"><strong className="text-gray-300">Diagnóstico:</strong> {record.diagnostico}</p>
                      <p className="mb-2"><strong className="text-gray-300">Tratamiento:</strong> {record.tratamiento}</p>
                      {record.observaciones && <p className="mb-2"><strong
                        className="text-gray-300">Observaciones:</strong>
                        {record.observaciones}</p>}
                      {/* Sección de Tratamientos Específicos */}
                      {record.detalles_tratamiento &&
                        record.detalles_tratamiento.length > 0 && (
                          <div className="mt-4 border-t border-gray-600 pt-4">
                            <h6 className="text-md font-semibold text-indigo-200 mb-2 flex items-center
                              gap-1">
                              <ClipboardList size={16} /> Tratamientos Específicos:
                            </h6>
                            <ul className="list-disc list-inside text-gray-300
                              space-y-1">
                              {record.detalles_tratamiento.map((t, i) => (
                                <li key={i}>
                                  <strong className="text-gray-200">{t.nombre_tratamiento}:</strong>
                                  {t.descripcion || 'Sin descripción'}
                                  ({new Date(t.fecha_inicio).toLocaleDateString('es-ES')} {t.fecha_fin ? ` -
                                    ${new
                                    Date(t.fecha_fin).toLocaleDateString('es-ES')}` : ''})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      {/* Sección de Prescripciones */}
                      {record.prescripciones && record.prescripciones.length
                        > 0 && (
                          <div className="mt-4 border-t border-gray-600 pt-4">
                            <h6 className="text-md font-semibold text-indigo-200 mb-2 flex items-center
                              gap-1">
                              <Pill size={16} /> Prescripciones:
                            </h6>
                            <ul className="list-disc list-inside text-gray-300
                              space-y-1">
                              {record.prescripciones.map((p, i) => (
                                <li key={i}>
                                  <strong className="text-gray-200">Medicamento:</strong>
                                  {p.nombre_medicamento} ({p.cantidad_prescrita} unid.) - <strong className="text-gray-200">Dosis:</strong> {p.dosis} - <strong className="text-gray-200">Frecuencia:</strong>
                                  {p.frecuencia} - <strong className="text-gray-200">Duración:</strong> {p.duracion || 'N/A'}
                                  {p.instrucciones_adicionales && ` (${p.instrucciones_adicionales})`}
                                  <span className="text-xs text-gray-400 ml-2">({new
                                    Date(p.fecha_prescripcion).toLocaleDateString('es-ES')})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      {/* Sección de Consumos Registrados */}
                      {record.consumos && record.consumos.length > 0 && (
                        <div className="mt-4 border-t border-gray-600 pt-4">
                          <h6 className="text-md font-semibold text-indigo-200 mb-2 flex items-center
                            gap-1">
                            <Truck size={16} /> Consumos Registrados:
                          </h6>
                          <ul className="list-disc list-inside text-gray-300 space-y-1">
                            {record.consumos.map((c, i) => (
                              <li key={i} className="flex justify-between items-center bg-gray-700/30 p-2
                                rounded-md">
                                <span>
                                  <strong className="text-gray-200">{c.nombre_item} ({c.tipo_item ===
                                    'medicamento' ? 'Medicamento' : 'Suministro'}):</strong> {c.cantidad_consumida} unid.
                                  {c.lote_consumido && ` (Lote: ${c.lote_consumido})`}
                                  {c.observaciones && ` - Obs: ${c.observaciones}`}
                                  <span className="text-xs text-gray-400 ml-2">({new
                                    Date(c.fecha_consumo).toLocaleDateString('es-ES')})</span>
                                </span>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleDeleteConsumption(c.id_consumo!, c.tipo_item,
                                      c.tipo_item === 'medicamento' ? c.id_medicamento_consumido! :
                                        c.id_suministro_consumido!, c.cantidad_consumida, c.lote_consumido)}
                                    className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-md
                                      transition-colors text-xs"
                                    title="Eliminar Consumo y Devolver Stock"
                                    disabled={isProcessing}
                                  >
                                    {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Trash2
                                      size={14} />}
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <button
                        onClick={() => openConsumeItemModal(record)}
                        className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white
                          rounded-md font-semibold text-sm transition-colors flex items-center gap-1 shadow-md"
                      >
                        <Package size={16} /> Registrar Consumo de Ítem
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {/* Modal para Registrar Consumo de Ítem */}
      {showConsumeItemModal && currentRecordForConsumption && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4
          z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md border border-purple-700">
            <h3 className="text-2xl font-bold text-purple-400 mb-6 text-center flex items-center
              justify-center gap-2">
              <Truck size={24} /> Registrar Consumo de Ítem
            </h3>
            <p className="text-gray-300 text-center mb-4">Para: <span className="font-semibold">{selectedMascota?.nombre}</span> (<span className="font-semibold">{new
                Date(currentRecordForConsumption.fecha_consulta).toLocaleDateString('es-ES')}</span>)</p>
            <form onSubmit={handleSaveConsumption} className="space-y-4">
              <div>
                <label htmlFor="consume_tipo_item" className="block text-sm font-medium text-gray-300">Tipo de Ítem:</label>
                <select
                  id="consume_tipo_item"
                  name="tipo_item"
                  value={consumeItem.tipo_item}
                  onChange={handleConsumeItemChange}
                  className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
                  required
                >
                  <option value="">Selecciona tipo</option>
                  <option value="medicamento">Medicamento</option>
                  <option value="suministro">Suministro</option>
                </select>
              </div>
              {consumeItem.tipo_item && (
                <div>
                  <label htmlFor="consume_id_referencia_item" className="block text-sm font-medium text-gray-300">Selecciona el Ítem:</label>
                  <select
                    id="consume_id_referencia_item"
                    name="id_referencia_item"
                    value={consumeItem.id_referencia_item || ''}
                    onChange={handleConsumeItemChange}
                    className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    <option value="">Selecciona un ítem</option>
                    {consumeItem.tipo_item === 'medicamento' && medicamentosCatalogo.map(med => (
                        <option key={med.id_medicamento} value={med.id_medicamento}>
                          {med.nombre_generico} {med.nombre_comercial ? `(${med.nombre_comercial})` : ''} ({med.unidad_medida || 'Unid.'})
                        </option>
                      ))}
                    {consumeItem.tipo_item === 'suministro' && suministrosCatalogo.map(sum => (
                        <option key={sum.id_suministro} value={sum.id_suministro}>
                          {sum.nombre} ({sum.unidad_medida || 'Unid.'})
                        </option>
                      ))}
                  </select>
                </div>
              )}
              {consumeItem.tipo_item === 'medicamento' && consumeItem.id_referencia_item && (
                <div>
                  <label htmlFor="consume_lote_consumido" className="block text-sm font-medium text-gray-300">Selecciona Lote (disponibles):</label>
                  <select
                    id="consume_lote_consumido"
                    name="lote_consumido"
                    value={consumeItem.lote_consumido || ''}
                    onChange={handleConsumeItemChange}
                    className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    <option value="">Selecciona un lote</option>
                    {availableLotsForConsumption.length > 0 ? (
                      availableLotsForConsumption.map(lot => (
                        <option key={lot.id_stock} value={lot.lote || ''}>
                          {lot.lote || 'Sin Lote'} (Disp: {lot.cantidad}) {lot.fecha_caducidad_lote ? ` - Vence:
                            ${new Date(lot.fecha_caducidad_lote + 'T00:00:00').toLocaleDateString('es-ES')}` : ''}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No hay lotes disponibles para este
                        medicamento</option>
                    )}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="consume_cantidad" className="block text-sm font-medium text-gray-300">Cantidad a consumir:</label>
                <input
                  type="number"
                  id="consume_cantidad"
                  name="cantidad_consumida"
                  value={consumeItem.cantidad_consumida}
                  onChange={handleConsumeItemChange}
                  className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label htmlFor="consume_observaciones" className="block text-sm font-medium
                  text-gray-300">Observaciones (opcional):</label>
                <textarea
                  id="consume_observaciones"
                  name="observaciones"
                  value={consumeItem.observaciones}
                  onChange={handleConsumeItemChange}
                  rows={2}
                  className="mt-1 block w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500 resize-y"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowConsumeItemModal(false)}
                  className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-md"
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
                    font-semibold transition shadow-md flex items-center justify-center"
                  disabled={isProcessing || !consumeItem.tipo_item ||
                    consumeItem.id_referencia_item === null || consumeItem.cantidad_consumida <= 0 ||
                    (consumeItem.tipo_item === 'medicamento' && !consumeItem.lote_consumido)}
                >
                  {isProcessing ? <Loader2 className="animate-spin mr-2" size={20} /> : <Save
                    size={20} className="mr-2" />}
                  {isProcessing ? 'Registrando...' : 'Registrar Consumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistorialClinicoPage;
