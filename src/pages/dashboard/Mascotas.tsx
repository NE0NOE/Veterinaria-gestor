import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient'; // Asegúrate de que la ruta sea correcta
import { useAuth } from '../../context/AuthContext'; // Asegúrate de que la ruta sea correcta
import { useNavigate } from 'react-router-dom'; // Para navegación
import {
  PawPrint, PlusCircle, Edit, Trash2, Loader2, XCircle, FileText,
  Dog, Cat, Pill, PhoneCall, CalendarDays, ClipboardList, Stethoscope, AlertCircle
} from 'lucide-react';

// --- Interfaces de Datos (Asegúrate de que coincidan con tu esquema de DB) ---

interface Mascota {
  id_mascota: number;
  id_cliente: number;
  nombre: string;
  especie?: string | null;
  raza?: string | null;
  edad?: number | null;
  peso?: number | null;
}

interface HistorialClinicoEntry {
  id_historial: number;
  id_mascota: number;
  id_cita: number | null;
  fecha_consulta: string;
  motivo_consulta: string;
  diagnostico: string;
  tratamiento: string;
  observaciones: string | null;
}

interface TratamientoDetalle {
  id_tratamiento_detalle: number;
  id_historial: number;
  nombre_tratamiento: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
}

interface MedicamentoCatalogo {
  id_medicamento: number;
  nombre_generico: string;
  nombre_comercial: string | null;
  unidad_medida: string | null;
}

interface InventarioStockItem {
  id_stock: number;
  tipo_item: 'medicamento' | 'suministro';
  id_referencia_item: number;
  cantidad: number;
  lote: string | null;
  fecha_caducidad_lote: string | null;
}

interface PrescripcionClienteDisplay {
  id_prescripcion: number;
  id_historial: number;
  id_medicamento: number;
  cantidad_prescrita: number;
  dosis: string;
  frecuencia: string;
  duracion: string | null;
  fecha_prescripcion: string;
  instrucciones_adicionales: string | null;
  nombre_medicamento?: string;
  stock_status?: 'En Stock' | 'Pocas Unidades' | 'Agotado' | 'No Disponible en Clínica';
  stock_cantidad?: number;
  mascota_nombre?: string; // Se añade para mayor claridad en el display (aunque en este modal ya es la mascota actual)
}

