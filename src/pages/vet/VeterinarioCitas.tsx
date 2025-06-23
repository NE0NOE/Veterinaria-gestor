import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient'; // Asegúrate de que la ruta


import { useAuth } from '../../context/AuthContext'; // Asegúrate de que la

import {
  CalendarCheck, PawPrint, Loader2, AlertTriangle, Check, XCircle,
  Search, User as UserIcon, CalendarPlus, PlusCircle, RefreshCw,
  History as HistoryIcon, Info // Icono Info para el modal de detalles
} from 'lucide-react';

import ConfirmationModal from '../../components/ConfirmationModal'; //


import moment from 'moment'; // Para formateo de fechas y manejo de zonas

// Type Interfaces (Confirmed with your DB schema)

interface Cliente {
  id_cliente: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
}

interface Mascota {
  id_mascota: number;
  id_cliente: number | null; // Importante: puede ser null si la mascota no
  // está vinculada a un cliente registrado
  nombre: string;
  especie: string | null;
  raza: string | null;
  edad: number | null;
  peso: number | null;
}

interface CitaVeterinarioDetalle {
  id_cita: number;
  id_mascota: number | null;
  id_cliente: number | null;
  fecha: string; // TIMESTAMP WITHOUT TIME ZONE
  motivo: string;
  estado: string; // 'pendiente', 'aprobada', 'programada', 'realizada', 'cancelada'
  tipo: string | null;
  id_veterinario: number | null;
  nombre_cliente_invitado: string | null;
  nombre_mascota_invitada: string | null;
  // Datos combinados de las relaciones (añadidos en el frontend)
  mascota_nombre?: string;
  mascota_especie?: string | null;
  cliente_nombre?: string;
  cliente_email?: string | null;
  cliente_telefono?: string | null;
}

interface VeterinarioProfile {
  id_veterinario: number;
  nombre: string;
  especialidad: string | null;
  email: string;
  telefono: string;
  id_user: string;
}

// Estado inicial para el formulario de nueva cita
const initialNewCitaFormState = {
  id_cliente: '',
  id_mascota: '',
  fecha: new Date().toISOString().slice(0, 16), // Formato JAMAIS-MM-DDTHH:MM para datetime-local
  motivo: '',
  tipo: '',
  nombre_cliente_invitado: '',
  nombre_mascota_invitada: ''
};

// Componente Modal para mostrar detalles de la cita
interface CitaDetailModalProps {
  isOpen: boolean;
  cita: CitaVeterinarioDetalle | null;
  onClose: () => void;
  allVeterinarios: VeterinarioProfile[]; // Para mostrar el nombre del veterinario asignado
}

