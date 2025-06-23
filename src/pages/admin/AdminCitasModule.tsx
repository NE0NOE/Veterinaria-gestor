import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient'; // Asegúrate de que esta ruta sea correcta

// Importación de iconos de Lucide React para mejorar la UI
import {
  Pencil, Trash2, CheckCircle2, XCircle, FileText, // Para acciones
  Calendar, Clock, User, PawPrint, MessageSquare, Tag, // Para headers/info
  List, PlusCircle, LayoutDashboard, Eye, ThumbsUp, ThumbsDown, // Iconos para aprobar/rechazar
  AlertCircle, Info, History // Icono Info para detalles, History para revertir
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import moment from 'moment'; // Asegúrate de tener moment instalado: npm install moment

// CONFIGURACIÓN DE DURACIÓN DE SERVICIOS Y DISPONIBILIDAD
const APPOINTMENT_DURATIONS_MINUTES: { [key: string]: number } = {
  'Grooming': 180, // 3 horas para Grooming
  'Revision-Consulta': 60, // 1 hora para Revisión/Consulta
  'chequeo': 45,
  'vacunacion': 30,
  'emergencia': 90,
  'cirugia': 240,
  // Asegúrate de que todos los tipos de servicio usados estén aquí
};

const CLINIC_CLOSING_TIME = '17:00';

// FIN DE CONFIGURACIÓN

// Definiciones de tipos para alinear con tu esquema de DB

type Cita = {
  id_cita: number;
  id_cliente: number | null;
  id_mascota: number | null;
  id_veterinario: number | null;
  fecha: string; // TIMESTAMP WITHOUT TIME ZONE (ej. '2025-06-13 16:00:00')
  motivo: string;
  estado: string; // 'pendiente', 'programada', 'confirmada', 'cancelada', 'realizada', 'rechazada'
  tipo: string;
  created_at?: string;
  nombre_cliente_invitado?: string | null;
  nombre_mascota_invitada?: string | null;
};

type CitaPublica = {
  id_cita: number;
  nombre: string; // nombre del cliente invitado
  email: string | null;
  telefono: string;
  fecha: string;
  motivo: string;
  estado: string; // 'pendiente', 'confirmada', 'cancelada'
  nombre_mascota: string;
  recordatorio: boolean;
  creada_en?: string;
  id_cita_final?: number | null; // El ID de la cita en la tabla 'citas' si fue confirmada
};

type Cliente = {
  id_cliente: number;
  nombre: string;
};

type Mascota = {
  id_mascota: number;
  nombre: string;
  id_cliente: number;
};

type Veterinario = {
  id_veterinario: number;
  nombre: string;
  especialidad?: string;
};

// Componente Modal para mostrar detalles de la cita (para citas internas)
interface CitaDetailModalProps {
  isOpen: boolean;
  cita: Cita | null;
  onClose: () => void;
  clientes: Cliente[];
  mascotas: Mascota[];
  veterinarios: Veterinario[];
}

const CitaDetailModal: React.FC<CitaDetailModalProps> = ({ isOpen, cita, onClose, clientes, mascotas, veterinarios }) => {
  if (!isOpen || !cita) return null;

  const cliente = cita.id_cliente ? clientes.find(c => c.id_cliente === cita.id_cliente) : null;
  const mascota = cita.id_mascota ? mascotas.find(m => m.id_mascota === cita.id_mascota) : null;
  const assignedVet = cita.id_veterinario ? veterinarios.find(v => v.id_veterinario === cita.id_veterinario) : null;

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
          <Info size={24} /> Detalles de Cita Interna
        </h3>

        <div className="space-y-3 text-gray-200">
          <p><strong>Fecha y Hora:</strong> {moment(cita.fecha).format('DD/MM/YYYY HH:mm [hrs]')}</p>
          <p><strong>Motivo:</strong> {cita.motivo}</p>
          <p><strong>Tipo:</strong> {cita.tipo}</p>
          <p><strong>Estado:</strong> <span className={`px-2 py-1 rounded-full text-xs font-semibold
            ${cita.estado.toLowerCase() === 'pendiente' ? 'bg-yellow-600 text-yellow-50' : ''}
            ${cita.estado.toLowerCase() === 'programada' ? 'bg-blue-600 text-blue-100' : ''}
            ${cita.estado.toLowerCase() === 'confirmada' ? 'bg-indigo-600 text-indigo-100' : ''}
            ${cita.estado.toLowerCase() === 'realizada' ? 'bg-green-600 text-green-100' : ''}
            ${cita.estado.toLowerCase() === 'cancelada' || cita.estado.toLowerCase() === 'rechazada' ? 'bg-red-600 text-red-100' : ''}
            `}>{cita.estado}</span></p>
          <p><strong>Cliente:</strong> {cliente?.nombre || cita.nombre_cliente_invitado || 'N/A'}</p>
          <p><strong>Mascota:</strong> {mascota?.nombre || cita.nombre_mascota_invitada || 'N/A'}</p>
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


const AdminCitasModule: React.FC = () => {

  const [citas, setCitas] = useState<Cita[]>([]);
  const [citasPublicas, setCitasPublicas] = useState<CitaPublica[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [veterinarios, setVeterinarios] = useState<Veterinario[]>([]);

  // Estados para el modal de confirmación de cita pública (reutilizado para detalles de cita pública)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [citaToConfirm, setCitaToConfirm] = useState<CitaPublica | null>(null);

  const [selectedClienteId, setSelectedClienteId] = useState<number>(0);
  const [selectedMascotaId, setSelectedMascotaId] = useState<number>(0);
  const [selectedVeterinarioId, setSelectedVeterinarioId] = useState<number>(0);

  // Estados para mensajes de feedback (errores/éxito)
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  // Estados para añadir/editar citas internas (directamente por el admin)
  const [modoEdicionCitasInternas, setModoEdicionCitasInternas] =
    useState<Cita | null>(null);
  const [formCitasInternas, setFormCitasInternas] = useState<Omit<Cita, 'id_cita' | 'created_at'>>({
    motivo: '',
    fecha: '',
    estado: 'programada', // Por defecto 'programada' al crear directamente por admin
    tipo: '',
    id_cliente: null,
    id_mascota: null,
    id_veterinario: null,
    nombre_cliente_invitado: '',
    nombre_mascota_invitada: '',
  });

  // NUEVOS ESTADOS para el modal de visualización de detalles de cita INTERNA
  const [selectedInternalCitaForDetails, setSelectedInternalCitaForDetails] = useState<Cita | null>(null);
  const [showInternalCitaDetailsModal, setShowInternalCitaDetailsModal] = useState(false);


  // Función para cargar todos los datos necesarios
  const fetchData = useCallback(async () => {
    setModalError(null);
    setModalMessage(null);

    try {
      const { data: citasData, error: citasError } = await supabase
        .from('citas')
        .select('*')
        .order('fecha', { ascending: true });
      if (citasError) throw citasError;
      setCitas(citasData);

      const { data: citasPublicasData, error: citasPublicasError } = await supabase
        .from('citas_publicas')
        .select('*')
        .order('fecha', { ascending: true });
      if (citasPublicasError) throw citasPublicasError;
      setCitasPublicas(citasPublicasData);

      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('id_cliente, nombre');
      if (clientesError) throw clientesError;
      setClientes(clientesData);

      const { data: mascotasData, error: mascotasError } = await supabase
        .from('mascotas')
        .select('id_mascota, nombre, id_cliente');
      if (mascotasError) throw mascotasError;
      setMascotas(mascotasData);

      const { data: veterinariosData, error: veterinariosError } = await supabase
        .from('veterinarios')
        .select('id_veterinario, nombre, especialidad'); // Asegura que especialidad se seleccione
      if (veterinariosError) throw veterinariosError;
      setVeterinarios(veterinariosData);

    } catch (error: any) {
      console.error('Error al obtener datos:', error.message);
      setModalError('Error al cargar la información: ' + error.message);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Suscripción en tiempo real para ambas tablas
    const citasSubscription = supabase
      .channel('public:citas_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, (payload) => {
        console.log('Realtime change for citas received:', payload);
        fetchData();
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') console.log('Subscribed to citas changes.');
        if (status === 'CHANNEL_ERROR') console.error('Realtime subscription error for citas:', err);
      });

    const citasPublicasSubscription = supabase
      .channel('public:citas_publicas_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas_publicas' }, (payload) => {
        console.log('Realtime change for citas_publicas received:', payload);
        fetchData();
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') console.log('Subscribed to citas_publicas changes.');
        if (status === 'CHANNEL_ERROR') console.error('Realtime subscription error for citas_publicas:', err);
      });

    return () => {
      console.log('Unsubscribed from both channels.');
      supabase.removeChannel(citasSubscription);
      supabase.removeChannel(citasPublicasSubscription);
    };

  }, [fetchData]);

  //--- Lógica de Manejo de Disponibilidad de Recursos

  const getBookedTimeRangesForVeterinarian = useCallback(async (
    veterinarioId: number,
    date: string
  ): Promise<Array<{ start: Date; end: Date; citaId: number | null }>> => {
    const queryStartOfDay = `${date} 00:00:00`;
    const queryEndOfDay = `${date} 23:59:59`;

    const { data: citasData, error: citasError } = await supabase
      .from('citas')
      .select('id_cita, fecha, tipo, estado')
      .eq('id_veterinario', veterinarioId)
      .gte('fecha', queryStartOfDay)
      .lte('fecha', queryEndOfDay)
      .or('estado.eq.programada, estado.eq.confirmada'); // Solo citas que bloquean disponibilidad

    if (citasError) {
      console.error('Error al obtener citas del veterinario para disponibilidad:', citasError);
      return [];
    }

    const bookedRanges: Array<{ start: Date; end: Date; citaId: number | null }> = [];
    citasData.forEach(cita => {
      const startTime = new Date(cita.fecha);
      const duration = APPOINTMENT_DURATIONS_MINUTES[cita.tipo];

      if (duration) {
        const endTime = new Date(startTime);
        endTime.setMinutes(startTime.getMinutes() + duration);
        bookedRanges.push({ start: startTime, end: endTime, citaId: cita.id_cita });
      } else {
        console.warn(`Tipo de servicio desconocido: ${cita.tipo} para cita ID ${cita.id_cita}. No se calculó duración.`);
      }
    });

    return bookedRanges;
  }, []);

  const checkAvailabilityForVeterinarian = useCallback(async (
    veterinarioId: number | null,
    datePart: string,
    timePart: string,
    serviceType: string, // Ajustado a string ya que APPOINTMENT_DURATIONS_MINUTES es { [key: string]: number }
    excludeCitaId?: number
  ): Promise<boolean> => {
    setModalError(null);

    if (veterinarioId === null || veterinarioId === 0) {
      setModalError("Por favor, selecciona un veterinario válido para verificar la disponibilidad.");
      return false;
    }

    const duration = APPOINTMENT_DURATIONS_MINUTES[serviceType];

    if (!duration) {
      setModalError(`Tipo de servicio desconocido: "${serviceType}". No se puede verificar la duración.`);
      return false;
    }

    const requestedDateTimeString = `${datePart}T${timePart}:00`;
    const requestedStartTime = new Date(requestedDateTimeString);
    const requestedEndTime = new Date(requestedStartTime);
    requestedEndTime.setMinutes(requestedStartTime.getMinutes() + duration);

    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);

    if (requestedStartTime.getTime() < now.getTime()) {
      setModalError('No se pueden programar citas en el pasado.');
      return false;
    }

    const [clinicClosingHour, clinicClosingMinute] =
      CLINIC_CLOSING_TIME.split(':').map(Number);
    const clinicClosingTimeDate = new Date(requestedStartTime);
    clinicClosingTimeDate.setHours(clinicClosingHour, clinicClosingMinute, 0, 0);

    if (requestedEndTime.getTime() > clinicClosingTimeDate.getTime()) {
      setModalError(`La cita de "${serviceType}" excede el horario de cierre de la clínica (${CLINIC_CLOSING_TIME}). Por favor, elige una hora anterior.`);
      return false;
    }

    const bookedTimeRanges = await getBookedTimeRangesForVeterinarian(veterinarioId, datePart);

    const filteredBookedRanges = bookedTimeRanges.filter(range =>
      range.citaId !== excludeCitaId
    );

    for (const existingCitaRange of filteredBookedRanges) {
      if (
        requestedStartTime.getTime() < existingCitaRange.end.getTime() &&
        requestedEndTime.getTime() > existingCitaRange.start.getTime()
      ) {
        // Formatear las horas aquí para la cadena de error
        const existingStartTimeFormatted = moment(existingCitaRange.start).format('HH:mm');
        const existingEndTimeFormatted = moment(existingCitaRange.end).format('HH:mm');

        setModalError(
          `Solapamiento: El veterinario seleccionado no está disponible de ` +
          `${existingStartTimeFormatted} a ` +
          `${existingEndTimeFormatted} debido a otra cita (ID: ` +
          `${existingCitaRange.citaId || 'desconocido'}). Por favor, selecciona una hora o veterinario diferente.`
        );
        return false;
      }
    }

    return true;
  }, [getBookedTimeRangesForVeterinarian]);

  //--- Handlers para Citas Internas (Gestión directa por el Admin)
  const handleInternalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormCitasInternas((prev) => ({
      ...prev,
      [name]: ['id_cliente', 'id_mascota', 'id_veterinario'].includes(name)
        ? (value === '' || value === '0' ? null : Number(value))
        : value,
    }));
  };

  const handleEditInternal = (cita: Cita) => {
    setModoEdicionCitasInternas(cita);
    setFormCitasInternas({
      motivo: cita.motivo,
      fecha: cita.fecha.slice(0, 16),
      estado: cita.estado,
      tipo: cita.tipo,
      id_cliente: cita.id_cliente,
      id_mascota: cita.id_mascota,
      id_veterinario: cita.id_veterinario,
      nombre_cliente_invitado: cita.nombre_cliente_invitado || '',
      nombre_mascota_invitada: cita.nombre_mascota_invitada || '',
    });
    setModalError(null);
    setModalMessage(null);
  };

  const handleDeleteInternal = async (id_cita: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta cita interna? Esta acción es irreversible.')) return;

    setModalError(null);
    setModalMessage(null);

    try {
      const { error } = await supabase.from('citas').delete().eq('id_cita', id_cita);
      if (error) throw error;
      setModalMessage('Cita eliminada correctamente.');
      fetchData();
    } catch (error: any) {
      setModalError('Error al eliminar la cita: ' + error.message);
      console.error('Error deleting internal appointment:', error);
    }
  };

  const handleSubmitInternal = async (e: React.FormEvent) => {
    e.preventDefault();

    setModalError(null);
    setModalMessage(null);

    const { motivo, fecha, tipo, id_cliente, id_mascota, id_veterinario,
      nombre_cliente_invitado, nombre_mascota_invitada } = formCitasInternas;

    if (id_veterinario === null || id_veterinario === 0 || !fecha || !motivo || !tipo) {
      setModalError('Por favor, completa los campos obligatorios: Veterinario, Fecha y Hora, Motivo, Tipo de Servicio.');
      return;
    }

    if (id_cliente === null && (!nombre_cliente_invitado || !nombre_mascota_invitada)) {
      setModalError('Si no seleccionas un cliente registrado, los campos "Nombre de Cliente (Invitado)" y "Nombre de Mascota (Invitada)" son obligatorios.');
      return;
    }

    if (id_cliente !== null && (id_mascota === null || id_mascota === 0)) {
      setModalError('Por favor, selecciona una mascota registrada para el cliente seleccionado.');
      return;
    }

    const [datePart, timePart] = fecha.split('T');
    const shouldCheckAvailability =
      modoEdicionCitasInternas?.estado.toLowerCase() !== 'pendiente' &&
      id_veterinario !== null;

    if (shouldCheckAvailability) {
      const isAvailable = await checkAvailabilityForVeterinarian(
        id_veterinario,
        datePart,
        timePart,
        tipo, // Usar 'tipo' directamente ya que es un string
        modoEdicionCitasInternas?.id_cita
      );
      if (!isAvailable) {
        return;
      }
    }

    const newCitaData: Partial<Cita> = {
      motivo,
      fecha: new Date(fecha).toISOString(),
      estado: modoEdicionCitasInternas ? modoEdicionCitasInternas.estado : 'programada', // Mantiene estado en edición o 'programada' al crear
      tipo: tipo,
      id_veterinario: id_veterinario,
    };

    if (id_cliente !== null) {
      newCitaData.id_cliente = id_cliente;
      newCitaData.id_mascota = id_mascota;
      newCitaData.nombre_cliente_invitado = null;
      newCitaData.nombre_mascota_invitada = null;
    } else {
      newCitaData.id_cliente = null;
      newCitaData.id_mascota = null;
      newCitaData.nombre_cliente_invitado = nombre_cliente_invitado;
      newCitaData.nombre_mascota_invitada = nombre_mascota_invitada;
    }

    try {
      if (modoEdicionCitasInternas) {
        const { error } = await supabase.from('citas').update(newCitaData).eq('id_cita', modoEdicionCitasInternas.id_cita);
        if (error) throw error;
        setModalMessage('Cita actualizada correctamente.');
      } else {
        // Al agregar una nueva cita interna, si se asigna un veterinario y cliente/mascota, el estado será 'programada'.
        // Si solo se asigna cliente/mascota invitada y sin veterinario, el estado será 'pendiente'.
        // La solicitud indica que si el admin la crea, ya es 'programada' si tiene vet.
        const finalEstado = (id_veterinario !== null && id_veterinario !== 0) ? 'programada' : 'pendiente';
        const dataToInsert = { ...newCitaData, estado: finalEstado };

        const { error } = await supabase.from('citas').insert([dataToInsert]);
        if (error) throw error;
        setModalMessage('Cita agregada correctamente.');
      }

      // Resetear formulario y recargar datos después de guardar
      setFormCitasInternas({
        motivo: '', fecha: '', estado: 'programada', tipo: '',
        id_cliente: null, id_mascota: null, id_veterinario: null,
        nombre_cliente_invitado: '', nombre_mascota_invitada: '',
      });
      setModoEdicionCitasInternas(null);
      fetchData();
    } catch (error: any) {
      setModalError('Error al guardar la cita: ' + error.message);
      console.error('Error saving internal appointment:', error);
    }
  };

  const handleUpdateCitaStatus = async (id_cita: number, newStatus: string) => {
    // Usaremos ConfirmationModal para estas acciones ahora
    if (newStatus === 'realizada' && !window.confirm(`¿Estás seguro de que quieres marcar esta cita como "realizada"?`)) return;
    if (newStatus === 'cancelada' && !window.confirm(`¿Estás seguro de que quieres marcar esta cita como "cancelada"?`)) return;

    setModalError(null);
    setModalMessage(null);

    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado: newStatus })
        .eq('id_cita', id_cita);
      if (error) throw error;
      setModalMessage(`Cita marcada como "${newStatus}" correctamente.`);
      fetchData();
    } catch (error: any) {
      setModalError(`Error al actualizar el estado de la cita a "${newStatus}": ` + error.message);
      console.error('Error updating appointment status:', error);
    }
  };

  // NUEVA Función para Revertir Citas Internas
  const handleRevertInternalCita = async (cita: Cita) => {
    setModalError(null);
    setModalMessage(null);

    const isConfirmed = window.confirm(`¿Estás seguro de que quieres REVERTIR el estado de esta cita (ID: ${cita.id_cita})? Se restaurará a un estado activo.`);
    if (!isConfirmed) return;

    try {
      let newEstado: string;
      let newIdVeterinario: number | null = cita.id_veterinario; // Mantener el veterinario si ya estaba asignado

      if (cita.id_veterinario !== null && cita.id_veterinario !== 0) {
        newEstado = 'programada'; // Si tenía vet, vuelve a programada
      } else {
        newEstado = 'pendiente'; // Si no tenía vet, vuelve a pendiente
        newIdVeterinario = null; // Asegurar que sea null si no había vet
      }

      const { error } = await supabase
        .from('citas')
        .update({ estado: newEstado, id_veterinario: newIdVeterinario })
        .eq('id_cita', cita.id_cita);

      if (error) throw error;

      setModalMessage(`Cita revertida a "${newEstado}" correctamente.`);
      fetchData();
    } catch (error: any) {
      setModalError('Error al revertir la cita: ' + error.message);
      console.error('Error reverting internal appointment:', error);
    }
  };


  // Funciones para Aprobar/Rechazar citas en la tabla 'citas' que están 'Pendiente'
  const handleApproveInternalCita = async (cita: Cita) => {
    setModalError(null);
    setModalMessage(null);

    if (cita.id_veterinario === null || cita.id_veterinario === 0) {
      setModalError('No se puede aprobar. Esta cita pendiente no tiene un veterinario asignado. Por favor, edítala primero y asigna un veterinario.');
      return;
    }

    const [datePart, timePart] = cita.fecha.split('T');
    const isAvailable = await checkAvailabilityForVeterinarian(
      cita.id_veterinario,
      datePart,
      timePart,
      cita.tipo,
      cita.id_cita
    );
    if (!isAvailable) {
      return;
    }

    const isConfirmed = window.confirm('¿Estás seguro de que quieres APROBAR esta cita y asignarla? Se cambiará a "programada".');
    if (!isConfirmed) return;

    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado: 'programada' }) // CAMBIADO: 'confirmada' a 'programada'
        .eq('id_cita', cita.id_cita);
      if (error) throw error;
      setModalMessage('Cita aprobada y programada correctamente.');
      fetchData();
    } catch (error: any) {
      setModalError('Error al aprobar la cita: ' + error.message);
      console.error('Error approving internal appointment:', error);
    }
  };

  const handleRejectInternalCita = async (id_cita: number) => {
    if (!window.confirm('¿Estás seguro de que quieres RECHAZAR esta cita? Esta acción la marcará como "rechazada".')) return;
    setModalError(null);
    setModalMessage(null);
    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado: 'rechazada' })
        .eq('id_cita', id_cita);
      if (error) throw error;
      setModalMessage('Cita rechazada correctamente.');
      fetchData();
    } catch (error: any) {
      setModalError('Error al rechazar la cita: ' + error.message);
      console.error('Error rejecting internal appointment:', error);
    }
  };

  const handleViewClinicalHistory = (mascotaId: number) => {
    navigate(`../historial-clinico/${mascotaId}`);
  };

  //--- Handlers para Citas Públicas (Solicitudes de Clientes) ---
  const openConfirmModal = (cita: CitaPublica) => {
    setCitaToConfirm(cita);
    setSelectedClienteId(0);
    setSelectedMascotaId(0);
    setSelectedVeterinarioId(0);
    setModalError(null);
    setModalMessage(null);
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setCitaToConfirm(null);
    setModalError(null);
    setModalMessage(null);
  };

  const handleConfirmPublicAppointment = async () => {
    if (!citaToConfirm) {
      setModalError('No hay cita pública seleccionada para confirmar.');
      return;
    }
    setModalError(null);
    setModalMessage(null);

    if (selectedVeterinarioId === 0) {
      setModalError('Por favor, selecciona un veterinario para confirmar la cita.');
      return;
    }

    const [datePart, timePart] = citaToConfirm.fecha.split('T');
    const serviceType = citaToConfirm.motivo; // Usar motivo como tipo de servicio

    const isAvailable = await checkAvailabilityForVeterinarian(
      selectedVeterinarioId,
      datePart,
      timePart,
      serviceType
    );
    if (!isAvailable) {
      return;
    }

    try {
      let id_cliente_final: number | null = null;
      let id_mascota_final: number | null = null;
      let nombre_cliente_invitado_final: string | null = null;
      let nombre_mascota_invitada_final: string | null = null;

      if (selectedClienteId !== 0 && selectedMascotaId !== 0) {
        id_cliente_final = selectedClienteId;
        id_mascota_final = selectedMascotaId;
      } else {
        nombre_cliente_invitado_final = citaToConfirm.nombre;
        nombre_mascota_invitada_final = citaToConfirm.nombre_mascota;
      }

      const newCitaData: Partial<Cita> = {
        id_cliente: id_cliente_final,
        id_mascota: id_mascota_final,
        id_veterinario: selectedVeterinarioId,
        fecha: new Date(citaToConfirm.fecha).toISOString(),
        motivo: citaToConfirm.motivo,
        estado: 'programada', // CAMBIADO: 'confirmada' a 'programada'
        tipo: serviceType,
        nombre_cliente_invitado: nombre_cliente_invitado_final,
        nombre_mascota_invitada: nombre_mascota_invitada_final,
      };

      const { data: newCita, error: insertCitaError } = await
        supabase.from('citas').insert([newCitaData]).select('id_cita');
      if (insertCitaError) throw insertCitaError;

      const confirmedCitaId = newCita ? newCita[0].id_cita : null;
      if (!confirmedCitaId) throw new Error("No se pudo obtener el ID de la cita confirmada.");

      const { error: updatePublicCitaError } = await supabase
        .from('citas_publicas')
        .update({ estado: 'confirmada', id_cita_final: confirmedCitaId })
        .eq('id_cita', citaToConfirm.id_cita);
      if (updatePublicCitaError) {
        await supabase.from('citas').delete().eq('id_cita',
          confirmedCitaId);
        throw new Error('Error al confirmar la cita. Se ha revertido la operación. ' + updatePublicCitaError.message);
      }

      setModalMessage('¡Cita confirmada y transferida exitosamente!');
      closeConfirmModal();
      fetchData();
    } catch (error: any) {
      console.error("Error en el proceso de confirmación:", error);
      setModalError(error.message || 'Ocurrió un error inesperado al confirmar la cita.');
    }
  };

  const handleCancelPublicAppointment = async (id_cita: number) => {
    if (!window.confirm('¿Estás seguro de que quieres cancelar esta solicitud de cita pública?')) return;
    setModalError(null);
    setModalMessage(null);
    try {
      const { error } = await supabase.from('citas_publicas').update({
        estado: 'cancelada'
      }).eq('id_cita', id_cita);
      if (error) throw error;
      setModalMessage('Solicitud de cita cancelada correctamente.');
      fetchData();
    } catch (error: any) {
      setModalError('Error al cancelar la solicitud: ' + error.message);
      console.error('Error canceling public appointment request:', error);
    }
  };

  const handleViewPublicCitaDetails = (cita: CitaPublica) => {
    // Reutilizamos el mismo modal de confirmación, ya que puede mostrar detalles y opciones de confirmación
    // Cuando el estado no es "pendiente", este modal actúa solo como visualizador de detalles.
    openConfirmModal(cita);
  };

  const getFilteredMascotas = (clientId: number | null) => {
    return clientId ? mascotas.filter(m => m.id_cliente === clientId) : [];
  };

  // Función para obtener el nombre del veterinario por ID
  const getVeterinarioName = (id: number | null) => {
    if (id === null || id === 0) return 'No Asignado';
    return veterinarios.find(v => v.id_veterinario === id)?.nombre || 'N/A';
  };

  // Handler para click en la fila de la tabla de citas internas para ver detalles
  const handleInternalRowClick = (cita: Cita) => {
    setSelectedInternalCitaForDetails(cita);
    setShowInternalCitaDetailsModal(true);
  };


  return (
    <div className="p-6 bg-gray-950 text-white min-h-screen font-inter">
      <h1 className="text-4xl font-extrabold text-blue-400 mb-8 text-center
        flex items-center justify-center gap-3">
        <LayoutDashboard size={36} /> Panel de Gestión de Citas
      </h1>
      {/* Mensajes de Errores/Éxito para el panel principal */}
      {modalError && (
        <div className="bg-red-800 text-red-100 p-4 rounded-lg text-center
          border border-red-600 mb-6 flex items-center justify-between shadow-md
          animate-fade-in">
          <AlertCircle size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">{modalError}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() =>
            setModalError(null)} />
        </div>
      )}
      {modalMessage && (
        <div className="bg-green-800 text-green-100 p-4 rounded-lg text-center
          border border-green-600 mb-6 flex items-center justify-between
          shadow-md animate-fade-in">
          <CheckCircle2 size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">{modalMessage}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() =>
            setModalMessage(null)} />
        </div>
      )}
      {/* Sección para Añadir/Editar Citas Internas */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-
        blue-800 mb-8">
        <h2 className="text-2xl font-bold text-blue-400 mb-5 flex items-
          center gap-2">
          <PlusCircle size={22} /> {modoEdicionCitasInternas ? 'Editar Cita Programada' : 'Programar Nueva Cita (Directa)'}
        </h2>
        <form onSubmit={handleSubmitInternal} className="grid grid-cols-1
          md:grid-cols-2 lg:grid-cols-3 gap-5 text-base">
          {/* Cliente Registrado y Mascota */}
          <div>
            <label className="block mb-1 text-gray-300">Cliente Registrado
              (Opcional)</label>
            <select
              name="id_cliente"
              value={formCitasInternas.id_cliente || 0}
              onChange={handleInternalChange}
              className="w-full p-2.5 bg-gray-700 border border-gray-600
                rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              <option value={0}>Selecciona Cliente</option>
              {clientes.map(c => (
                <option key={c.id_cliente}
                  value={c.id_cliente}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 text-gray-300">Mascota Registrada
              (Opcional)</label>
            <select
              name="id_mascota"
              value={formCitasInternas.id_mascota || 0}
              onChange={handleInternalChange}
              className="w-full p-2.5 bg-gray-700 border border-gray-600
                rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
              disabled={formCitasInternas.id_cliente === null ||
                formCitasInternas.id_cliente === 0}
            >
              <option value={0}>Selecciona Mascota</option>
              {getFilteredMascotas(formCitasInternas.id_cliente).map(m => (
                <option key={m.id_mascota}
                  value={m.id_mascota}>{m.nombre}</option>
              ))}
            </select>
          </div>
          {/* Campos para Cliente y Mascota Invitada (condicionales) */}
          {((formCitasInternas.id_cliente === null ||
            formCitasInternas.id_cliente === 0) && !modoEdicionCitasInternas) && (
              <>
                <div>
                  <label className="block mb-1 text-gray-300">Nombre de
                    Cliente (Invitado)</label>
                  <input
                    type="text"
                    name="nombre_cliente_invitado"
                    value={formCitasInternas.nombre_cliente_invitado || ''}
                    onChange={handleInternalChange}
                    className="w-full p-2.5 bg-gray-700 border border-gray-600
                      rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Nombre completo del cliente"
                    required={formCitasInternas.id_cliente === null ||
                      formCitasInternas.id_cliente === 0}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-gray-300">Nombre de
                    Mascota (Invitada)</label>
                  <input
                    type="text"
                    name="nombre_mascota_invitada"
                    value={formCitasInternas.nombre_mascota_invitada || ''}
                    onChange={handleInternalChange}
                    className="w-full p-2.5 bg-gray-700 border border-gray-600
                      rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Nombre de la mascota"
                    required={formCitasInternas.id_cliente === null ||
                      formCitasInternas.id_cliente === 0}
                  />
                </div>
              </>
            )}
          {/* Veterinario */}
          <div>
            <label className="block mb-1 text-gray-300">Veterinario
              Asignado</label>
            <select
              name="id_veterinario"
              value={formCitasInternas.id_veterinario || 0}
              onChange={handleInternalChange}
              className="w-full p-2.5 bg-gray-700 border border-gray-600
                rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
              required
            >
              <option value={0}>Selecciona Veterinario</option>
              {veterinarios.map(v => (
                <option key={v.id_veterinario}
                  value={v.id_veterinario}>{v.nombre} ({v.especialidad})</option>
              ))}
            </select>
          </div>
          {/* Fecha y Hora */}
          <div>
            <label className="block mb-1 text-gray-300">Fecha y Hora</label>
            <input
              type="datetime-local"
              name="fecha"
              value={formCitasInternas.fecha}
              onChange={handleInternalChange}
              className="w-full p-2.5 bg-gray-700 border border-gray-600
                rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
              required
            />
          </div>
          {/* Tipo de Servicio */}
          <div>
            <label className="block mb-1 text-gray-300">Tipo de
              Servicio</label>
            <select
              name="tipo"
              value={formCitasInternas.tipo}
              onChange={handleInternalChange}
              className="w-full p-2.5 bg-gray-700 border border-gray-600
                rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
              required
            >
              <option value="">Selecciona Tipo</option>
              {Object.keys(APPOINTMENT_DURATIONS_MINUTES).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          {/* Motivo (detalles) */}
          <div>
            <label className="block mb-1 text-gray-300">Motivo
              (detalles)</label>
            <input
              type="text"
              name="motivo"
              value={formCitasInternas.motivo}
              onChange={handleInternalChange}
              className="w-full p-2.5 bg-gray-700 border border-gray-600
                rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Ej: Corte de pelo, Vacunación anual"
              required
            />
          </div>
          <div className="col-span-1 md:col-span-2 lg:col-span-3 flex
            justify-end space-x-3 mt-4">
            {modoEdicionCitasInternas && (
              <button
                type="button"
                onClick={() => {
                  setModoEdicionCitasInternas(null);
                  setFormCitasInternas({
                    motivo: '', fecha: '', estado:
                      'programada', tipo: '', id_cliente: null, id_mascota: null, id_veterinario:
                      null, nombre_cliente_invitado: '', nombre_mascota_invitada: ''
                  });
                }}
                className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-
                  white rounded-lg font-semibold transition shadow-md"
              >
                Cancelar Edición
              </button>
            )}
            <button type="submit" className="px-6 py-2 bg-indigo-700
              hover:bg-indigo-600 text-white rounded-lg font-semibold transition shadow-
              md">
              {modoEdicionCitasInternas ? 'Actualizar Cita' : 'Programar Cita'} {/* <<<< CORREGIDO AQUÍ */}
            </button>
          </div>
        </form>
      </div>
      {/* Sección de Citas Programadas y Pendientes (Gestión Interna) */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-
        blue-800 mb-8">
        <h2 className="text-2xl font-bold text-blue-400 mb-5 flex items-
          center gap-2">
          <List size={22} /> Citas Programadas y Pendientes (Gestión Interna)
        </h2>
        {citas.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No hay citas
            programadas o pendientes.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-
            700">
            <table className="min-w-full table-auto divide-y divide-gray-700
              text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300 font-
                    semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><User size={14}
                    />Cliente</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-
                    semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><PawPrint
                      size={14} />Mascota</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-
                    semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-
                      1">Veterinario</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-
                    semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><Calendar
                      size={14} />Fecha y Hora</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-
                    semibold text-xs uppercase tracking-wider">Motivo</th>
                  <th className="px-4 py-3 text-left text-gray-300 font-
                    semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><Tag size={14}
                    />Tipo</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-
                    semibold text-xs uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-right text-gray-300 font-
                    semibold text-xs uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-700">
                {citas.map((c) => {
                  // Formatear la fecha/hora fuera del JSX
                  const formattedDateTime = moment(c.fecha).format('DD/MM/YYYY HH:mm');
                  return (
                    <tr key={c.id_cita}
                      className="hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => handleInternalRowClick(c)} // Click para ver detalles
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.id_cliente
                          ? clientes.find((x) => x.id_cliente ===
                            c.id_cliente)?.nombre || 'N/A'
                          : c.nombre_cliente_invitado || 'Cliente Invitado'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.id_mascota
                          ? mascotas.find((x) => x.id_mascota ===
                            c.id_mascota)?.nombre || 'N/A'
                          : c.nombre_mascota_invitada || 'Mascota Invitada'}
                      </td>
                      <td className="px-4 py-3 whitespace-
                        nowrap">{getVeterinarioName(c.id_veterinario)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formattedDateTime}</td>
                      <td className="px-4 py-3 whitespace-
                        nowrap">{c.motivo}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs
                          leading-5 font-semibold rounded-full
                          ${c.estado.toLowerCase() === 'pendiente' ? 'bg-yellow-600 text-yellow-50' :
                            c.estado === 'programada' ? 'bg-blue-600 text-blue-100' :
                              c.estado === 'confirmada' ? 'bg-indigo-600 text-indigo-100' :
                                c.estado === 'realizada' ? 'bg-green-600 text-green-100' :
                                  c.estado.toLowerCase() === 'cancelada' || c.estado.toLowerCase()
                                  === 'rechazada' ? 'bg-red-600 text-red-100' :
                                    'bg-gray-600 text-gray-200'
                          }`}>
                          {c.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right
                        space-x-2">
                        {/* Acciones para citas 'Pendiente' en tabla 'citas'
                        */}
                        {c.estado.toLowerCase() === 'pendiente' ? (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleApproveInternalCita(c); }}
                              className="text-green-400 hover:text-green-500
                                p-2 rounded-md transition-colors" title="Aprobar Cita">
                              <ThumbsUp size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleRejectInternalCita(c.id_cita); }}
                              className="text-red-400 hover:text-red-500 p-2
                                rounded-md transition-colors" title="Rechazar Cita">
                              <ThumbsDown size={16} />
                            </button>
                          </>
                        ) : (
                          // Acciones para citas ya
                          // programadas/confirmadas/realizadas/canceladas/rechazadas
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleEditInternal(c); }}
                              className="text-blue-400 hover:text-blue-500 p-2
                                rounded-md transition-colors" title="Editar Cita">
                              <Pencil size={16} />
                            </button>
                            {(c.estado === 'programada' || c.estado ===
                              'confirmada') ? (
                                <>
                                  <button onClick={(e) => { e.stopPropagation(); handleUpdateCitaStatus(c.id_cita, 'realizada'); }}
                                    className="text-green-400 hover:text-green-
                                      500 p-2 rounded-md transition-colors" title="Marcar como Realizada">
                                    <CheckCircle2 size={16} />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleUpdateCitaStatus(c.id_cita, 'cancelada'); }}
                                    className="text-red-400 hover:text-red-500
                                      p-2 rounded-md transition-colors" title="Cancelar Cita">
                                    <XCircle size={16} />
                                  </button>
                                </>
                              ) : null}

                            {/* NUEVO: Botón para Revertir Cita */}
                            {(c.estado.toLowerCase() === 'cancelada' || c.estado.toLowerCase() === 'rechazada') && (
                              <button onClick={(e) => { e.stopPropagation(); handleRevertInternalCita(c); }}
                                className="text-orange-400 hover:text-orange-500 p-2 rounded-md transition-colors"
                                title="Revertir Cita">
                                <History size={16} />
                              </button>
                            )}

                            {c.estado === 'realizada' && c.id_mascota !== null
                              && (
                                <button onClick={(e) => { e.stopPropagation(); handleViewClinicalHistory(c.id_mascota as number); }}
                                  className="text-indigo-400 hover:text-indigo-
                                    500 p-2 rounded-md transition-colors" title="Ver Historial Clínico">
                                  <FileText size={16} />
                                </button>
                              )}
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteInternal(c.id_cita); }}
                              className="text-red-400 hover:text-red-500 p-2
                                rounded-md transition-colors" title="Eliminar Cita">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Sección de Solicitudes de Citas Públicas (tabla 'citas_publicas' -
      pendientes) */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-
        blue-800">
        <h2 className="text-2xl font-bold text-blue-400 mb-5 flex items-
          center gap-2">
          <MessageSquare size={22} /> Solicitudes de Citas Públicas (Pendientes y Historial)
        </h2>
        {citasPublicas.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No hay solicitudes
            de citas públicas.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-
            700">
            <table className="min-w-full table-auto divide-y divide-gray-700
              text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300 font-
                    semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><User size={14}
                    />Solicitante</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-
                    semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><Clock
                      size={14} />Teléfono</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-
                    semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><PawPrint
                      size={14} />Mascota</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-
                    semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><Calendar
                      size={14} />Fecha Solicitada</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-
                    semibold text-xs uppercase tracking-wider">Motivo</th>
                  <th className="px-4 py-3 text-left text-gray-300 font-
                    semibold text-xs uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-right text-gray-300 font-
                    semibold text-xs uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-700">
                {citasPublicas.map((cita) => {
                  // Formatear la fecha/hora fuera del JSX
                  const formattedPublicDateTime = moment(cita.fecha).format('DD/MM/YYYY HH:mm');
                  return (
                    <tr key={cita.id_cita}
                      className={`hover:bg-gray-800 transition-colors ${cita.estado !== 'pendiente' ? 'opacity-70' : ''} cursor-pointer`}
                      onClick={() => handleViewPublicCitaDetails(cita)} // Click para ver detalles
                    >
                      <td className="px-4 py-3 whitespace-
                        nowrap">{cita.nombre} ({cita.email || 'Sin Email'})</td>
                      <td className="px-4 py-3 whitespace-
                        nowrap">{cita.telefono}</td>
                      <td className="px-4 py-3 whitespace-
                        nowrap">{cita.nombre_mascota}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formattedPublicDateTime}</td>
                      <td className="px-4 py-3 whitespace-
                        nowrap">{cita.motivo}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs
                          leading-5 font-semibold rounded-full
                          ${cita.estado === 'pendiente' ? 'bg-yellow-600 text-yellow-50' :
                            cita.estado === 'confirmada' ? 'bg-green-600 text-green-100' :
                              'bg-red-600 text-red-100'
                          }`}>
                          {cita.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right
                        space-x-2">
                        {cita.estado === 'pendiente' ? (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); openConfirmModal(cita); }}
                              className="text-green-400 hover:text-green-500
                                p-2 rounded-md transition-colors"
                              title="Confirmar Solicitud"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCancelPublicAppointment(cita.id_cita); }}
                              className="text-red-400 hover:text-red-500 p-2
                                rounded-md transition-colors"
                              title="Cancelar Solicitud"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleViewPublicCitaDetails(cita); }}
                            className="text-blue-400 hover:text-blue-500 p-2
                              rounded-md transition-colors"
                            title="Ver Detalles"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Modal de Confirmación de Cita Pública (y Visualización de
      Detalles) */}
      {showConfirmModal && citaToConfirm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-
          center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-
            w-md space-y-6 border border-blue-700 transform scale-100 animate-scale-in">
            <h3 className="text-2xl font-bold text-blue-400 text-center flex
              items-center justify-center gap-2">
              <CheckCircle2 size={24} />
              {citaToConfirm.estado === 'pendiente' ? 'Confirmar Cita Pública' : 'Detalles de Solicitud de Cita'}
            </h3>
            {/* Formatear la fecha/hora fuera del JSX */}
            {(() => {
              const formattedModalDateTime = moment(citaToConfirm.fecha).format('DD/MM/YYYY HH:mm');
              return (
                <p className="text-gray-300 text-center mb-4 text-sm">
                  Solicitud de: <span className="font-semibold text-
                    white">{citaToConfirm.nombre}</span> (Mascota: <span className="font-
                    semibold text-white">{citaToConfirm.nombre_mascota}</span>)
                  <br /> Fecha y Hora Solicitada: <span className="font-semibold
                    text-white">{formattedModalDateTime}</span>
                  <br /> Motivo: "<span
                    className="italic">{citaToConfirm.motivo}</span>".
                  <br /> Estado Actual: <span className={`font-bold ${
                    citaToConfirm.estado === 'pendiente' ? 'text-yellow-400' :
                      citaToConfirm.estado === 'confirmada' ? 'text-green-400' :
                        'text-red-400'
                    }`}>{citaToConfirm.estado.toUpperCase()}</span>
                  {citaToConfirm.estado === 'pendiente' && (
                    <span className="text-yellow-300 text-xs mt-2 block">
                      Puedes vincular esta solicitud a un cliente/mascota
                      registrado o confirmarla directamente con los datos proporcionados.
                    </span>
                  )}
                </p>
              );
            })()}

            {modalError && (
              <div className="bg-red-800 text-red-100 p-3 rounded text-
                center border border-red-600 flex items-center justify-between">
                <span>{modalError}</span>
                <XCircle size={18} className="cursor-pointer" onClick={() =>
                  setModalError(null)} />
              </div>
            )}
            {modalMessage && (
              <div className="bg-green-800 text-green-100 p-3 rounded text-
                center border border-green-600 flex items-center justify-between">
                <span>{modalMessage}</span>
                <XCircle size={18} className="cursor-pointer" onClick={() =>
                  setModalMessage(null)} />
              </div>
            )}
            {citaToConfirm.estado === 'pendiente' && (
              <div className="space-y-4">
                {/* Selección de Cliente Registrado (Opcional) */}
                <div>
                  <label className="block mb-1 text-gray-300">Vincular
                    a Cliente Registrado (Opcional)</label>
                  <select
                    value={selectedClienteId}
                    onChange={(e) => {
                      setSelectedClienteId(Number(e.target.value));
                      setSelectedMascotaId(0); // Reinicia mascota
                      // cuando cambia el cliente
                    }}
                    className="w-full p-2.5 bg-gray-700 border
                      border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
                  >
                    <option value={0}>No vincular (usar datos de
                      solicitud)</option>
                    {clientes.map(c => (
                      <option key={c.id_cliente}
                        value={c.id_cliente}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                {/* Selección de Mascota Registrada (Opcional) */}
                <div>
                  <label className="block mb-1 text-gray-300">Mascota
                    Registrada (Opcional)</label>
                  <select
                    value={selectedMascotaId}
                    onChange={(e) =>
                      setSelectedMascotaId(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-700 border
                      border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
                    disabled={selectedClienteId === 0} //
                  // Deshabilitado si no hay cliente seleccionado
                  >
                    <option value={0}>Selecciona Mascota
                      Existente</option>
                    {getFilteredMascotas(selectedClienteId).map(m =>
                    (
                      <option key={m.id_mascota}
                        value={m.id_mascota}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
                {/* Asignar Veterinario (Requerido para Confirmar) */}
                <div>
                  <label className="block mb-1 text-gray-300">Asignar
                    Veterinario</label>
                  <select
                    value={selectedVeterinarioId}
                    onChange={(e) =>
                      setSelectedVeterinarioId(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-700 border
                      border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                  >
                    <option value={0}>Selecciona
                      Veterinario</option>
                    {veterinarios.map(v => (
                      <option key={v.id_veterinario}
                        value={v.id_veterinario}>{v.nombre} ({v.especialidad})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeConfirmModal}
                className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-
                  white rounded-lg font-semibold transition shadow-md"
              >
                {citaToConfirm.estado === 'pendiente' ? 'Cancelar' :
                  'Cerrar'}
              </button>
              {citaToConfirm.estado === 'pendiente' && (
                <button
                  onClick={handleConfirmPublicAppointment}
                  className="px-6 py-2 bg-indigo-700 hover:bg-indigo-600
                    text-white rounded-lg font-semibold transition shadow-md"
                >
                  Confirmar y Agendar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Renderizar CitaDetailModal para citas internas */}
      <CitaDetailModal
        isOpen={showInternalCitaDetailsModal}
        cita={selectedInternalCitaForDetails}
        onClose={() => setShowInternalCitaDetailsModal(false)}
        clientes={clientes}
        mascotas={mascotas}
        veterinarios={veterinarios}
      />
    </div>
  );
};
export default AdminCitasModule;