// --- Componente Principal Mascotas ---
const Mascotas: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para el modal de Añadir/Editar Mascota
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMascota, setCurrentMascota] = useState<Mascota | null>(null);
  const [formMascota, setFormMascota] = useState({
    nombre: '',
    especie: '',
    raza: '',
    edad: '',
    peso: '',
  });

  // --- NUEVOS ESTADOS PARA EL MODAL DE HISTORIAL CLÍNICO ---
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [historialMascotaSeleccionada, setHistorialMascotaSeleccionada] = useState<Mascota | null>(null);
  const [historialRecords, setHistorialRecords] = useState<HistorialClinicoEntry[]>([]);
  const [tratamientosHistorial, setTratamientosHistorial] = useState<TratamientoDetalle[]>([]);
  const [prescripcionesHistorial, setPrescripcionesHistorial] = useState<PrescripcionClienteDisplay[]>([]);
  const [isHistorialLoading, setIsHistorialLoading] = useState(true);
  const [historialError, setHistorialError] = useState<string | null>(null);

  // Catálogos e inventario para calcular stock en prescripciones del historial
  const [medicamentosCatalogo, setMedicamentosCatalogo] = useState<MedicamentoCatalogo[]>([]);
  const [inventarioStock, setInventarioStock] = useState<InventarioStockItem[]>([]);

  // Función para obtener el ID del cliente asociado al usuario logeado
  const fetchClientId = useCallback(async () => {
    if (!user?.id) return null;
    try {
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('id_cliente')
        .eq('id_user', user.id)
        .single();

      if (clienteError) {
        if (clienteError.code !== 'PGRST116') {
          console.error('Error fetching id_cliente:', clienteError.message);
          throw new Error('Error loading client information.');
        }
        return null;
      }
      return clienteData?.id_cliente || null;
    } catch (err: any) {
      console.error('Error in fetchClientId:', err.message);
      setError('Error loading client information: ' + err.message);
      return null;
    }
  }, [user]);

  // Función para cargar las mascotas del cliente
  const loadMascotas = useCallback(async () => {
    if (authLoading || !user) {
      setIsLoading(true); // Mantener cargando si auth no está listo
      return;
    }

    setIsLoading(true);
    setError(null);

    const clienteId = await fetchClientId();

    if (!clienteId) {
      setError('Could not retrieve client profile. Please ensure your user account is associated with a client.');
      setIsLoading(false);
      setMascotas([]);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('mascotas')
        .select('id_mascota, id_cliente, nombre, especie, raza, edad, peso')
        .eq('id_cliente', clienteId); // Filtra mascotas por el ID del cliente

      if (fetchError) throw fetchError;
      setMascotas(data || []);
    } catch (err: any) {
      console.error('Error fetching pets:', err.message);
      setError('Error loading your pets: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, authLoading, fetchClientId]);

  // Efecto para cargar los datos iniciales y configurar los listeners en tiempo real para mascotas
  useEffect(() => {
    loadMascotas();

    let subscription: any;
    const setupRealtimeListener = async () => {
      const clientId = await fetchClientId();
      if (!clientId) return; // No se puede configurar el listener sin ID de cliente

      subscription = supabase
        .channel(`public:mascotas:id_cliente=eq.${clientId}`) // Canal específico con filtro por id_cliente
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mascotas', filter: `id_cliente=eq.${clientId}` },
          (payload) => {
            console.log('Realtime change for mascotas received:', payload);
            loadMascotas(); // Recargar todas las mascotas para reflejar el cambio
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to mascotas changes for client:', clientId);
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('Realtime subscription error for mascotas:', err?.message || 'Unknown error');
            setError('Error in real-time subscription for pets: ' + (err?.message || 'Unknown error'));
          }
        });
    };

    if (!authLoading && user) {
      setupRealtimeListener();
    }

    // Función de limpieza para desuscribirse
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
        console.log('Unsubscribed from mascotas changes.');
      }
    };
  }, [authLoading, user, fetchClientId, loadMascotas]);

  // Handler para cambios en los inputs del formulario de Mascota
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormMascota((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Abrir formulario para Añadir Mascota
  const handleAddPetClick = () => {
    setIsEditing(false);
    setCurrentMascota(null);
    setFormMascota({ nombre: '', especie: '', raza: '', edad: '', peso: '' });
    setError(null);
    setSuccess(null);
    setShowFormModal(true);
  };

  // Abrir formulario para Editar Mascota
  const handleEditPetClick = (mascota: Mascota) => {
    setIsEditing(true);
    setCurrentMascota(mascota);
    setFormMascota({
      nombre: mascota.nombre,
      especie: mascota.especie || '',
      raza: mascota.raza || '',
      edad: mascota.edad?.toString() || '',
      peso: mascota.peso?.toString() || '',
    });
    setError(null);
    setSuccess(null);
    setShowFormModal(true);
  };

  // Enviar formulario (Añadir/Editar)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    if (!formMascota.nombre || !formMascota.especie) {
      setError('Nombre y Especie son campos obligatorios.');
      setIsSubmitting(false);
      return;
    }

    const clienteId = await fetchClientId();
    if (!clienteId) {
      setError('Could not retrieve client ID. Please log in again.');
      setIsSubmitting(false);
      return;
    }

    const mascotaData: Omit<Mascota, 'id_mascota'> = {
      id_cliente: clienteId,
      nombre: formMascota.nombre,
      especie: formMascota.especie || null,
      raza: formMascota.raza || null,
      edad: formMascota.edad ? parseInt(formMascota.edad, 10) : null,
      peso: formMascota.peso ? parseFloat(formMascota.peso) : null,
    };

    try {
      if (isEditing && currentMascota) {
        const { error: updateError } = await supabase
          .from('mascotas')
          .update(mascotaData)
          .eq('id_mascota', currentMascota.id_mascota);
        if (updateError) throw updateError;
        setSuccess('Mascota actualizada correctamente.');
      } else {
        const { error: insertError } = await supabase
          .from('mascotas')
          .insert(mascotaData);
        if (insertError) throw insertError;
        setSuccess('Mascota añadida correctamente.');
      }
      setShowFormModal(false);
      loadMascotas(); // Recargar mascotas
    } catch (err: any) {
      console.error('Error saving pet:', err.message);
      setError('Error al guardar la mascota: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar Mascota
  const handleDeletePet = async (id_mascota: number, nombre_mascota: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar a ${nombre_mascota}? Esta acción es irreversible.`)) {
      return;
    }
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const { error: deleteError } = await supabase
        .from('mascotas')
        .delete()
        .eq('id_mascota', id_mascota);

      if (deleteError) {
        if (deleteError.code === '23503') { // PostgreSQL foreign key violation error code
          setError('No se puede eliminar esta mascota porque tiene registros asociados (citas o historial clínico). Elimina primero esos registros.');
        } else {
          throw deleteError;
        }
      } else {
        setSuccess(`${nombre_mascota} ha sido eliminada correctamente.`);
        loadMascotas();
      }
    } catch (err: any) {
      console.error('Error deleting pet:', err.message);
      setError('Error al eliminar la mascota: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- MANEJADORES Y LÓGICA PARA EL MODAL DE HISTORIAL CLÍNICO ---

  // Función para abrir el modal del historial
  const handleViewClinicalHistory = async (mascota: Mascota) => {
    setHistorialMascotaSeleccionada(mascota);
    setShowHistorialModal(true);
    setIsHistorialLoading(true);
    setHistorialError(null);

    try {
      // Cargar catálogos e inventario primero
      const [{ data: medsData, error: medsError },
             { data: invData, error: invError }] = await Promise.all([
          supabase.from('medicamentos').select('id_medicamento, nombre_generico, nombre_comercial, unidad_medida'),
          supabase.from('inventario_stock').select('id_stock, tipo_item, id_referencia_item, cantidad, lote, fecha_caducidad_lote')
      ]);

      if (medsError) throw medsError;
      setMedicamentosCatalogo(medsData || []);

      if (invError) throw invError;
      setInventarioStock(invData || []);

      // Cargar historial clínico
      const { data: historialData, error: historialErrorFetch } = await supabase
        .from('historial_clinico')
        .select('*')
        .eq('id_mascota', mascota.id_mascota)
        .order('fecha_consulta', { ascending: false });

      if (historialErrorFetch) throw historialErrorFetch;
      setHistorialRecords(historialData || []);

      const historialIds = (historialData || []).map(h => h.id_historial);

      // Cargar tratamientos
      if (historialIds.length > 0) {
        const { data: tratamientosData, error: tratamientosErrorFetch } = await supabase
          .from('tratamientos_detalles')
          .select('*')
          .in('id_historial', historialIds)
          .order('fecha_inicio', { ascending: false });

        if (tratamientosErrorFetch) throw tratamientosErrorFetch;
        setTratamientosHistorial(tratamientosData || []);
      } else {
        setTratamientosHistorial([]);
      }

      // Cargar prescripciones y enriquecer con stock
      if (historialIds.length > 0) {
        const { data: prescripcionesRaw, error: prescripcionesErrorFetch } = await supabase
          .from('prescripciones')
          .select(`
            id_prescripcion,
            id_historial,
            id_medicamento,
            cantidad_prescrita,
            dosis,
            frecuencia,
            duracion,
            fecha_prescripcion,
            instrucciones_adicionales
          `)
          .in('id_historial', historialIds)
          .order('fecha_prescripcion', { ascending: false });

        if (prescripcionesErrorFetch) throw prescripcionesErrorFetch;

        const enrichedPrescripciones: PrescripcionClienteDisplay[] = (prescripcionesRaw || []).map((p: any) => {
          const medicamento = (medsData || []).find(m => m.id_medicamento === p.id_medicamento);
          const nombre_medicamento = medicamento ? (medicamento.nombre_generico || medicamento.nombre_comercial) : 'Medicamento Desconocido';

          const totalStock = (invData || [])
            .filter(item => item.tipo_item === 'medicamento' && item.id_referencia_item === p.id_medicamento)
            .reduce((sum, item) => sum + item.cantidad, 0);

          let stock_status: PrescripcionClienteDisplay['stock_status'] = 'No Disponible en Clínica';
          const existsInInventory = (invData || []).some(item =>
            item.tipo_item === 'medicamento' && item.id_referencia_item === p.id_medicamento
          );

          if (existsInInventory) {
            if (totalStock === 0) {
              stock_status = 'Agotado';
            } else if (totalStock > 0 && totalStock <= 5) {
              stock_status = 'Pocas Unidades';
            } else { // totalStock > 5
              stock_status = 'En Stock';
            }
          } else {
            stock_status = 'No Disponible en Clínica';
          }

          return {
            ...p,
            nombre_medicamento,
            stock_status,
            stock_cantidad: totalStock,
            mascota_nombre: mascota.nombre // Nombre de la mascota actual
          };
        });
        setPrescripcionesHistorial(enrichedPrescripciones);
      } else {
        setPrescripcionesHistorial([]);
      }

    } catch (err: any) {
      console.error('Error al cargar historial clínico:', err.message);
      setHistorialError('Error al cargar el historial: ' + (err.message || 'Error desconocido.'));
      setHistorialRecords([]);
      setTratamientosHistorial([]);
      setPrescripcionesHistorial([]);
    } finally {
      setIsHistorialLoading(false);
    }
  };

  // Efecto para listeners en tiempo real del modal del historial
  useEffect(() => {
    let historialChannel: any;
    let tratamientosChannel: any;
    let prescripcionesChannel: any;
    let inventarioChannel: any;
    let medicamentosChannel: any;

    if (showHistorialModal && historialMascotaSeleccionada) {
      const mascotaId = historialMascotaSeleccionada.id_mascota;

      // Listener para historial_clinico
      historialChannel = supabase
          .channel(`historial_clinico_modal_${mascotaId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_clinico', filter: `id_mascota=eq.${mascotaId}` }, (payload) => {
              console.log('Realtime: Cambio en historial clínico (modal), recargando...', payload);
              handleViewClinicalHistory(historialMascotaSeleccionada); // Recargar
          })
          .subscribe((status, err) => {
              if (status === 'CHANNEL_ERROR') console.error('Error Realtime historial clínico (modal):', err?.message || err);
          });

      // Listener para tratamientos_detalles (afecta el historial)
      tratamientosChannel = supabase
          .channel(`tratamientos_detalles_modal_${mascotaId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tratamientos_detalles' }, (payload) => {
              // Si tuvieras un filtro por id_historial específico, lo pondrías aquí.
              // Dado que 'tratamientos_detalles' no tiene id_mascota directamente,
              // una recarga general del historial es lo más simple si hay un cambio.
              console.log('Realtime: Cambio en tratamientos detalles (modal), recargando...', payload);
              handleViewClinicalHistory(historialMascotaSeleccionada); // Recargar
          })
          .subscribe((status, err) => {
              if (status === 'CHANNEL_ERROR') console.error('Error Realtime tratamientos detalles (modal):', err?.message || err);
          });

      // Listener para prescripciones
      prescripcionesChannel = supabase
        .channel(`prescripciones_modal_${mascotaId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'prescripciones' },
          (payload) => {
            console.log('Realtime: Cambio en prescripciones (modal), re-cargando stock...', payload);
            handleViewClinicalHistory(historialMascotaSeleccionada);
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR') console.error('Error Realtime prescripciones (modal):', err?.message || err);
        });

      // Listener para inventario_stock
      inventarioChannel = supabase
        .channel(`inventario_stock_modal_${mascotaId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'inventario_stock' },
          (payload) => {
            console.log('Realtime: Cambio en inventario (modal), re-calculando stock...', payload);
            handleViewClinicalHistory(historialMascotaSeleccionada);
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR') console.error('Error Realtime inventario (modal):', err?.message || err);
        });

      // Listener para medicamentos
      medicamentosChannel = supabase
        .channel(`medicamentos_modal_${mascotaId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'medicamentos' },
          (payload) => {
            console.log('Realtime: Cambio en medicamentos (modal), re-cargando stock...', payload);
            handleViewClinicalHistory(historialMascotaSeleccionada);
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR') console.error('Error Realtime medicamentos (modal):', err?.message || err);
        });
    }

    return () => {
      if (historialChannel) supabase.removeChannel(historialChannel);
      if (tratamientosChannel) supabase.removeChannel(tratamientosChannel);
      if (prescripcionesChannel) supabase.removeChannel(prescripcionesChannel);
      if (inventarioChannel) supabase.removeChannel(inventarioChannel);
      if (medicamentosChannel) supabase.removeChannel(medicamentosChannel);
      console.log('Desuscripto de canales del modal de historial clínico.');
    };
  }, [showHistorialModal, historialMascotaSeleccionada, handleViewClinicalHistory]); // Dependencia de handleViewClinicalHistory es importante para que el efecto se re-ejecute


  // Cierre del modal de historial
  const closeHistorialModal = () => {
    setShowHistorialModal(false);
    setHistorialMascotaSeleccionada(null);
    setHistorialRecords([]);
    setTratamientosHistorial([]);
    setPrescripcionesHistorial([]);
    setHistorialError(null);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <Loader2 className="animate-spin mr-2" size={24} />
        <p className="text-xl text-indigo-400">Cargando tus mascotas...</p>
      </div>
    );
  }

  if (error && !showFormModal) { // Solo muestra el error global si no está en el modal del formulario
    return (
      <div className="p-6 bg-gray-900 text-white min-h-screen font-inter">
        <div className="bg-red-800 p-4 rounded-md text-red-100 mb-4">
          <p>Error: {error}</p>
          <p className="text-sm mt-2">Asegúrate de que estás autenticado y que las tablas y sus políticas RLS están configuradas correctamente para tu rol de cliente.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition shadow-md"
        >
          Reintentar Carga
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 text-white space-y-8 min-h-screen font-inter">
      <h2 className="text-3xl font-extrabold text-indigo-400 text-center mb-8 flex items-center justify-center gap-2">
        <PawPrint size={30} /> Mis Mascotas
      </h2>

      {/* Global messages */}
      {success && (
        <div className="bg-green-700 text-green-100 px-4 py-3 rounded-md text-sm text-center flex items-center justify-between">
          <span>{success}</span>
          <XCircle size={20} className="cursor-pointer" onClick={() => setSuccess(null)} />
        </div>
      )}

      {/* Add New Pet Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleAddPetClick}
          className="px-6 py-3 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-semibold shadow-md transition transform hover:scale-105 flex items-center gap-2"
        >
          <PlusCircle size={20} /> Añadir Nueva Mascota
        </button>
      </div>

      {/* Pets List */}
      {mascotas.length === 0 && !isLoading && !showFormModal ? (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 text-center">
          <p className="text-gray-400 text-lg mb-4">No tienes mascotas registradas aún. ¡Añade la primera!</p>
          <button
            onClick={handleAddPetClick}
            className="px-6 py-3 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-semibold shadow-md transition transform hover:scale-105 flex items-center gap-2 mx-auto"
          >
            <PlusCircle size={20} /> Añadir Primera Mascota
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mascotas.map((mascota) => (
            <div key={mascota.id_mascota} className="bg-gray-800 p-6 rounded-lg shadow-xl border border-teal-700 flex flex-col items-center text-center">
              {mascota.especie?.toLowerCase() === 'perro' ? (
                <Dog size={64} className="text-teal-400 mb-4" />
              ) : mascota.especie?.toLowerCase() === 'gato' ? (
                <Cat size={64} className="text-teal-400 mb-4" />
              ) : (
                <PawPrint size={64} className="text-teal-400 mb-4" />
              )}
              <h3 className="text-2xl font-bold text-white mb-2">{mascota.nombre}</h3>
              <p className="text-teal-200 text-lg mb-1">
                {mascota.especie} {mascota.raza ? `(${mascota.raza})` : ''}
              </p>
              {mascota.edad !== null && mascota.edad !== undefined && (
                <p className="text-teal-300">Edad: {mascota.edad} años</p>
              )}
              {mascota.peso !== null && mascota.peso !== undefined && (
                <p className="text-teal-300">Peso: {mascota.peso} kg</p>
              )}
              <div className="mt-6 flex flex-wrap justify-center gap-3 w-full">
                <button
                  onClick={() => handleViewClinicalHistory(mascota)} // Pasa el objeto mascota completo
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-md font-semibold transition flex items-center gap-2"
                >
                  <FileText size={18} /> Ver Historial
                </button>
                <button
                  onClick={() => handleEditPetClick(mascota)}
                  className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded-md font-semibold transition flex items-center gap-2"
                >
                  <Edit size={18} /> Editar
                </button>
                <button
                  onClick={() => handleDeletePet(mascota.id_mascota, mascota.nombre)}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md font-semibold transition flex items-center gap-2"
                >
                  <Trash2 size={18} /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Pet Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md space-y-6 border border-indigo-700 animate-fade-in">
            <h3 className="text-2xl font-bold text-indigo-400 text-center">
              {isEditing ? 'Editar Mascota' : 'Añadir Nueva Mascota'}
            </h3>
            {error && ( // Errores del formulario específico
              <div className="bg-red-800 text-red-100 px-4 py-3 rounded-md text-sm text-center flex items-center justify-between">
                <span>{error}</span>
                <XCircle size={20} className="cursor-pointer" onClick={() => setError(null)} />
              </div>
            )}
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-300 mb-1">Nombre:</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formMascota.nombre}
                  onChange={handleFormChange}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Nombre de la mascota"
                  required
                />
              </div>
              <div>
                <label htmlFor="especie" className="block text-sm font-medium text-gray-300 mb-1">Especie:</label>
                <input
                  type="text"
                  id="especie"
                  name="especie"
                  value={formMascota.especie}
                  onChange={handleFormChange}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ej. Perro, Gato, Ave"
                  required
                />
              </div>
              <div>
                <label htmlFor="raza" className="block text-sm font-medium text-gray-300 mb-1">Raza (Opcional):</label>
                <input
                  type="text"
                  id="raza"
                  name="raza"
                  value={formMascota.raza}
                  onChange={handleFormChange}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ej. Labrador, Siames"
                />
              </div>
              <div>
                <label htmlFor="edad" className="block text-sm font-medium text-gray-300 mb-1">Edad (años, opcional):</label>
                <input
                  type="number"
                  id="edad"
                  name="edad"
                  value={formMascota.edad}
                  onChange={handleFormChange}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ej. 3"
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="peso" className="block text-sm font-medium text-gray-300 mb-1">Peso (kg, opcional):</label>
                <input
                  type="number"
                  id="peso"
                  name="peso"
                  value={formMascota.peso}
                  onChange={handleFormChange}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ej. 15.5"
                  step="0.1"
                  min="0"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-md font-semibold transition flex items-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                  {isEditing ? 'Guardar Cambios' : 'Añadir Mascota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE HISTORIAL CLÍNICO (Solo lectura con stock) --- */}
      {showHistorialModal && historialMascotaSeleccionada && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-4xl space-y-6 border border-blue-700 transform scale-100 animate-scale-in overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-blue-400 flex items-center gap-2">
                <FileText size={24} /> Historial Clínico de {historialMascotaSeleccionada.nombre}
              </h3>
              <button
                onClick={closeHistorialModal}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition"
              >
                <XCircle size={24} />
              </button>
            </div>

            {isHistorialLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin mr-2 text-blue-400" size={28} />
                <p className="text-xl text-blue-400">Cargando historial...</p>
              </div>
            ) : historialError ? (
              <div className="bg-red-800 text-red-100 p-4 rounded-lg text-center border border-red-600">
                <AlertCircle size={24} className="inline-block mr-3" />
                <span>{historialError}</span>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Datos de la Mascota en el modal */}
                <section className="bg-gray-700 p-6 rounded-lg border border-gray-600 shadow-sm">
                    <h4 className="text-xl text-indigo-300 mb-4 font-semibold flex items-center gap-2">
                        <PawPrint size={20} /> Detalles de {historialMascotaSeleccionada.nombre}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-300 text-base">
                        <p><strong className="text-white">Especie:</strong> {historialMascotaSeleccionada.especie}</p>
                        {historialMascotaSeleccionada.raza && <p><strong className="text-white">Raza:</strong> {historialMascotaSeleccionada.raza}</p>}
                        {historialMascotaSeleccionada.edad !== null && <p><strong className="text-white">Edad:</strong> {historialMascotaSeleccionada.edad} años</p>}
                        {historialMascotaSeleccionada.peso !== null && <p><strong className="text-white">Peso:</strong> {historialMascotaSeleccionada.peso} kg</p>}
                    </div>
                </section>

                {/* Sección de Prescripciones y Stock */}
                <section className="bg-gray-700 p-6 rounded-lg border border-gray-600 shadow-sm">
                  <h4 className="text-xl text-teal-300 mb-4 font-semibold flex items-center gap-2">
                    <Pill size={20} /> Prescripciones Médicas
                  </h4>
                  {prescripcionesHistorial.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No hay prescripciones registradas para esta mascota.</p>
                  ) : (
                    <div className="space-y-4">
                      {prescripcionesHistorial.map((prescripcion) => (
                        <div key={prescripcion.id_prescripcion} className="bg-gray-600 p-4 rounded-md border border-gray-500 flex flex-col md:flex-row justify-between items-start md:items-center">
                          <div>
                            <p className="text-lg font-semibold text-white">
                              {prescripcion.nombre_medicamento} - {prescripcion.dosis}
                            </p>
                            <p className="text-gray-300 text-sm">
                              <span className="font-medium">Cantidad Recetada:</span> {prescripcion.cantidad_prescrita} unid.
                            </p>
                            <p className="text-gray-300 text-sm">
                              <span className="font-medium">Frecuencia:</span> {prescripcion.frecuencia}
                              {prescripcion.duracion && ` | Duración: ${prescripcion.duracion}`}
                            </p>
                            <p className="text-gray-300 text-sm">
                              <span className="font-medium">Fecha de prescripción:</span> {new Date(prescripcion.fecha_prescripcion).toLocaleDateString()}
                            </p>
                            {prescripcion.instrucciones_adicionales && (
                              <p className="text-gray-300 text-sm">
                                <span className="font-medium">Instrucciones:</span> {prescripcion.instrucciones_adicionales}
                              </p>
                            )}
                          </div>
                          <div className="mt-2 md:mt-0 md:ml-4 flex items-center gap-2">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full
                              ${prescripcion.stock_status === 'En Stock' ? 'bg-green-600 text-white' : ''}
                              ${prescripcion.stock_status === 'Pocas Unidades' ? 'bg-orange-600 text-white' : ''}
                              ${prescripcion.stock_status === 'Agotado' ? 'bg-red-600 text-white' : ''}
                              ${prescripcion.stock_status === 'No Disponible en Clínica' ? 'bg-gray-500 text-white' : ''}
                            `}>
                              {prescripcion.stock_status}
                              {(prescripcion.stock_status === 'En Stock' || prescripcion.stock_status === 'Pocas Unidades') && ` (${prescripcion.stock_cantidad} unid.)`}
                            </span>
                            {(prescripcion.stock_status === 'Agotado' || prescripcion.stock_status === 'No Disponible en Clínica') && (
                              <button
                                onClick={() => alert('Para adquirir este medicamento, por favor contacta a la clínica directamente. Tel: 5766 0362')}
                                className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition flex items-center gap-1"
                              >
                                <PhoneCall size={14} /> Contactar Clínica
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Sección de Registros de Consultas */}
                <section className="bg-gray-700 p-6 rounded-lg border border-gray-600 shadow-sm">
                  <h4 className="text-xl text-yellow-300 mb-4 font-semibold flex items-center gap-2">
                    <ClipboardList size={20} /> Registros de Consultas
                  </h4>
                  {historialRecords.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No hay registros de consultas para esta mascota.</p>
                  ) : (
                    <div className="space-y-4">
                      {historialRecords.map((record) => (
                        <div key={record.id_historial} className="bg-gray-600 p-4 rounded-md border border-gray-500 shadow-sm">
                          <p className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                            <CalendarDays size={18} /> Fecha: {new Date(record.fecha_consulta).toLocaleDateString()}
                          </p>
                          <p className="mb-2"><strong className="text-gray-300">Motivo:</strong> {record.motivo_consulta}</p>
                          <p className="mb-2"><strong className="text-gray-300">Diagnóstico:</strong> {record.diagnostico}</p>
                          <p className="mb-2"><strong className="text-gray-300">Tratamiento General:</strong> {record.tratamiento}</p>
                          {record.observaciones && <p className="mb-2"><strong className="text-gray-300">Observaciones:</strong> {record.observaciones}</p>}

                          {/* Mostrar Tratamientos Específicos si existen */}
                          {tratamientosHistorial.filter(t => t.id_historial === record.id_historial).length > 0 && (
                            <div className="mt-4 border-t border-gray-500 pt-4">
                              <h6 className="text-md font-semibold text-indigo-200 mb-2 flex items-center gap-1">
                                <Stethoscope size={16} /> Tratamientos Específicos:
                              </h6>
                              <ul className="list-disc list-inside text-gray-300 space-y-1">
                                {tratamientosHistorial
                                  .filter(t => t.id_historial === record.id_historial)
                                  .map((t, i) => (
                                    <li key={i}>
                                      <strong className="text-gray-200">{t.nombre_tratamiento}:</strong> {t.descripcion || 'Sin descripción'} ({new Date(t.fecha_inicio).toLocaleDateString()} {t.fecha_fin ? ` - ${new Date(t.fecha_fin).toLocaleDateString()}` : ''})
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Mascotas;
