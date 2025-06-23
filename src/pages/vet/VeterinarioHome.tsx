import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient'; // Asegúrate de que esta ruta sea correcta

import { useAuth } from '../../context/AuthContext'; // Asegúrate de que la ruta sea correcta

import { Link } from 'react-router-dom';

import {
  Stethoscope, CalendarCheck, Clock, PawPrint, Loader2, AlertTriangle,
  Check, User as UserIcon, MessageSquare,
  Eye
} from 'lucide-react';

import ConfirmationModal from '../../components/ConfirmationModal'; // Asegúrate de que la ruta sea correcta

//--- Interfaces de Tipos (Confirmadas con tu esquema de DB)

interface Cliente {
  id_cliente: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
}

interface Mascota {
  id_mascota: number;
  nombre: string;
  especie: string | null;
  raza: string | null;
  edad: number | null;
  peso: number | null;
  id_cliente: number | null;
}

interface CitaVeterinarioDetalle {
  id_cita: number;
  id_mascota: number | null;
  id_cliente: number | null;
  fecha: string;
  motivo: string;
  estado: string;
  tipo: string | null;
  id_veterinario: number | null;
  nombre_cliente_invitado: string | null;
  nombre_mascota_invitada: string | null;
  // Datos combinados de las relaciones
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

//--- Componente Principal VeterinarioHome

const VeterinarioHome: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  const [loadingContent, setLoadingContent] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [citasAsignadas, setCitasAsignadas] =
    useState<CitaVeterinarioDetalle[]>([]);

  const [citasSinAsignar, setCitasSinAsignar] =
    useState<CitaVeterinarioDetalle[]>([]);

  const [veterinarioProfile, setVeterinarioProfile] =
    useState<VeterinarioProfile | null>(null);

  // Estados para el modal de confirmación de asignación de cita
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [citaToClaim, setCitaToClaim] = useState<CitaVeterinarioDetalle |
    null>(null);

