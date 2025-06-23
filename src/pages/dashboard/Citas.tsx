import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { CalendarDays, Clock, PawPrint, CheckCircle, Loader2, XCircle, PlusCircle, AlertCircle, Tag, Weight, User } from 'lucide-react'; // Asegúrate de importar todos los iconos necesarios

// Asumiendo que estos tipos ya existen en tu archivo de Citas.tsx
interface Mascota {
  id_mascota: number;
  nombre: string;
  especie: string;
  raza: string | null;
  edad: number | null;
  peso: number | null;
  id_cliente: number | null;
  fecha_nacimiento?: string | null;
}

interface CitaPendienteCliente {
  id_cita: number;
  id_mascota: number | null; // Puede ser null si es cita publica y no se ha asignado mascota
  fecha: string;
  motivo: string;
  estado: string;
  tipo: string | null; // Puede ser null
  nombre_mascota?: string;
}

interface CitaConfirmadaCliente {
  id_cita: number;
  id_mascota: number | null; // Puede ser null
  fecha: string;
  motivo: string;
  estado: string;
  tipo: string | null; // Puede ser null
  nombre_mascota?: string;
  nombre_veterinario?: string;
}

// ESTADO INICIAL PARA EL FORMULARIO DE AÑADIR NUEVA MASCOTA
const initialNewMascotaFormState = {
  nombre: '',
  especie: '',
  raza: '',
  edad: null,
  peso: null,
  fecha_nacimiento: null,
};