const CitaDetailModal: React.FC<CitaDetailModalProps> = ({ isOpen, cita, onClose, allVeterinarios }) => {
  if (!isOpen || !cita) return null;

  const assignedVet = allVeterinarios.find(vet => vet.id_veterinario === cita.id_veterinario);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-lg w-full border border-blue-700 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          title="Cerrar Detalles"
        >
          <XCircle size={24} />
        </button>
        <h3 className="text-2xl font-bold text-blue-400 mb-6 text-center flex items-center justify-center gap-2">
          <Info size={24} /> Detalles de la Cita
        </h3>

        <div className="space-y-3 text-gray-200">
          <p><strong>Fecha y Hora:</strong> {moment(cita.fecha).format('DD/MM/YYYY HH:mm [hrs]')}</p>
          <p><strong>Mascota:</strong> {cita.mascota_nombre || cita.nombre_mascota_invitada || 'N/A'} ({cita.mascota_especie || 'Desconocida'})</p>
          <p><strong>Cliente:</strong> {cita.cliente_nombre || cita.nombre_cliente_invitado || 'N/A'}</p>
          {cita.cliente_email && <p><strong>Email Cliente:</strong> {cita.cliente_email}</p>}
          {cita.cliente_telefono && <p><strong>Teléfono Cliente:</strong> {cita.cliente_telefono}</p>}
          <p><strong>Motivo:</strong> {cita.motivo}</p>
          <p><strong>Tipo:</strong> {cita.tipo || 'General'}</p>
          <p><strong>Estado:</strong> <span className={`px-2 py-1 rounded-full text-xs font-semibold
            ${cita.estado.toLowerCase() === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : ''}
            ${cita.estado.toLowerCase() === 'aprobada' ? 'bg-green-100 text-green-800' : ''}
            ${cita.estado.toLowerCase() === 'programada' ? 'bg-purple-100 text-purple-800' : ''}
            ${cita.estado.toLowerCase() === 'realizada' ? 'bg-blue-100 text-blue-800' : ''}
            ${cita.estado.toLowerCase() === 'cancelada' ? 'bg-red-100 text-red-800' : ''}
            `}>{cita.estado}</span></p>
          <p><strong>Veterinario Asignado:</strong> {assignedVet ? assignedVet.nombre : 'No asignado'}</p>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-md"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};


//--- Componente Principal VeterinarioCitas ---
const VeterinarioCitas: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  const [loadingContent, setLoadingContent] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [citas, setCitas] = useState<CitaVeterinarioDetalle[]>([]);
  const [veterinarioProfile, setVeterinarioProfile] =
    useState<VeterinarioProfile | null>(null);
  const [allVeterinarios, setAllVeterinarios] = useState<VeterinarioProfile[]>([]); // Nuevo estado para todos los veterinarios

  // Catálogos para formularios (clientes, mascotas)
  const [allClients, setAllClients] = useState<Cliente[]>([]);
  const [allMascotas, setAllMascotas] = useState<Mascota[]>([]);

  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('todas'); //
  // 'todas', 'pendiente', 'aprobada', 'programada', 'realizada', 'cancelada'
  const [filterType, setFilterType] = useState<string>('todos'); // 'todos',
  // 'chequeo', 'vacunacion', etc.
  const [filterDate, setFilterDate] = useState<string>(''); // Formato
  // 'YYYY-MM-DD'

  // Estados para modales de acción
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [confirmationAction, setConfirmationAction] = useState<('asignar' |
    'completar' | 'cancelar' | 'revertir') | null>(null);
  const [citaToActon, setCitaToActon] = useState<CitaVeterinarioDetalle |
    null>(null);

  // Estados para Modal de Añadir Nueva Cita
  const [showAddCitaModal, setShowAddCitaModal] = useState<boolean>(false);
  const [newCitaForm, setNewCitaForm] = useState(initialNewCitaFormState);
  const [filteredMascotasForForm, setFilteredMascotasForForm] =
    useState<Mascota[]>([]);
  const [isSubmittingNewCita, setIsSubmittingNewCita] =
    useState<boolean>(false);

  // NUEVOS ESTADOS para el modal de visualización de detalles de cita
  const [selectedCitaForDetails, setSelectedCitaForDetails] = useState<CitaVeterinarioDetalle | null>(null);
  const [showCitaDetailsModal, setShowCitaDetailsModal] = useState(false);

  // Función para obtener el perfil del veterinario logueado (reutilizada)
  const fetchVeterinarioProfile = useCallback(async (userId: string):
    Promise<VeterinarioProfile | null> => {
    try {
      const { data, error: profileError } = await supabase
        .from('veterinarios')
        .select('id_veterinario, nombre, especialidad, email, telefono, id_user')
        .eq('id_user', userId)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          throw new Error('No se encontró un perfil de veterinario para tu' +
            'usuario. Asegúrate de que tu cuenta esté asociada a un veterinario.');
        }
        throw profileError;
      }
      return data as VeterinarioProfile;
    } catch (err: any) {
      console.error('Error al obtener el perfil del veterinario:',
        err.message);
    }
    return null;
  }, []);

  // Función para obtener TODOS los perfiles de veterinarios (para el modal de detalles)
  const fetchAllVeterinarios = useCallback(async () => {
    try {
      // Modificado: Seleccionar todas las propiedades que requiere VeterinarioProfile
      const { data, error } = await supabase
        .from('veterinarios')
        .select('id_veterinario, nombre, especialidad, email, telefono, id_user');
      if (error) throw error;
      setAllVeterinarios(data || []);
    } catch (err: any) {
      console.error('Error al cargar la lista de veterinarios:', err.message);
    }
  }, []);

  // Función principal para cargar TODOS los datos de citas, clientes y
  // mascotas
  const loadAllAppointmentData = useCallback(async () => {
    setLoadingContent(true);
    setError(null);
    setSuccessMessage(null); // Limpiar mensajes de éxito al recargar

    if (!user) {
      setLoadingContent(false);
      return;
    }

    try {
      // 1. Obtener el perfil del veterinario y todos los veterinarios
      const [profile] = await Promise.all([
        fetchVeterinarioProfile(user.id),
        fetchAllVeterinarios() // Llama a la función para cargar todos los veterinarios
      ]);

      if (!profile) {
        throw new Error('Perfil de veterinario no encontrado o no autorizado.');
      }
      setVeterinarioProfile(profile);

      // 2. Obtener todos los clientes y mascotas (los "catálogos")
      const [{ data: clientsData, error: clientsError },
        { data: mascotasData, error: mascotasError }] = await
        Promise.all([
          supabase.from('clientes').select('id_cliente, nombre, email, telefono'),
          supabase.from('mascotas').select('id_mascota, id_cliente, nombre, especie, raza, edad, peso')
        ]);

      if (clientsError) throw clientsError;
      setAllClients(clientsData || []);

      if (mascotasError) throw mascotasError;
      setAllMascotas(mascotasData || []);

      // 3. Obtener todas las citas
      const { data: citasRaw, error: citasError } = await supabase
        .from('citas')
        .select(`
          id_cita,
          id_mascota,
          id_cliente,
          fecha,
          motivo,
          estado,
          tipo,
          id_veterinario,
          nombre_cliente_invitado,
          nombre_mascota_invitada
        `)
        .order('fecha', { ascending: true }); // Ordenar por fecha por
      // defecto

      if (citasError) throw citasError;

      // 4. Combinar los datos de las citas con los detalles de cliente y
      // mascota
      const allCitas: CitaVeterinarioDetalle[] = (citasRaw || []).map((cita: any) => {
        const cliente = cita.id_cliente ? (clientsData || []).find(c =>
          c.id_cliente === cita.id_cliente) : null;

        const mascota = cita.id_mascota ? (mascotasData || []).find(m =>
          m.id_mascota === cita.id_mascota) : null;

        return {
          id_cita: cita.id_cita,
          id_mascota: cita.id_mascota,
          id_cliente: cita.id_cliente,
          fecha: cita.fecha,
          motivo: cita.motivo,
          estado: cita.estado,
          tipo: cita.tipo,
          id_veterinario: cita.id_veterinario,
          nombre_cliente_invitado: cita.nombre_cliente_invitado,
          nombre_mascota_invitada: cita.nombre_mascota_invitada,
          mascota_nombre: mascota?.nombre,
          mascota_especie: mascota?.especie,
          cliente_nombre: cliente?.nombre,
          cliente_email: cliente?.email,
          cliente_telefono: cliente?.telefono,
        };
      });

      setCitas(allCitas);

    } catch (err: any) {
      console.error('Error al cargar todos los datos de citas:',
        err.message);
      setError('Error al cargar citas: ' + err.message);
    } finally {
      setLoadingContent(false);
    }
  }, [user, fetchVeterinarioProfile, fetchAllVeterinarios]); // Agregado fetchAllVeterinarios a las dependencias

  // Efecto principal para la carga inicial y ELIMINACIÓN DE SUSCRIPCIONES
  // REALTIME
  useEffect(() => {
    loadAllAppointmentData(); // Carga inicial

    // IMPORTANT: Se han REMOVIDO las suscripciones en tiempo real
    // (Realtime)
    // para evitar el "parpadeo" y permitir actualizaciones manuales con el
    // botón.
    // Si en el futuro necesitas Realtime, considera un enfoque más
    // sofisticado
    // que no implique recargar toda la lista o que maneje las animaciones
    // de forma más suave.
    // La función de retorno vacio o sin suscripciones no es necesaria si no
    // hay canales que remover.
    return () => {
      // No hay suscripciones de Realtime para remover en este componente
      // Si las vuelves a añadir, asegúrate de removerlas aqui.
    };
  }, [authLoading, user, loadAllAppointmentData]); // Dependencias:
  // authLoading, user y la función loadAllAppointmentData

  // Manejar actualización de estado de una cita (asignar, completar,
  // cancelar, revertir)
  const handleUpdateCitaStatus = useCallback(async (citaId: number,
    newStatus: string, vetId: number | null = null) => {

    setLoadingContent(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updateData: { estado: string; id_veterinario?: number | null } =
        { estado: newStatus };

      // Lógica para asignar (pendiente -> programada)
      if (newStatus === 'programada' && vetId !== null) {
        updateData.id_veterinario = vetId; // Asignar veterinario
        setSuccessMessage('¡Cita asignada y programada correctamente!');
      }
      // Lógica para revertir
      else if (newStatus === 'revertir') {
        const currentCita = citas.find(c => c.id_cita === citaId);
        if (currentCita?.id_veterinario !== null) {
          updateData.estado = 'programada'; // Revertir a programada si tenía vet asignado
          updateData.id_veterinario = currentCita?.id_veterinario; // Mantener asignación
          setSuccessMessage('¡Cita revertida a Programada correctamente!');
        } else {
          updateData.estado = 'pendiente'; // Revertir a pendiente si no tenía vet asignado
          updateData.id_veterinario = null;
          setSuccessMessage('¡Cita revertida a Pendiente correctamente!');
        }
      }
      // Lógica para completar o cancelar (solo actualiza estado)
      else if (newStatus === 'realizada') {
        setSuccessMessage('¡Cita marcada como REALIZADA correctamente!');
      }
      else if (newStatus === 'cancelada') {
        setSuccessMessage('¡Cita CANCELADA correctamente!');
      }

      const { error: updateError } = await supabase
        .from('citas')
        .update(updateData)
        .eq('id_cita', citaId);

      if (updateError) {
        throw new Error(`Error de Supabase al actualizar cita: ${updateError.message}`);
      }

      loadAllAppointmentData(); // Recargar datos manualmente después de la
      // actualización exitosa
    } catch (err: any) {
      console.error('Error al actualizar cita:', err.message);
      setError(`No se pudo actualizar la cita: ${err.message}`);
    } finally {
      setLoadingContent(false);
      setShowConfirmation(false); // Asegurarse de cerrar el modal de
      // confirmación
      setCitaToActon(null);
      setConfirmationAction(null);
    }
  }, [loadAllAppointmentData, citas]); // Dependencia de citas para currentCita

  // Handler para mostrar el modal de confirmación
  const handleOpenConfirmation = (cita: CitaVeterinarioDetalle, action:
    'asignar' | 'completar' | 'cancelar' | 'revertir') => {
    setCitaToActon(cita);
    setConfirmationAction(action);
    setShowConfirmation(true);
  };

  // Función para confirmar la acción del modal
  const confirmAction = () => {
    if (!citaToActon || !veterinarioProfile || !confirmationAction) return;

    if (confirmationAction === 'asignar') {
      // Al asignarse, el estado cambia a 'programada'
      handleUpdateCitaStatus(citaToActon.id_cita, 'programada',
        veterinarioProfile.id_veterinario);
    } else if (confirmationAction === 'completar') {
      handleUpdateCitaStatus(citaToActon.id_cita, 'realizada');
    } else if (confirmationAction === 'cancelar') {
      handleUpdateCitaStatus(citaToActon.id_cita, 'cancelada');
    } else if (confirmationAction === 'revertir') {
      handleUpdateCitaStatus(citaToActon.id_cita, 'revertir');
    }
  };

  // Filtrado y búsqueda de citas usando useMemo para optimización
  const filteredCitas = useMemo(() => {
    let currentCitas = citas;

    // Filtrar por estado
    if (filterStatus !== 'todas') {
      currentCitas = currentCitas.filter(cita => cita.estado.toLowerCase()
        === filterStatus);
    }

    // Filtrar por tipo
    if (filterType !== 'todos') {
      currentCitas = currentCitas.filter(cita => cita.tipo?.toLowerCase()
        === filterType);
    }

    // Filtrar por fecha
    if (filterDate) {
      currentCitas = currentCitas.filter(cita => {
        const citaDate = moment(cita.fecha).format('YYYY-MM-DD');
        return citaDate === filterDate;
      });
    }

    // Búsqueda por término (nombre de mascota o cliente, motivo, estado,
    // tipo)
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();

      currentCitas = currentCitas.filter(cita =>
        (cita.mascota_nombre?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (cita.nombre_mascota_invitada?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (cita.cliente_nombre?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (cita.nombre_cliente_invitado?.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (cita.motivo.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (cita.estado.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (cita.tipo?.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    return currentCitas;
  }, [citas, filterStatus, filterType, filterDate, searchTerm]);

  // Manejar cambios en el formulario de nueva cita

  const handleNewCitaFormChange = (e: React.ChangeEvent<HTMLInputElement |
    HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCitaForm(prev => ({ ...prev, [name]: value }));

    // Si el cliente cambia, filtrar mascotas
    if (name === 'id_cliente') {
      const selectedClientId = value ? parseInt(value) : null;
      if (selectedClientId) {
        setFilteredMascotasForForm(allMascotas.filter(m => m.id_cliente ===
          selectedClientId));
        setNewCitaForm(prev => ({ ...prev, id_mascota: '' })); // Reiniciar
        // selección de mascota
      } else {
        setFilteredMascotasForForm([]); // Si no hay cliente, limpiar mascotas filtradas
        setNewCitaForm(prev => ({ ...prev, id_mascota: '' }));
      }
    }
  };

  // Manejar la adición de una nueva cita
  const handleAddNewCita = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingNewCita(true);
    setError(null);
    setSuccessMessage(null);

    if (!veterinarioProfile) {
      setError('El perfil del veterinario no se ha cargado. No se puede' +
        ' añadir la cita.');
      setIsSubmittingNewCita(false);
      return;
    }

    // Validación básica
    if (!newCitaForm.fecha || !newCitaForm.motivo || !newCitaForm.tipo) {
      setError('Fecha, motivo y tipo son campos obligatorios.');
      setIsSubmittingNewCita(false);
      return;
    }

    // Validar si se proporciona (cliente/mascota) o (cliente
    // invitado/nombre mascota invitada)
    const isRegisteredClientSelected = newCitaForm.id_cliente &&
      newCitaForm.id_mascota;
    const isGuestAppointment = newCitaForm.nombre_cliente_invitado &&
      newCitaForm.nombre_mascota_invitada;

    if (!isRegisteredClientSelected && !isGuestAppointment) {
      setError('Por favor, selecciona un cliente y una mascota registrados, o' +
        ' proporciona nombres para una cita de invitado.');
      setIsSubmittingNewCita(false);
      return;
    }

    try {
      const newCitaData = {
        fecha: newCitaForm.fecha,
        motivo: newCitaForm.motivo,
        tipo: newCitaForm.tipo,
        estado: 'programada', // ¡CAMBIO CLAVE! Aprobada automáticamente cuando es creada por el veterinario
        id_veterinario: veterinarioProfile.id_veterinario, // Asignar al
        // veterinario actual
        id_cliente: isRegisteredClientSelected ?
          parseInt(newCitaForm.id_cliente) : null,
        id_mascota: isRegisteredClientSelected ?
          parseInt(newCitaForm.id_mascota) : null,
        nombre_cliente_invitado: isGuestAppointment ?
          newCitaForm.nombre_cliente_invitado : null,
        nombre_mascota_invitada: isGuestAppointment ?
          newCitaForm.nombre_mascota_invitada : null,
      };

      const { error: insertError } = await supabase
        .from('citas')
        .insert([newCitaData]);
      if (insertError) {
        throw new Error(`Error de Supabase al insertar la cita: ${insertError.message}`);
      }
      setSuccessMessage('¡Cita añadida correctamente y asignada a ti!');
      setNewCitaForm(initialNewCitaFormState); // Reiniciar formulario
      setFilteredMascotasForForm([]); // Limpiar mascotas filtradas
      setShowAddCitaModal(false); // Cerrar modal
      loadAllAppointmentData(); // Recargar datos manualmente después de la
      // inserción
    } catch (err: any) {
      console.error('Error al añadir nueva cita:', err.message);
      setError(`No se pudo añadir la cita: ${err.message}`);
    } finally {
      setIsSubmittingNewCita(false);
    }
  };

  // Handler para click en la fila para ver detalles
  const handleRowClick = (cita: CitaVeterinarioDetalle) => {
    setSelectedCitaForDetails(cita);
    setShowCitaDetailsModal(true);
  };

  // --- Renderizado del Componente ---
  if (authLoading || loadingContent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white font-inter">
        <Loader2 className="animate-spin h-8 w-8 text-green-400" />
        <p className="ml-3 text-lg">Cargando gestión de citas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 text-white min-h-screen font-inter">
        <div className="bg-red-800 p-4 rounded-md text-red-100 mb-4 flex
          items-center">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <div>
            <p className="font-bold">Error:</p>
            <p>{error}</p>
            <p className="text-sm mt-2">Por favor, verifica tu conexión y
              las políticas de RLS en Supabase. Asegúrate de que el veterinario tenga
              permisos para leer clientes, mascotas y citas, y para ACTUALIZAR/INSERTAR el
              estado/asignación de citas.</p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition shadow-md mt-4"
        >
          Reintentar Carga
        </button>
      </div>
    );
  }

  return (
    // CONTENEDOR PRINCIPAL: Ajustado para padding vertical y fondo
    <div className="bg-gray-900 text-white min-h-screen font-inter py-6">
      {/* NUEVO CONTENEDOR INTERNO: Para centrar y controlar el ancho máximo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-indigo-400 text-center mb-8 flex items-center justify-center gap-3">
          <CalendarCheck className="h-8 w-8" />
          Gestión de Citas
        </h2>

        {/* Mensajes de feedback */}
        {successMessage && (
          <div className="bg-green-700 p-4 rounded-md text-green-100 mb-4 flex
            items-center justify-between shadow-md">
            <div className="flex items-center">
              <Check className="h-6 w-6 mr-3" />
              <p className="font-semibold">{successMessage}</p>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-green-100 hover:text-white">
              <XCircle size={20} />
            </button>
          </div>
        )}
        {/* El mensaje de error se maneja en el bloque de error principal en
        la parte superior, pero también se podría añadir uno local */}
        {/* Controles de Filtrado y Búsqueda */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8 border
          border-gray-700 w-full"> {/* Asegurado w-full */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4
            mb-4">
            {/* Búsqueda por término */}
            <div>
              <label htmlFor="search" className="block text-gray-300 text-sm
                font-medium mb-1">Buscar (Mascota/Cliente/Motivo)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-indigo-500
                    focus:border-indigo-500"
                  placeholder="Buscar citas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            {/* Filtro por Estado */}
            <div>
              <label htmlFor="statusFilter" className="block text-gray-300
                text-sm font-medium mb-1">Filtrar por Estado</label>
              <select
                id="statusFilter"
                className="w-full p-2.5 bg-gray-700 border border-gray-600
                  rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="todas">Todas</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobada">Aprobada (Cliente)</option>
                <option value="programada">Programada (Veterinario)</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            {/* Filtro por Tipo */}
            <div>
              <label htmlFor="typeFilter" className="block text-gray-300 text-sm font-medium mb-1">Filtrar por Tipo</label>
              <select
                id="typeFilter"
                className="w-full p-2.5 bg-gray-700 border border-gray-600
                  rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="chequeo">Chequeo</option>
                <option value="vacunacion">Vacunación</option>
                <option value="grooming">Grooming</option>
                <option value="emergencia">Emergencia</option>
                <option value="cirugia">Cirugía</option>
                <option value="revision-consulta">Revisión/Consulta</option>
                {/* Añade más tipos si es necesario */}
              </select>
            </div>
            {/* Filtro por Fecha */}
            <div>
              <label htmlFor="dateFilter" className="block text-gray-300 text-sm font-medium mb-1">Filtrar por Fecha</label>
              <input
                type="date"
                id="dateFilter"
                className="w-full p-2.5 bg-gray-700 border border-gray-600
                  rounded-md text-white placeholder-gray-400 focus:ring-indigo-500
                  focus:border-indigo-500"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        {/* Botón para añadir nueva cita */}
        <div className="mb-6 text-right">
          <button
            onClick={() => setShowAddCitaModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition shadow-md flex items-center justify-center ml-auto"
            title="Añadir Nueva Cita"
          >
            <PlusCircle size={20} className="mr-2" /> Añadir Nueva Cita
          </button>
        </div>
        {/* Tabla de Citas */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 w-full">
          <div className="mb-4 text-right">
            <button
              onClick={loadAllAppointmentData}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition shadow-md flex items-center justify-end ml-auto"
              disabled={loadingContent}
            >
              {loadingContent ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : (
                <RefreshCw className="mr-2" size={18} />
              )}
              Actualizar Tabla
            </button>
          </div>
          {filteredCitas.length === 0 ? (
            <div className="text-center text-gray-400 py-4">
              <p>No se encontraron citas que coincidan con los filtros
                aplicados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs
                      font-medium text-gray-300 uppercase tracking-wider">Fecha & Hora</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs
                      font-medium text-gray-300 uppercase tracking-wider">Mascota</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs
                      font-medium text-gray-300 uppercase tracking-wider">Cliente</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs
                      font-medium text-gray-300 uppercase tracking-wider">Motivo & Tipo</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs
                      font-medium text-gray-300 uppercase tracking-wider">Estado</th>
                    <th scope="col" className="px-6 py-3 text-center text-xs
                      font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {filteredCitas.map((cita) => (
                    <tr key={cita.id_cita}
                        className="hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                        onClick={() => handleRowClick(cita)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {moment(cita.fecha).format('DD/MM/YYYY')}
                        </div>
                        <div className="text-xs text-gray-400">
                          {moment(cita.fecha).format('HH:mm [hrs]')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          <PawPrint size={14} className="inline-block mr-1
                            text-green-300" />
                          {cita.mascota_nombre || cita.nombre_mascota_invitada
                            || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-400">
                          ({cita.mascota_especie || 'Desconocida'})
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          <UserIcon size={14} className="inline-block mr-1
                            text-blue-300" />
                          {cita.cliente_nombre || cita.nombre_cliente_invitado
                            || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {cita.cliente_telefono || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {cita.motivo}
                        </div>
                        <div className="text-xs text-gray-400">
                          ({cita.tipo || 'General'})
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5
                          font-semibold rounded-full
                          ${cita.estado.toLowerCase() === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${cita.estado.toLowerCase() === 'aprobada' ? 'bg-green-100 text-green-800' : ''}
                          ${cita.estado.toLowerCase() === 'programada' ? 'bg-purple-100 text-purple-800' : ''}
                          ${cita.estado.toLowerCase() === 'realizada' ? 'bg-blue-100 text-blue-800' : ''}
                          ${cita.estado.toLowerCase() === 'cancelada' ? 'bg-red-100 text-red-800' : ''}
                          `}>
                          {cita.estado}
                        </span>
                        {/* Indicador de que esta cita le pertenece al
                        veterinario logueado */}
                        {cita.id_veterinario ===
                          veterinarioProfile?.id_veterinario && (
                            <div className="text-xs text-green-400 mt-1">
                              (Tu cita)
                            </div>
                          )}
                        {cita.id_veterinario !== null && cita.id_veterinario
                          !== veterinarioProfile?.id_veterinario && (
                            <div className="text-xs text-red-400 mt-1">
                              (Asignada a otro vet)
                            </div>
                          )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center
                        text-sm font-medium">
                        <div className="flex justify-center space-x-2">
                          {/* Botón para Asignarse Cita (si está pendiente y
                          no asignada) */}
                          {cita.id_veterinario === null &&
                            cita.estado.toLowerCase() === 'pendiente' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenConfirmation(cita, 'asignar'); }}
                                className="p-2 rounded-full bg-green-600 text-white hover:bg-green-700 transition shadow-md"
                                title="Asignarme Cita"
                              >
                                <CalendarPlus size={18} />
                              </button>
                            )}
                          {/* Botones para Citas Asignadas al Veterinario
                          Logueado y en estado 'Programada' */}
                          {cita.id_veterinario ===
                            veterinarioProfile?.id_veterinario &&
                            cita.estado.toLowerCase() === 'programada' && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleOpenConfirmation(cita, 'completar'); }}
                                  className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition shadow-md"
                                  title="Marcar como Realizada"
                                >
                                  <Check size={18} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleOpenConfirmation(cita, 'cancelar'); }}
                                  className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition shadow-md"
                                  title="Cancelar Cita"
                                >
                                  <XCircle size={18} />
                                </button>
                                {/* Botón de Editar Cita (se puede habilitar y
                                añadir la lógica más adelante) */}
                                {/* <button
                                  onClick={() => console.log('Editar cita',
                                    cita.id_cita)}
                                  className="p-2 rounded-full bg-indigo-600
                                    text-white hover:bg-indigo-700 transition shadow-md"
                                  title="Editar Cita"
                                >
                                  <Edit size={18} />
                                </button> */}
                              </>
                            )}
                          {/* Botón para Revertir Cita (si está cancelada) */}
                          {cita.estado.toLowerCase() === 'cancelada' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenConfirmation(cita, 'revertir'); }}
                              className="p-2 rounded-full bg-orange-600 text-white hover:bg-orange-700 transition shadow-md"
                              title="Revertir Cita"
                            >
                              <HistoryIcon size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div> {/* Fin del nuevo contenedor interno */}
      {/* Modal de Confirmación */}
      <ConfirmationModal
        isOpen={showConfirmation}
        title={
          confirmationAction === 'asignar' ? 'Confirmar Asignación de Cita'
            :
            confirmationAction === 'completar' ? 'Confirmar Cita Realizada' :
              confirmationAction === 'cancelar' ? 'Confirmar Cancelación de Cita' :
                confirmationAction === 'revertir' ? 'Confirmar Revertir Cita' : ''
        }
        message={
          confirmationAction === 'asignar'
            ? `¿Estás seguro de que quieres asignarte la cita para ${citaToActon?.mascota_nombre || citaToActon?.nombre_mascota_invitada || 'la mascota'} (${citaToActon?.mascota_especie || 'N/A'}) el ${citaToActon?.fecha
              ? moment(citaToActon.fecha).format('DD/MM/YYYY HH:mm') : ''}?`
            : confirmationAction === 'completar'
              ? `¿Estás seguro de que quieres marcar la cita para ${citaToActon?.mascota_nombre || citaToActon?.nombre_mascota_invitada || 'la mascota'} como REALIZADA? Esta acción no se puede deshacer.`
              : confirmationAction === 'cancelar'
                ? `¿Estás seguro de que quieres CANCELAR la cita para ${citaToActon?.mascota_nombre || citaToActon?.nombre_mascota_invitada || 'la mascota'}? Esta acción no se puede deshacer.`
                : confirmationAction === 'revertir'
                  ? `¿Estás seguro de que quieres REVERTIR la cancelación de la cita para ${citaToActon?.mascota_nombre || citaToActon?.nombre_mascota_invitada || 'la mascota'}?`
                  : ''
        }
        onConfirm={confirmAction}
        onCancel={() => {
          setShowConfirmation(false);
          setCitaToActon(null);
          setConfirmationAction(null);
        }}
        confirmButtonText={
          confirmationAction === 'asignar' ? 'Sí, Asignar' :
            confirmationAction === 'completar' ? 'Sí, Realizada' :
              confirmationAction === 'cancelar' ? 'Sí, Cancelar' :
                confirmationAction === 'revertir' ? 'Sí, Revertir' : ''
        }
        cancelButtonText="No, Mantener"
      />
      {/* Modal de Añadir Nueva Cita */}
      {showAddCitaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 font-inter">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-2xl w-full border border-gray-700 relative">
            <button
              onClick={() => {
                setShowAddCitaModal(false);
                setNewCitaForm(initialNewCitaFormState); // Reiniciar
                // formulario al cerrar
                setFilteredMascotasForForm([]); // Limpiar mascotas
                // filtradas
                setError(null); // Limpiar errores locales
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              title="Cerrar"
            >
              <XCircle size={24} />
            </button>
            <h3 className="text-2xl font-bold text-blue-400 mb-6 text-center">Añadir Nueva Cita</h3>
            {error && ( // Mostrar error local dentro del modal
              <div className="bg-red-800 p-3 rounded-md text-red-100 mb-4
                flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <p>{error}</p>
              </div>
            )}
            <form onSubmit={handleAddNewCita} className="space-y-4">
              {/* Selección de Cliente y Mascota */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="id_cliente" className="block text-gray-300
                    text-sm font-medium mb-1">Cliente Registrado (Opcional)</label>
                  <select
                    id="id_cliente"
                    name="id_cliente"
                    value={newCitaForm.id_cliente}
                    onChange={handleNewCitaFormChange}
                    className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecciona un cliente</option>
                    {allClients.map(client => (
                      <option key={client.id_cliente}
                        value={client.id_cliente}>
                        {client.nombre} ({client.email || client.telefono})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Déjalo en blanco
                    para un cliente invitado.</p>
                </div>
                <div>
                  <label htmlFor="id_mascota" className="block text-gray-300
                    text-sm font-medium mb-1">Mascota Registrada (Opcional)</label>
                  <select
                    id="id_mascota"
                    name="id_mascota"
                    value={newCitaForm.id_mascota}
                    onChange={handleNewCitaFormChange}
                    className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                    disabled={!newCitaForm.id_cliente} // Deshabilitar si no
                  // hay cliente seleccionado
                  >
                    <option value="">Selecciona una mascota</option>
                    {filteredMascotasForForm.map(pet => (
                      <option key={pet.id_mascota} value={pet.id_mascota}>
                        {pet.nombre} ({pet.especie || 'Desconocida'})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Selecciona
                    después de elegir un cliente.</p>
                </div>
              </div>
              <div className="text-center text-gray-400 my-2">-- O --</div>
              {/* Nombres de Cliente y Mascota Invitados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nombre_cliente_invitado" className="block
                    text-gray-300 text-sm font-medium mb-1">Nombre Cliente Invitado
                    (Opcional)</label>
                  <input
                    type="text"
                    id="nombre_cliente_invitado"
                    name="nombre_cliente_invitado"
                    value={newCitaForm.nombre_cliente_invitado}
                    onChange={handleNewCitaFormChange}
                    className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-blue-500
                      focus:border-blue-500"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div>
                  <label htmlFor="nombre_mascota_invitada" className="block
                    text-gray-300 text-sm font-medium mb-1">Nombre Mascota Invitada
                    (Opcional)</label>
                  <input
                    type="text"
                    id="nombre_mascota_invitada"
                    name="nombre_mascota_invitada"
                    value={newCitaForm.nombre_mascota_invitada}
                    onChange={handleNewCitaFormChange}
                    className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500
                      focus:border-blue-500"
                    placeholder="Ej: Buddy"
                  />
                </div>
              </div>
              {/* Detalles de la Cita */}
              <div>
                <label htmlFor="fecha" className="block text-gray-300 text-sm font-medium mb-1">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  id="fecha"
                  name="fecha"
                  value={newCitaForm.fecha}
                  onChange={handleNewCitaFormChange}
                  className="w-full p-2.5 bg-gray-700 border border-gray-600
                    rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="motivo" className="block text-gray-300 text-sm font-medium mb-1">Motivo de la Cita</label>
                <textarea
                  id="motivo"
                  name="motivo"
                  value={newCitaForm.motivo}
                  onChange={handleNewCitaFormChange}
                  rows={3}
                  className="w-full p-2.5 bg-gray-700 border border-gray-600
                    rounded-md text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe el motivo de la cita"
                  required
                ></textarea>
              </div>
              <div>
                <label htmlFor="tipo" className="block text-gray-300 text-sm
                  font-medium mb-1">Tipo de Cita</label>
                <select
                  id="tipo"
                  name="tipo"
                  value={newCitaForm.tipo}
                  onChange={handleNewCitaFormChange}
                  className="w-full p-2.5 bg-gray-700 border border-gray-600
                    rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Selecciona un tipo</option>
                  <option value="chequeo">Chequeo</option>
                  <option value="vacunacion">Vacunación</option>
                  <option value="grooming">Grooming</option>
                  <option value="emergencia">Emergencia</option>
                  <option value="cirugia">Cirugía</option>
                  <option value="revision-consulta">Revisión/Consulta</option>
                  {/* Añade más tipos si es necesario */}
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCitaModal(false);
                    setNewCitaForm(initialNewCitaFormState);
                    setFilteredMascotasForForm([]);
                    setError(null);
                  }}
                  className="px-5 py-2 bg-gray-600 text-white rounded-md
                    hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-md
                    hover:bg-blue-700 transition flex items-center justify-center"
                  disabled={isSubmittingNewCita}
                >
                  {isSubmittingNewCita ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2" size={20} /> Añadir Cita
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renderizar CitaDetailModal */}
      <CitaDetailModal
        isOpen={showCitaDetailsModal}
        cita={selectedCitaForDetails}
        onClose={() => setShowCitaDetailsModal(false)}
        allVeterinarios={allVeterinarios}
      />
    </div>
  );
};
export default VeterinarioCitas;
