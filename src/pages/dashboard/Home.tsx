import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient'; // Asegúrate de que esta ruta sea correcta

import { useAuth } from '../../context/AuthContext';
import {
  CalendarDays,
  Clock,
  PawPrint,
  CheckCircle,
  Loader2,
  XCircle, // XCircle es usado para cerrar mensajes de error/éxito
  AlertTriangle,
  PlusCircle,
  // History as HistoryIcon // Eliminado: Ya no se usa para los botones de historial clínico
} from 'lucide-react'; // Asegúrate de importar todos los iconos necesarios
import { useNavigate } from 'react-router-dom'; // Importar useNavigate para la navegación

// Definiciones de interfaces (¡ACTUALIZADAS según tu esquema de DB!)
interface Mascota {
  id_mascota: number;
  nombre: string;
  especie?: string | null;
  raza?: string | null;
  edad?: number | null; // Añadido según tu esquema
  peso?: number | null; // Añadido según tu esquema
}

interface CitaCliente {
  id_cita: number;
  id_mascota: number;
  fecha: string; // TIMESTAMP WITHOUT TIME ZONE (ej. 2025-06-13 16:00:00')
  motivo: string;
  estado: string; // 'pendiente', 'rechazada', 'confirmada', 'realizada', 'cancelada'
  tipo: string; // 'chequeo', 'grooming', 'vacunacion', 'emergencia', etc.
  nombre_mascota?: string;
  nombre_veterinario?: string;
  id_cliente?: number | null; // Puede ser null para citas creadas por admin para invitados
  nombre_cliente_invitado?: string | null; // Para citas creadas por admin
  nombre_mascota_invitada?: string | null; // Para citas creadas por admin
}