const Citas: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [tipo, setTipo] = useState<string>('');
  const [fecha, setFecha] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [mascotasCliente, setMascotasCliente] = useState<Mascota[]>([]);
  const [selectedMascotaId, setSelectedMascotaId] = useState<number | null>(null);
  const [citasPendientes, setCitasPendientes] = useState<CitaPendienteCliente[]>([]);
  const [citasConfirmadas, setCitasConfirmadas] = useState<CitaConfirmadaCliente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // NUEVOS ESTADOS PARA EL MODAL DE AÑADIR MASCOTA
  const [showAddMascotaModal, setShowAddMascotaModal] = useState(false);
  const [newMascotaForm, setNewMascotaForm] = useState(initialNewMascotaFormState);
  const [isAddingMascota, setIsAddingMascota] = useState(false);
  const [addMascotaError, setAddMascotaError] = useState<string | null>(null);
  const [addMascotaSuccess, setAddMascotaSuccess] = useState<string | null>(null);

  // Función para cargar las mascotas del cliente autenticado
  const fetchMascotas = useCallback(async () => {
    if (!user) return;
    try {
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('id_cliente')
        .eq('id_user', user.id)
        .single();

      if (clienteError || !clienteData) {
        console.warn('No se encontró ID de cliente para el usuario autenticado. Esto es normal si no tienen perfil de cliente.');
        setMascotasCliente([]);
        return;
      }

      const clienteId = clienteData.id_cliente;
      const { data: mascotasData, error: mascotasError } = await supabase
        .from('mascotas')
        .select('*')
        .eq('id_cliente', clienteId); // Filtra mascotas por el ID del cliente

      if (mascotasError) throw mascotasError;
      setMascotasCliente(mascotasData || []);
    } catch (err: any) {
      console.error('Error fetching mascotas:', err.message);
      setError('Error al cargar tus mascotas.');
    }
  }, [user]);

  // Función para cargar las citas del cliente
  const fetchCitas = useCallback(async () => {
    if (!user) return;
    try {
      // Intentar obtener el id_cliente asociado al usuario actual
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('id_cliente')
        .eq('id_user', user.id)
        .single();
      
      let clienteId = clienteData?.id_cliente || null;

      // Opción 1: Citas agendadas por el cliente registrado (desde tabla 'citas')
      let citasDelClienteRegistrado: any[] = [];
      if (clienteId) {
        const { data, error: err } = await supabase
          .from('citas')
          .select(`
            id_cita,
            id_mascota,
            fecha,
            motivo,
            estado,
            tipo,
            mascotas (nombre),
            veterinarios (nombre),
            nombre_mascota_invitada
          `)
          .eq('id_cliente', clienteId) // Citas directamente asociadas a este id_cliente
          .order('fecha', { ascending: false });
        if (err) throw err;
        citasDelClienteRegistrado = data;
      }
      
      // Opción 2: Citas públicas que coinciden con el email o nombre del usuario autenticado
      let citasPublicasDelUsuario: any[] = [];
      const { data: userProfile, error: profileError } = await supabase
        .from('users') // O la tabla de perfil donde guardes el email principal del usuario
        .select('email, nombre')
        .eq('id_user', user.id)
        .single();

      if (profileError) console.error("Error al obtener perfil de usuario para citas públicas:", profileError.message);
      
      if (userProfile?.email) {
        const { data, error: err } = await supabase
          .from('citas_publicas')
          .select(`
            id_cita,
            fecha,
            motivo,
            estado,
            nombre_mascota,
            nombre_cliente,
            tipo:motivo 
          `) // CORREGIDO: Eliminado el comentario que causaba el error de parseo.
          .eq('email', userProfile.email)
          .order('fecha', { ascending: false });
        if (err) console.error("Error al obtener citas públicas por email:", err.message);
        citasPublicasDelUsuario = data || [];

        // Fusionar citas_publicas con las que ya se tienen, asignando a tipo CitaPendienteCliente/CitaConfirmadaCliente
        citasPublicasDelUsuario = citasPublicasDelUsuario.map(cita => ({
            id_cita: cita.id_cita,
            id_mascota: null, // No hay id_mascota directo en citas_publicas
            fecha: cita.fecha,
            motivo: cita.motivo,
            estado: cita.estado === 'pendiente' ? 'Pendiente' : cita.estado, // Normalizar estado
            tipo: cita.tipo || 'General',
            nombre_mascota: cita.nombre_mascota || 'Mascota Invitada', // Usar nombre_mascota de citas_publicas
            nombre_veterinario: 'Pendiente Asignación', // O 'No Aplica'
        }));
      }

      const allCitasRaw = [...citasDelClienteRegistrado, ...citasPublicasDelUsuario];

      const pendientes: CitaPendienteCliente[] = [];
      const confirmadas: CitaConfirmadaCliente[] = [];

      allCitasRaw.forEach(cita => {
        const processedCita = {
          id_cita: cita.id_cita,
          id_mascota: cita.id_mascota || null, // Asegurar que es number | null
          fecha: cita.fecha,
          motivo: cita.motivo,
          estado: cita.estado,
          tipo: cita.tipo || 'No especificado', // Asegurar que es string | null
          nombre_mascota: cita.mascotas?.nombre || cita.nombre_mascota_invitada || cita.nombre_mascota || 'Mascota Desconocida',
          nombre_veterinario: cita.veterinarios?.nombre || 'Pendiente Asignación',
        };

        // Normalizar estados para las clasificaciones
        const estadoLower = cita.estado.toLowerCase();
        if (['pendiente', 'rechazada'].includes(estadoLower)) {
          pendientes.push(processedCita);
        } else if (['confirmada', 'realizada', 'cancelada'].includes(estadoLower)) {
          confirmadas.push(processedCita);
        }
      });
      
      setCitasPendientes(pendientes);
      setCitasConfirmadas(confirmadas);

    } catch (err: any) {
      console.error('Error fetching citas:', err.message);
      setError('Error al cargar tus citas: ' + err.message);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      setLoading(true);
      Promise.all([fetchMascotas(), fetchCitas()]).finally(() => {
        setLoading(false);
      });

      // Suscripciones en tiempo real
      // Solo suscribir si el usuario está autenticado
      const mascotasChannel = supabase
        .channel('client_mascotas_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mascotas' }, () => {
          console.log('Realtime change for client mascotas received, refetching...');
          fetchMascotas();
        })
        .subscribe();

      const citasChannel = supabase
        .channel('client_citas_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, () => {
          console.log('Realtime change for client citas received, refetching...');
          fetchCitas();
        })
        .subscribe();
      
      const citasPublicasChannel = supabase
        .channel('client_citas_publicas_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'citas_publicas' }, () => {
          console.log('Realtime change for client citas_publicas received, refetching...');
          fetchCitas();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(mascotasChannel);
        supabase.removeChannel(citasChannel);
        supabase.removeChannel(citasPublicasChannel);
        console.log('Unsubscribed from client mascotas and citas channels.');
      };
    } else if (!authLoading && !user) {
      setLoading(false);
      setError('Debes iniciar sesión para ver tus citas y mascotas.');
    }
  }, [user, authLoading, fetchMascotas, fetchCitas]);

  // MANEJADORES PARA AÑADIR NUEVA MASCOTA (DENTRO DEL MODAL)
  const handleNewMascotaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewMascotaForm((prev) => {
      let parsedValue: string | number | null = value;

      if (name === 'edad') {
        parsedValue = value === '' ? null : parseInt(value, 10);
        if (isNaN(parsedValue as number)) parsedValue = null;
      } else if (name === 'peso') {
        parsedValue = value === '' ? null : parseFloat(value);
        if (isNaN(parsedValue as number)) parsedValue = null;
      } else if (name === 'raza' && value.trim() === '') {
        parsedValue = null;
      } else if (name === 'fecha_nacimiento' && value.trim() === '') {
        parsedValue = null;
      }
      
      return {
        ...prev,
        [name]: parsedValue,
      };
    });
  };

  const handleNewMascotaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddMascotaError(null);
    setAddMascotaSuccess(null);
    setIsAddingMascota(true);

    if (!user) {
      setAddMascotaError('No se pudo determinar el cliente para asignar la mascota. Inicia sesión.');
      setIsAddingMascota(false);
      return;
    }

    try {
      // Primero, obtener el id_cliente asociado al id_user autenticado
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('id_cliente')
        .eq('id_user', user.id)
        .single();

      if (clienteError || !clienteData) {
        throw new Error('No se encontró el perfil de cliente asociado a tu cuenta. Asegúrate de tener uno.');
      }
      const id_cliente = clienteData.id_cliente;

      const payload = {
        ...newMascotaForm,
        id_cliente: id_cliente, // Asignar la mascota al cliente actual
        raza: newMascotaForm.raza?.trim() || null,
        fecha_nacimiento: newMascotaForm.fecha_nacimiento || null,
      };

      // Validaciones básicas
      if (!payload.nombre || !payload.especie) {
        setAddMascotaError('Los campos Nombre y Especie son obligatorios.');
        setIsAddingMascota(false);
        return;
      }

      const { error: insertError } = await supabase.from('mascotas').insert([payload]);
      if (insertError) throw insertError;

      setAddMascotaSuccess('Mascota agregada correctamente. Selecciona tu nueva mascota en la lista.');
      setNewMascotaForm(initialNewMascotaFormState); // Limpiar formulario
      setShowAddMascotaModal(false); // Cerrar el modal
      await fetchMascotas(); // Recargar la lista de mascotas para que aparezca la nueva

      // Después de añadir la mascota y recargar, podrías querer pre-seleccionar la nueva mascota
      // Esto requeriría que fetchMascotas devuelva el ID de la nueva mascota, o buscarla por nombre.
      // Por simplicidad, por ahora solo se recargan.

    } catch (err: any) {
      console.error("Error al agregar nueva mascota:", err.message);
      setAddMascotaError("Error al agregar la mascota: " + err.message);
    } finally {
      setIsAddingMascota(false);
    }
  };

  const handleSolicitarCita = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccess(null);

    // Validación más robusta
    if (!selectedMascotaId || !tipo || !fecha || !motivo) {
        setError("Por favor, completa todos los campos requeridos para la cita.");
        setSubmitLoading(false);
        return;
    }

    try {
      // Obtener el id_cliente del usuario autenticado para la cita
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('id_cliente')
        .eq('id_user', user?.id)
        .single();
      
      const id_cliente = clienteData?.id_cliente || null; // Puede ser null si el usuario no tiene perfil de cliente aún

      const { error: citaError } = await supabase.from('citas').insert([
        {
          id_mascota: selectedMascotaId,
          id_cliente: id_cliente, 
          fecha: fecha,
          motivo: motivo,
          tipo: tipo,
          estado: 'Pendiente', // El estado inicial para solicitudes de citas internas
        }
      ]);

      if (citaError) throw citaError;

      setSuccess('Cita solicitada exitosamente. Espera la confirmación.');
      // Limpiar formulario de cita
      setTipo('');
      setFecha('');
      setMotivo('');
      setSelectedMascotaId(null);
      await fetchCitas(); // Recargar citas para ver la nueva solicitud
    } catch (err: any) {
      console.error("Error al solicitar cita:", err.message);
      setError('Error al solicitar la cita: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-950 text-white">
        <Loader2 className="animate-spin mr-3 text-blue-400" size={36} />
        <p className="text-xl text-blue-400">Cargando tus datos...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-950 text-white rounded-lg shadow-xl space-y-8 font-inter">
      <h2 className="text-3xl font-extrabold text-blue-400 mb-8 flex items-center gap-3">
        <CalendarDays size={28} /> Mis Citas
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

      {/* SECCIÓN SOLICITAR NUEVA CITA */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800">
        <h3 className="text-2xl font-bold text-indigo-400 mb-5 flex items-center gap-2">
          <PlusCircle size={22} /> Solicitar Nueva Cita
        </h3>
        <form onSubmit={handleSolicitarCita} className="grid grid-cols-1 md:grid-cols-2 gap-5 text-base">
          {/* Selector de Mascota */}
          <div>
            <label htmlFor="selectedMascota" className="block mb-1 text-gray-300">Selecciona tu Mascota:</label>
            <select
              id="selectedMascota"
              value={selectedMascotaId || ''}
              onChange={(e) => setSelectedMascotaId(Number(e.target.value) || null)}
              className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
              required
            >
              <option value="">-- Selecciona una mascota --</option>
              {mascotasCliente.map((mascota) => (
                <option key={mascota.id_mascota} value={mascota.id_mascota}>
                  {mascota.nombre} ({mascota.especie})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAddMascotaModal(true)} 
              className="mt-3 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-md flex items-center justify-center gap-2"
            >
              <PawPrint size={20} /> ¿No está tu mascota? Añade una nueva.
            </button>
          </div>

          {/* Tipo de Cita */}
          <div>
            <label htmlFor="tipo" className="block mb-1 text-gray-300">Tipo de Cita:</label>
            <select
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
              required
            >
              <option value="">-- Selecciona el tipo de cita --</option>
              <option value="Grooming">Grooming</option>
              <option value="Revision-Consulta">Revisión/Consulta</option>
              {/* Añade más tipos de cita según tu negocio */}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label htmlFor="fecha" className="block mb-1 text-gray-300">Fecha y Hora:</label>
            <input
              id="fecha"
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
              required
            />
          </div>

          {/* Motivo */}
          <div>
            <label htmlFor="motivo" className="block mb-1 text-gray-300">Motivo de la Cita:</label>
            <textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Describe brevemente el motivo de la cita (ej. chequeo anual, vacunas, corte de pelo)"
              required
            ></textarea>
          </div>

          <div className="md:col-span-2 flex justify-end mt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-semibold transition shadow-md flex items-center justify-center"
              disabled={submitLoading}
            >
              {submitLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Solicitando...
                </>
              ) : (
                'Solicitar Cita'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SECCIÓN CITAS PENDIENTES */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800">
        <h3 className="text-2xl font-bold text-yellow-400 mb-5 flex items-center gap-2">
          <Clock size={22} /> Mis Citas Pendientes/Rechazadas
        </h3>
        {citasPendientes.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No tienes citas pendientes o rechazadas.</p>
        ) : (
          <ul className="space-y-4">
            {citasPendientes.map((cita) => (
              <li key={cita.id_cita} className="bg-gray-800 p-4 rounded-md border border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm">
                <div>
                  <p className="font-semibold text-white text-lg">{cita.motivo}</p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Mascota:</span> {cita.nombre_mascota}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Fecha:</span> {new Date(cita.fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="mt-3 md:mt-0 flex items-center gap-2">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${cita.estado === 'Pendiente' ? 'bg-yellow-600' : 'bg-red-600'} text-white`}>
                    {cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1)}
                  </span>
                  {/* Aquí podrías añadir botones para 'Ver Detalle' o 'Cancelar' si aplica */}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* SECCIÓN CITAS CONFIRMADAS */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800">
        <h3 className="text-2xl font-bold text-green-400 mb-5 flex items-center gap-2">
          <CheckCircle size={22} /> Mis Citas Confirmadas/Realizadas
        </h3>
        {citasConfirmadas.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No tienes citas confirmadas o realizadas.</p>
        ) : (
          <ul className="space-y-4">
            {citasConfirmadas.map((cita) => (
              <li key={cita.id_cita} className="bg-gray-800 p-4 rounded-md border border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm">
                <div>
                  <p className="font-semibold text-white text-lg">{cita.motivo}</p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Mascota:</span> {cita.nombre_mascota}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Fecha:</span> {new Date(cita.fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Veterinario:</span> {cita.nombre_veterinario || 'No Asignado'}
                  </p>
                </div>
                <div className="mt-3 md:mt-0">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${cita.estado === 'confirmada' ? 'bg-green-600' : cita.estado === 'realizada' ? 'bg-indigo-600' : 'bg-red-600'} text-white`}>
                    {cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1)}
                  </span>
                  {/* Aquí podrías añadir botones para 'Ver Historial' o 'Reagendar' */}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* MODAL PARA AÑADIR NUEVA MASCOTA */}
      {showAddMascotaModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md space-y-6 border border-blue-700 transform scale-100 animate-scale-in">
            <h3 className="text-2xl font-bold text-blue-400 text-center flex items-center justify-center gap-2">
              <PawPrint size={24} /> Añadir Nueva Mascota
            </h3>
            {addMascotaError && (
              <div className="bg-red-800 text-red-100 p-3 rounded-lg text-sm text-center border border-red-600 flex items-center justify-between">
                <AlertCircle size={20} className="flex-shrink-0 mr-2" />
                <span className="flex-grow">{addMascotaError}</span>
                <XCircle size={16} className="cursor-pointer ml-2" onClick={() => setAddMascotaError(null)} />
              </div>
            )}
            {addMascotaSuccess && (
              <div className="bg-green-800 text-green-100 p-3 rounded-lg text-sm text-center border border-green-600 flex items-center justify-between">
                <CheckCircle size={20} className="flex-shrink-0 mr-2" />
                <span className="flex-grow">{addMascotaSuccess}</span>
                <XCircle size={16} className="cursor-pointer ml-2" onClick={() => setAddMascotaSuccess(null)} />
              </div>
            )}
            <form onSubmit={handleNewMascotaSubmit} className="space-y-4">
              <div>
                <label htmlFor="newMascotaNombre" className="block mb-1 text-gray-300">Nombre:</label>
                <input
                  id="newMascotaNombre"
                  name="nombre"
                  value={newMascotaForm.nombre}
                  onChange={handleNewMascotaChange}
                  className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Nombre de la mascota"
                  required
                />
              </div>
              <div>
                <label htmlFor="newMascotaEspecie" className="block mb-1 text-gray-300">Especie:</label>
                <input
                  id="newMascotaEspecie"
                  name="especie"
                  value={newMascotaForm.especie}
                  onChange={handleNewMascotaChange}
                  className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Ej: Perro, Gato, Ave"
                  required
                />
              </div>
              <div>
                <label htmlFor="newMascotaRaza" className="block mb-1 text-gray-300">Raza (Opcional):</label>
                <input
                  id="newMascotaRaza"
                  name="raza"
                  value={newMascotaForm.raza || ''}
                  onChange={handleNewMascotaChange}
                  className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Ej: Labrador, Siames"
                />
              </div>
              <div>
                <label htmlFor="newMascotaFechaNacimiento" className="block mb-1 text-gray-300">Fecha de Nacimiento (Opcional):</label>
                <input
                  id="newMascotaFechaNacimiento"
                  name="fecha_nacimiento"
                  type="date"
                  value={newMascotaForm.fecha_nacimiento || ''}
                  onChange={handleNewMascotaChange}
                  className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label htmlFor="newMascotaEdad" className="block mb-1 text-gray-300">Edad (años - Opcional):</label>
                <input
                  id="newMascotaEdad"
                  name="edad"
                  type="number"
                  value={newMascotaForm.edad ?? ''}
                  onChange={handleNewMascotaChange}
                  className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Ej: 3"
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="newMascotaPeso" className="block mb-1 text-gray-300">Peso (kg - Opcional):</label>
                <input
                  id="newMascotaPeso"
                  name="peso"
                  type="number"
                  step="0.01"
                  value={newMascotaForm.peso ?? ''}
                  onChange={handleNewMascotaChange}
                  className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Ej: 5.2"
                  min="0"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddMascotaModal(false)}
                  className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-md"
                  disabled={isAddingMascota}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-semibold transition shadow-md flex items-center justify-center"
                  disabled={isAddingMascota}
                >
                  {isAddingMascota ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Añadiendo...
                    </>
                  ) : (
                    'Añadir Mascota'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Citas;