  // Función para obtener el perfil del veterinario logueado
  // Se mantiene como useCallback ya que se usa como dependencia en el
  // useEffect principal
  const fetchVeterinarioProfile = useCallback(async (userId: string):
    Promise<VeterinarioProfile | null> => {
    try {
      const { data, error: profileError } = await supabase
        .from('veterinarios')
        .select('id_veterinario, nombre, especialidad, email, telefono, id_user')
        .eq('id_user', userId)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') { // No rows found.
          throw new Error('No se encontró un perfil de veterinario para tu' +
            'usuario. Asegúrate de que tu cuenta esté asociada a un veterinario.');
        }
        throw profileError; // Lanzar otros errores de perfil
      }
      return data as VeterinarioProfile;
    } catch (err: any) {
      console.error('Error al obtener el perfil del veterinario:',
        err.message);
      // No seteamos el error global aquí, lo dejamos para el loadAllData
      // para un manejo centralizado
    }
    return null;
  }, []);

  // Función principal para cargar TODOS los datos del dashboard
  // Esta función se llamará inicialmente y con cada cambio de Realtime
  const loadAllDashboardData = useCallback(async () => {
    setLoadingContent(true);
    setError(null); // Limpiar errores previos

    if (!user) {
      setLoadingContent(false);
      return;
    }

    try {
      // 1. Obtener el perfil del veterinario
      const profile = await fetchVeterinarioProfile(user.id);
      if (!profile) {
        throw new Error('Perfil de veterinario no encontrado o no' +
          ' autorizado.');
      }
      setVeterinarioProfile(profile);

      // 2. Obtener todos los clientes y mascotas (los "catálogos")
      const [{ data: clientesData, error: clientesError },
        { data: mascotasData, error: mascotasError }] = await
        Promise.all([
          supabase.from('clientes').select('id_cliente, nombre, email, telefono'),
          supabase.from('mascotas').select('id_mascota, id_cliente, nombre, especie, raza, edad, peso')
        ]);

      if (clientesError) throw clientesError;
      if (mascotasError) throw mascotasError;

      const currentClientes = clientesData || [];
      const currentMascotas = mascotasData || [];

      // 3. Obtener todas las citas
      const { data: citasRaw, error: citasError } = await supabase
        .from('citas')
        .select(
          `
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
        `
        )
        .order('fecha', { ascending: true });

      if (citasError) throw citasError;

      // 4. Combinar los datos de las citas con los detalles de cliente y
      // mascota
      const allCitas: CitaVeterinarioDetalle[] = (citasRaw || []).map((cita:
        any) => {
        const cliente = cita.id_cliente ? currentClientes.find(c =>
          c.id_cliente === cita.id_cliente) : null;

        const mascota = cita.id_mascota ? currentMascotas.find(m =>
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

      // 5. Clasificar citas para el dashboard
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Citas asignadas al veterinario logueado y programadas
      const assigned = allCitas.filter(c =>
        c.id_veterinario === profile.id_veterinario &&
        c.estado.toLowerCase() === 'programada' &&
        new Date(c.fecha) >= today
      ).slice(0, 5); // Limita a 5 para el dashboard

      // Citas sin asignar (estado 'pendiente')
      const unassigned = allCitas.filter(c =>
        c.id_veterinario === null &&
        c.estado.toLowerCase() === 'pendiente' &&
        new Date(c.fecha) >= today
      ).slice(0, 5); // Limita a 5 para el dashboard

      setCitasAsignadas(assigned);
      setCitasSinAsignar(unassigned);

    } catch (err: any) {
      console.error('Error al cargar todos los datos del dashboard:',
        err.message);
      setError('Error al cargar el dashboard: ' + err.message);
    } finally {
      setLoadingContent(false);
    }
  }, [user, fetchVeterinarioProfile]);

  // Efecto principal para la carga inicial y suscripciones de Realtime
  useEffect(() => {
    let citasSubscription: any;
    let clientesSubscription: any;
    let mascotasSubscription: any;

    // Ejecutar la carga inicial de datos
    if (!authLoading && user) {
      loadAllDashboardData();
    } else if (!authLoading && !user) {
      setLoadingContent(false);
    }

    // Configurar suscripciones a Realtime
    if (user) { // Solo si el usuario está autenticado
      citasSubscription = supabase
        .channel('vet_dashboard_citas_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'citas' },
          () => {
            console.log('Realtime: Cambio en citas, recargando todos los' +
              ' datos del dashboard...');
            loadAllDashboardData(); // Recargar todo para asegurar
            // consistencia
          }
        )
        .subscribe((status: string, err: any) => {
          if (status === 'CHANNEL_ERROR') console.error('Error Realtime' +
            ' citas:', err?.message || err);
        });

      clientesSubscription = supabase
        .channel('vet_dashboard_clientes_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clientes' },
          () => {
            console.log('Realtime: Cambio en clientes, recargando todos los' +
              ' datos del dashboard...');
            loadAllDashboardData(); // Recargar todo para asegurar
            // consistencia
          }
        )
        .subscribe((status: string, err: any) => {
          if (status === 'CHANNEL_ERROR') console.error('Error Realtime' +
            ' clientes:', err?.message || err);
        });

      mascotasSubscription = supabase
        .channel('vet_dashboard_mascotas_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mascotas' },
          () => {
            console.log('Realtime: Cambio en mascotas, recargando todos los' +
              ' datos del dashboard...');
            loadAllDashboardData(); // Recargar todo para asegurar
            // consistencia
          }
        )
        .subscribe((status: string, err: any) => {
          if (status === 'CHANNEL_ERROR') console.error('Error Realtime' +
            ' mascotas:', err?.message || err);
        });

    }

    // Función de limpieza para desuscribirse de los canales de Realtime
    return () => {
      console.log('Desuscribiendo de los canales del VeterinarioHome.tsx');
      if (citasSubscription) supabase.removeChannel(citasSubscription);
      if (clientesSubscription)
        supabase.removeChannel(clientesSubscription);
      if (mascotasSubscription)
        supabase.removeChannel(mascotasSubscription);
    };

  }, [authLoading, user, loadAllDashboardData]);

  // Manejador para mostrar el modal de confirmación antes de reclamar la
  // cita
  const handleClaimCitaConfirmation = (cita: CitaVeterinarioDetalle) => {
    setCitaToClaim(cita);
    setShowConfirmation(true);
  };

  // Función para confirmar y asignar la cita al veterinario
  const confirmClaimCita = async () => {
    if (!citaToClaim || !veterinarioProfile) return;

    setLoadingContent(true); // Mostrar loading mientras se procesa la
    // acción

    try {
      const { error: updateError } = await supabase
        .from('citas')
        .update({ id_veterinario: veterinarioProfile.id_veterinario, estado:
          'programada' }) // Estado 'programada' para citas asignadas por el vet
        .eq('id_cita', citaToClaim.id_cita);

      if (updateError) {
        throw new Error(`Error de Supabase al asignar cita: ${updateError.message} (Código: ${updateError.code})`);
      }

    } catch (err: any) {
      console.error('Error al asignar la cita:', err.message);
      setError(`No se pudo asignar la cita: ${err.message}`);
    } finally {
      setShowConfirmation(false); // Cerrar modal de confirmación
      setCitaToClaim(null); // Limpiar cita a reclamar
      setLoadingContent(false); // Ocultar loading
    }
  };

  // Renderizado del Componente
  if (authLoading || loadingContent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white font-inter">
        <Loader2 className="animate-spin h-8 w-8 text-green-400" />
        <p className="ml-3 text-lg">Cargando dashboard de veterinario...</p>
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
            <p className="font-bold">Error: </p>
            <p>{error}</p>
            <p className="text-sm mt-2">Por favor, verifica tu conexión, las
              políticas de RLS en Supabase y que tu cuenta de usuario esté correctamente
              asociada a un perfil de veterinario.</p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-
            gray-600 transition shadow-md mt-4"
        >
          Reintentar Carga
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 p-6 bg-gray-900 text-white min-h-screen font-inter">
      <h2 className="text-3xl font-extrabold text-green-400 text-center mb-8
        flex items-center justify-center gap-3">
        <Stethoscope className="h-8 w-8" />
        ¡Bienvenido, Dr. {veterinarioProfile?.nombre}!
      </h2>

      {/* Sección del Perfil del Veterinario */}
      {veterinarioProfile && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8 border
          border-gray-700">
          <h3 className="text-2xl font-semibold mb-4 text-white flex items-
            center gap-2">
            <UserIcon size={24} /> Tu Perfil
          </h3>
          <p className="text-gray-400 mb-2">Email: <span className="font-
            medium text-green-200">{veterinarioProfile.email}</span></p>
          <p className="text-gray-400 mb-2">Teléfono: <span className="font-
            medium text-green-200">{veterinarioProfile.telefono}</span></p>
          <p className="text-gray-400 mb-2">Especialidad: <span
            className="font-medium text-green-200">{veterinarioProfile.especialidad ||
            'No especificada'}</span></p>
        </div>
      )}

      {/* Grid de Resumen Rápido y Acciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Sección de Tus Próximas Citas Asignadas */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-
          gray-700">
          <h3 className="text-2xl text-green-300 mb-4 font-semibold flex
            items-center gap-2">
            <CalendarCheck size={24} /> Tus Próximas Citas Asignadas
            ({citasAsignadas.length})
          </h3>
          {citasAsignadas.length === 0 ? (
            <p className="text-gray-400">No tienes citas próximas
              asignadas.</p>
          ) : (
            <div className="space-y-3">
              {citasAsignadas.map((cita) => (
                <div key={cita.id_cita} className="bg-gray-700 p-3 rounded-
                  md border border-gray-600">
                  <p className="text-lg font-semibold text-white mb-1">
                    <Clock size={16} className="inline-block mr-2 text-
                      green-200" />
                    {new Date(cita.fecha).toLocaleString('es-ES', {
                      dateStyle: 'medium', timeStyle: 'short' })} - {cita.motivo} ({cita.tipo ||
                      'N/A'})
                  </p>
                  <p className="text-gray-300 text-sm mb-1">
                    <PawPrint size={14} className="inline-block mr-2 text-
                      green-200" />
                    Mascota: <span className="font-
                      medium">{cita.mascota_nombre || cita.nombre_mascota_invitada || 'N/A'}
                      ({cita.mascota_especie || 'N/A'})</span>
                  </p>
                  <p className="text-gray-300 text-sm">
                    <UserIcon size={14} className="inline-block mr-2 text-
                      green-200" />
                    Cliente: <span className="font-
                      medium">{cita.cliente_nombre || cita.nombre_cliente_invitado || 'N/A'}
                      ({cita.cliente_telefono || 'N/A'})</span>
                  </p>
                  {cita.id_mascota && (
                    <Link
                      to={`/veterinario-dashboard/historial-clinico/${cita.id_mascota}`}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white
                        rounded-md hover:bg-indigo-700 transition duration-200 inline-flex items-
                        center shadow-md text-sm"
                    >
                      <Eye size={16} className="mr-2" /> Ver Historial
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
          <Link
            to="/veterinario-dashboard/gestionar-citas"
            className="mt-6 w-full flex items-center justify-center px-4 py-
              3 bg-green-700 text-white rounded-md hover:bg-green-600 transition shadow-md
              text-lg font-semibold"
          >
            Ver Todas Mis Citas
          </Link>
        </div>
        {/* Sección de Citas Nuevas / Sin Asignar (Dashboard) */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-
          gray-700">
          <h3 className="text-2xl text-yellow-300 mb-4 font-semibold flex
            items-center gap-2">
            <Clock size={24} /> Citas Nuevas / Sin Asignar
            ({citasSinAsignar.length})
          </h3>
          {citasSinAsignar.length === 0 ? (
            <p className="text-gray-400">No hay citas pendientes de
              asignación en este momento.</p>
          ) : (
            <div className="space-y-3">
              {citasSinAsignar.map((cita) => (
                <div key={cita.id_cita} className="bg-gray-700 p-3 rounded-
                  md border border-gray-600">
                  <p className="text-lg font-semibold text-white mb-1">
                    <Clock size={16} className="inline-block mr-2 text-
                      yellow-200" />
                    {new Date(cita.fecha).toLocaleString('es-ES', {
                      dateStyle: 'medium', timeStyle: 'short' })} - {cita.motivo} ({cita.tipo ||
                      'N/A'})
                  </p>
                  <p className="text-gray-300 text-sm mb-1">
                    <PawPrint size={14} className="inline-block mr-2 text-
                      yellow-200" />
                    Mascota: <span className="font-
                      medium">{cita.mascota_nombre || cita.nombre_mascota_invitada || 'N/A'}
                      ({cita.mascota_especie || 'N/A'})</span>
                  </p>
                  <p className="text-gray-300 text-sm">
                    <UserIcon size={14} className="inline-block mr-2 text-
                      yellow-200" />
                    Cliente: <span className="font-
                      medium">{cita.cliente_nombre || cita.nombre_cliente_invitado || 'N/A'}
                      ({cita.cliente_telefono || 'N/A'})</span>
                  </p>
                  <button
                    onClick={() => handleClaimCitaConfirmation(cita)}
                    className="mt-4 px-4 py-2 bg-green-600 text-white
                      rounded-md hover:bg-green-700 transition duration-200 inline-flex items-
                      center shadow-md text-sm"
                  >
                    <Check size={16} className="mr-2" /> Participar
                  </button>
                </div>
              ))}
            </div>
          )}
          <Link
            to="/veterinario-dashboard/gestionar-citas"
            className="mt-6 w-full flex items-center justify-center px-4 py-
              3 bg-yellow-700 text-white rounded-md hover:bg-yellow-600 transition shadow-
              md text-lg font-semibold"
          >
            Ver Todas las Citas Nuevas
          </Link>
        </div>
      </div>
      {/* Sección de Acciones Rápidas */}
      <section className="bg-gray-800 p-6 rounded-lg shadow-lg border
        border-gray-700">
        <h3 className="text-2xl text-green-300 mb-6 font-semibold flex
          items-center gap-2">
          <MessageSquare size={24} /> Acciones Rápidas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/veterinario-dashboard/gestionar-citas"
            className="flex items-center justify-center px-4 py-3 bg-indigo-
              600 text-white rounded-md hover:bg-indigo-700 transition shadow-md text-lg
              font-semibold transform hover:scale-105"
          >
            <CalendarCheck size={20} className="mr-2" /> Gestionar Citas
          </Link>
          <Link
            to="/veterinario-dashboard/gestionar-mascotas"
            className="flex items-center justify-center px-4 py-3 bg-purple-
              600 text-white rounded-md hover:bg-purple-700 transition shadow-md text-lg
              font-semibold transform hover:scale-105"
          >
            <PawPrint size={20} className="mr-2" /> Gestionar Mascotas
          </Link>
        </div>
      </section>

      {/* Modal de Confirmación para Asignar Cita */}
      <ConfirmationModal
        isOpen={showConfirmation}
        title="Confirmar Asignación de Cita"
        message={`¿Estás seguro de que quieres asignarte la cita para 
          ${citaToClaim?.mascota_nombre || citaToClaim?.nombre_mascota_invitada || 'la mascota'} 
          (${citaToClaim?.mascota_especie || 'N/A'}) el 
          ${citaToClaim?.fecha ? new Date(citaToClaim.fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }) : ''} a las 
          ${citaToClaim?.fecha ? new Date(citaToClaim.fecha).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          }) : ''}? Esta cita pasará a estado 'programada'.`}
        onConfirm={confirmClaimCita}
        onCancel={() => {
          setShowConfirmation(false);
          setCitaToClaim(null);
        }}
        confirmButtonText="Sí, Asignar Cita"
        cancelButtonText="No, Cancelar"
      />
    </div>
  );
};
export default VeterinarioHome;