const Home: React.FC = () => {

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate(); // Hook para la navegación

  const [citasPendientes, setCitasPendientes] = useState<CitaCliente[]>([]);
  const [proximasCitasAprobadas, setProximasCitasAprobadas] =
    useState<CitaCliente[]>([]);
  const [mascotasCliente, setMascotasCliente] = useState<Mascota[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado para un saludo más dinámico
  const [clientName, setClientName] = useState<string>('');

  // Función para obtener el ID del cliente asociado al usuario logeado
  const fetchClientId = useCallback(async () => {
    if (!user?.id) return null;

    try {
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('id_cliente, nombre') // También obtenemos el nombre para el saludo
        .eq('id_user', user.id)
        .single();

      if (clienteError) {
        if (clienteError.code !== 'PGRST116') { // PGRST116: No rows found. Esto es esperado si el usuario no tiene un perfil de cliente aún.
          console.error('Error al obtener id_cliente:', clienteError.message);
          throw new Error('Error al cargar la información del cliente.');
        }
      }

      if (clienteData?.nombre) {
        setClientName(clienteData.nombre);
      }

      return clienteData?.id_cliente || null;
    } catch (err: any) {
      console.error('Error en fetchClientId:', err.message);
      setError('Error al cargar la información del cliente: ' + err.message);
      return null;
    }
  }, [user]);

  // Función principal para cargar y actualizar los datos del cliente
  const loadClientData = useCallback(async () => {
    if (authLoading || !user) {
      setIsLoading(true); // Mantener cargando si auth no está listo
      return;
    }

    setIsLoading(true);
    setError(null);

    const clienteId = await fetchClientId();

    if (!clienteId) {
      setError('No se pudo obtener el perfil del cliente. Asegúrate de que tu cuenta de usuario está asociada a un cliente.');
      setIsLoading(false);
      setCitasPendientes([]);
      setProximasCitasAprobadas([]);
      setMascotasCliente([]);
      return;
    }

    //--- 1. Fetch Mascotas del Cliente
    let clientMascotaIds: number[] = [];
    try {
      const { data: mascotasData, error: mascotasError } = await supabase
        .from('mascotas')
        .select('id_mascota, nombre, especie, raza, edad, peso') // ¡ACTUALIZADO para que coincida con tu DB!
        .eq('id_cliente', clienteId);

      if (mascotasError) throw mascotasError;
      setMascotasCliente(mascotasData || []);
      clientMascotaIds = (mascotasData || []).map((m: Mascota) => m.id_mascota);
    } catch (err: any) {
      console.error('Error al obtener mascotas:', err.message);
      setError('Error al cargar tus mascotas.');
      setIsLoading(false);
      return;
    }

    // Si no hay mascotas, no hay citas asociadas al cliente
    if (clientMascotaIds.length === 0) {
      setCitasPendientes([]);
      setProximasCitasAprobadas([]);
      setIsLoading(false);
      return;
    }

    //--- 2. Fetch Citas del Cliente (usando las nuevas columnas para invitados si aplica) ---
    try {
      const { data: citasData, error: citasError } = await supabase
        .from('citas')
        .select(
          `
          id_cita,
          id_mascota,
          fecha,
          motivo,
          estado,
          tipo,
          nombre_cliente_invitado,
          nombre_mascota_invitada,
          mascotas (nombre),
          veterinarios (nombre)
          `
        )
        .in('id_mascota', clientMascotaIds)
        .order('fecha', { ascending: true }); // Ordenar por fecha para las próximas citas

      if (citasError) throw citasError;

      const allClientCitas: CitaCliente[] = citasData.map((cita: any) => ({
        id_cita: cita.id_cita,
        id_mascota: cita.id_mascota,
        fecha: cita.fecha,
        motivo: cita.motivo,
        estado: cita.estado,
        tipo: cita.tipo,
        // Usar nombre_mascota_invitada si id_mascota es null, de lo contrario, el nombre de la mascota registrada
        nombre_mascota: cita.mascotas?.nombre || cita.nombre_mascota_invitada || 'N/A',
        nombre_veterinario: cita.veterinarios?.nombre || 'No asignado',
        id_cliente: clienteId, // Aseguramos que la cita tenga el id_cliente si es un usuario registrado
        nombre_cliente_invitado: cita.nombre_cliente_invitado || null,
        nombre_mascota_invitada: cita.nombre_mascota_invitada || null,
      }));

      // Filtrar para citas pendientes/rechazadas
      const pendingAndRejected = allClientCitas.filter(c => c.estado === 'pendiente' || c.estado === 'rechazada');
      setCitasPendientes(pendingAndRejected);

      // Filtrar para próximas citas aprobadas/confirmadas
      const today = new Date();
      // Normalizamos 'today' para que la comparación de fechas sea solo por día y hora, ignorando segundos/milisegundos
      today.setSeconds(0);
      today.setMilliseconds(0);

      const approvedUpcoming = allClientCitas.filter(c =>
        (c.estado === 'confirmada' || c.estado === 'programada') && new Date(c.fecha).getTime() >= today.getTime()
      ).slice(0, 5); // Limitar a las 5 próximas citas

      setProximasCitasAprobadas(approvedUpcoming);

    } catch (err: any) {
      console.error('Error al cargar/actualizar citas:', err.message);
      setError('Error al cargar/actualizar citas: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, authLoading, fetchClientId]); // Dependencias: user, authLoading y fetchClientId

  // useEffect para cargar los datos inicialmente y configurar los listeners en tiempo real
  useEffect(() => {
    let subscription: any;

    const setupRealtimeListeners = async () => {
      const clienteId = await fetchClientId(); // Asegúrate de obtener el clienteId antes de configurar el filtro

      if (!clienteId) {
        // El error ya se maneja en fetchClientId o loadClientData, solo retornamos.
        return;
      }

      let clientMascotaIds: number[] = [];
      try {
        const { data: mascotasData, error: mascotasError } = await supabase
          .from('mascotas')
          .select('id_mascota, nombre, especie, raza, edad, peso') // ¡ACTUALIZADO para que coincida con tu DB!
          .eq('id_cliente', clienteId);

        if (mascotasError) throw mascotasError;
        clientMascotaIds = (mascotasData || []).map((m: Mascota) => m.id_mascota);
      } catch (err: any) {
        console.error('Error al obtener IDs de mascotas para el listener:', err.message);
        // Podríamos mostrar un error aquí si el fetch inicial de mascotas falló.
      }

      // Si no hay mascotas, no hay nada que escuchar para citas.
      if (clientMascotaIds.length === 0) {
        return;
      }

      // Configurar el listener en tiempo real para la tabla 'citas'
      subscription = supabase
        .channel(`public:citas:id_mascota=in.(${clientMascotaIds.join(',')})`) // Canal específico con filtro RLS simulado
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'citas',
            // El filtro en el canal es esencial para la RLS. Aquí filtramos por id_mascota.
            filter: `id_mascota=in.(${clientMascotaIds.join(',')})`
          },
          (payload: any) => {
            console.log('Realtime change received (Home.tsx):', payload);
            // Cuando hay un cambio, volvemos a cargar todas las citas para reflejar el estado actual
            loadClientData();
          }
        )
        .subscribe((status: string, error: any) => {
          if (status === 'SUBSCRIBED') {
            console.log('Suscrito a cambios en citas (Home.tsx)');
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('Error en el canal de suscripción de citas (Home.tsx):', error);
            setError('Error en la suscripción de citas en tiempo real: ' + error.message);
          }
        });

    };

    // Llamamos a loadClientData en la carga inicial
    loadClientData();

    // Solo configuramos los listeners si hay un usuario autenticado y los datos básicos están listos
    if (!authLoading && user) {
      setupRealtimeListeners();
    }

    // Función de limpieza para desuscribirse del listener cuando el componente se desmonte
    return () => {
      if (subscription) {
        console.log('Desuscribiendo del canal de citas (Home.tsx)');
        supabase.removeChannel(subscription);
      }
    };

  }, [authLoading, user, fetchClientId, loadClientData]); // Dependencias: user, authLoading, fetchClientId, y loadClientData

  // useEffect para el intervalo de actualización del tiempo restante (solo visual)
  useEffect(() => {
    const interval = setInterval(() => {
      // Forzar re-render para actualizar el cálculo de getTimeRemaining
      setProximasCitasAprobadas(prev => [...prev]);
    }, 60000); // Cada 1 minuto

    return () => clearInterval(interval);
  }, []);

  // Función para calcular el tiempo restante para una cita
  const getTimeRemaining = (fechaCita: string) => {
    const now = new Date();
    const appointmentDate = new Date(fechaCita);

    const diffMs = appointmentDate.getTime() - now.getTime();

    if (diffMs < 0) {
      return 'Cita pasada';
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let timeString = '';
    if (diffDays > 0) {
      timeString += `${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    }

    if (diffHours > 0 || diffDays > 0) { // Mostrar horas si hay días o si es la única unidad
      if (timeString) timeString += ', '; // Añadir coma si ya hay días
      timeString += `${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    }

    if (diffMinutes > 0 || diffHours > 0 || diffDays > 0) { // Mostrar minutos si hay horas o días
      if (timeString) timeString += ', '; // Añadir coma si ya hay horas/días
      timeString += `${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
    }
    
    // Si no hay días, horas ni minutos, y la cita no ha pasado, es "en menos de un minuto"
    if (!timeString && diffMs > 0) {
        return "Faltan: menos de 1 minuto";
    }


    return `Faltan: ${timeString}`;
  };


  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <Loader2 className="animate-spin mr-2" size={24} />
        <p className="text-xl text-indigo-400">Cargando resumen del dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 text-white min-h-screen font-inter">
        <div className="bg-red-800 p-4 rounded-md text-red-100 mb-4">
          <p>Error: {error}</p>
          <p className="text-sm mt-2">Asegúrate de que estás autenticado y
            que las tablas y sus políticas RLS están configuradas correctamente para tu
            rol de cliente.</p>
        </div>
        <button
          onClick={() => window.location.reload()} // La forma más simple de re-disparar el useEffect inicial
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition shadow-md"
        >
          Reintentar Carga
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gray-900 text-white min-h-screen font-inter">
      <h2 className="text-3xl font-extrabold text-indigo-400 text-center mb-8">
        Bienvenido {clientName ? `${clientName}` : ''} a tu Dashboard
      </h2>

      {/* Grid de Resumen Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

        {/* Tarjeta: Próxima Cita */}
        <div className="bg-gradient-to-br from-blue-800 to-indigo-800 p-6
          rounded-lg shadow-xl border border-blue-700 flex flex-col justify-between">
          <h3 className="text-xl font-semibold text-blue-200 mb-3 flex
            items-center gap-2">
            <CalendarDays size={20} /> Próxima Cita
          </h3>
          {proximasCitasAprobadas.length > 0 ? (
            <div>
              <p className="text-lg font-bold text-white">
                {proximasCitasAprobadas[0].motivo} ({proximasCitasAprobadas[0].tipo}) para {proximasCitasAprobadas[0].nombre_mascota}
              </p>
              <p className="text-blue-100 text-sm mt-1">
                <span className="font-medium">Fecha:</span> {new
                  Date(proximasCitasAprobadas[0].fecha).toLocaleDateString()} a las {new
                    Date(proximasCitasAprobadas[0].fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-blue-100 text-sm">
                <span className="font-medium">Veterinario:</span>
                {proximasCitasAprobadas[0].nombre_veterinario}
              </p>
              <p className="text-blue-300 font-bold text-sm mt-3 flex items-center">
                <Clock size={16} className="inline-block mr-1" />
                {getTimeRemaining(proximasCitasAprobadas[0].fecha)}
              </p>
              <button
                onClick={() => navigate('/dashboard/citas')}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-
                  white py-2 rounded-md font-semibold transition"
              >
                Ver todas las Citas
              </button>
            </div>
          ) : (
            <div>
              <p className="text-blue-100">No tienes citas programadas
                próximas.</p>
              <button
                onClick={() => navigate('/dashboard/citas')}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-
                  white py-2 rounded-md font-semibold transition"
              >
                Solicitar una Cita
              </button>
            </div>
          )}
        </div>

        {/* Tarjeta: Citas Pendientes */}
        <div className="bg-gradient-to-br from-yellow-800 to-orange-800 p-6
          rounded-lg shadow-xl border border-yellow-700 flex flex-col justify-
          between">
          <h3 className="text-xl font-semibold text-yellow-200 mb-3 flex
            items-center gap-2">
            <AlertTriangle size={20} /> Solicitudes Pendientes
          </h3>
          <p className="text-5xl font-bold text-white text-center my-
            4">{citasPendientes.length}</p>
          <p className="text-yellow-100 text-center">citas esperando
            aprobación.</p>
          <button
            onClick={() => navigate('/dashboard/citas')}
            className="mt-4 w-full bg-yellow-600 hover:bg-yellow-700 text-
              white py-2 rounded-md font-semibold transition"
          >
            Revisar Solicitudes
          </button>
        </div>

        {/* Tarjeta: Total de Mascotas */}
        <div className="bg-gradient-to-br from-purple-800 to-pink-800 p-6
          rounded-lg shadow-xl border border-purple-700 flex flex-col justify-
          between">
          <h3 className="text-xl font-semibold text-purple-200 mb-3 flex
            items-center gap-2">
            <PawPrint size={20} /> Tus Mascotas
          </h3>
          <p className="text-5xl font-bold text-white text-center my-
            4">{mascotasCliente.length}</p>
          <p className="text-purple-100 text-center">mascotas
            registradas.</p>
          <button
            onClick={() => navigate('/dashboard/mascotas')}
            className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-
              white py-2 rounded-md font-semibold transition"
          >
            Gestionar Mascotas
          </button>
        </div>
      </div>

      {/* Sección de Acciones Rápidas */}
      <section className="bg-gray-800 p-6 rounded-lg shadow-lg border
        border-gray-700">
        <h3 className="text-2xl text-indigo-300 mb-6 font-semibold flex
          items-center gap-2">
          <PlusCircle size={24} /> Acciones Rápidas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-
          4">
          <button
            onClick={() => navigate('/dashboard/citas')}
            className="flex items-center justify-center p-4 bg-indigo-700
              hover:bg-indigo-600 text-white rounded-lg shadow-md transition transform
              hover:scale-105"
          >
            <CalendarDays size={20} className="mr-2" /> Solicitar Nueva Cita
          </button>
          <button
            onClick={() => navigate('/dashboard/mascotas')}
            className="flex items-center justify-center p-4 bg-teal-700
              hover:bg-teal-600 text-white rounded-lg shadow-md transition transform
              hover:scale-105"
          >
            <PawPrint size={20} className="mr-2" /> Añadir/Editar Mascota
          </button>
          {/* Los botones de historial clínico fueron eliminados según tu solicitud. */}
        </div>
      </section>

      {/* Sección de Citas Pendientes de Aprobación (detallado, como antes) */}
      <section className="bg-gray-800 p-6 rounded-lg shadow-lg border
        border-gray-700">
        <h3 className="text-2xl text-yellow-300 mb-6 font-semibold flex
          items-center gap-2">
          <Clock size={24} /> Solicitudes de Cita Pendientes/Rechazadas
        </h3>
        {citasPendientes.length === 0 ? (
          <p className="text-gray-400">No tienes solicitudes de citas
            pendientes o rechazadas.</p>
        ) : (
          <div className="space-y-4">
            {citasPendientes.map((cita) => (
              <div key={cita.id_cita} className="bg-gray-700 p-4 rounded-md
                border border-gray-600 flex flex-col md:flex-row justify-between items-start
                md:items-center">
                <div>
                  <p className="text-lg font-semibold text-
                    white">{cita.motivo} para {cita.nombre_mascota}</p>
                  <p className="text-gray-300 text-sm">
                    <span className="font-medium">Fecha solicitada:</span>
                    {new Date(cita.fecha).toLocaleDateString()} a las {new
                      Date(cita.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'
                      })}
                  </p>
                  <p className={`text-sm font-bold ${cita.estado ===
                    'pendiente' ? 'text-yellow-400' : 'text-red-400'}`}>
                    Estado: {cita.estado.charAt(0).toUpperCase() +
                      cita.estado.slice(1)}
                  </p>
                </div>
                <div className="mt-2 md:mt-0 md:ml-4">
                  {/* Podrías añadir un botón para cancelar la solicitud si
                    está pendiente */}
                  <button
                    onClick={() => navigate('/dashboard/citas')} // Redirige a la página de citas para gestionar
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-
                      white rounded-md text-sm transition"
                  >
                    Gestionar Solicitud
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sección de Próximas Citas Aprobadas (detallado, como antes) */}
      <section className="bg-gray-800 p-6 rounded-lg shadow-lg border
        border-gray-700">
        <h3 className="text-2xl text-green-300 mb-6 font-semibold flex
          items-center gap-2">
          <CheckCircle size={24} /> Próximas Citas Aprobadas
        </h3>
        {proximasCitasAprobadas.length === 0 ? (
          <p className="text-gray-400">No tienes citas aprobadas
            próximas.</p>
        ) : (
          <div className="space-y-4">
            {proximasCitasAprobadas.map((cita) => (
              <div key={cita.id_cita} className="bg-gray-700 p-4 rounded-md
                border border-gray-600 flex flex-col md:flex-row justify-between items-start
                md:items-center">
                <div>
                  <p className="text-lg font-semibold text-
                    white">{cita.motivo} ({cita.tipo}) para {cita.nombre_mascota}</p>
                  <p className="text-gray-300 text-sm">
                    <span className="font-medium">Fecha:</span> {new
                      Date(cita.fecha).toLocaleDateString()} a las {new
                        Date(cita.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'
                        })}
                  </p>
                  <p className="text-gray-300 text-sm">
                    <span className="font-medium">Veterinario:</span>
                    {cita.nombre_veterinario || 'No asignado'}
                  </p>
                  <p className="text-indigo-300 font-bold text-sm mt-1">
                    <Clock size={16} className="inline-block mr-1" />
                    {getTimeRemaining(cita.fecha)}
                  </p>
                </div>
                <div className="mt-2 md:mt-0 md:ml-4">
                  <span className="px-3 py-1 text-xs font-semibold rounded-
                    full bg-green-600 text-white">
                    {cita.estado.charAt(0).toUpperCase() +
                      cita.estado.slice(1)}
                  </span>
                  {/* Podrías añadir un botón para cancelar la cita
                    confirmada si lo permites */}
                  <button
                    onClick={() => navigate('/dashboard/citas')} // Redirige a la página de citas para gestionar
                    className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700
                      text-white rounded-md text-sm transition"
                  >
                    Gestionar Cita
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
export default Home;
