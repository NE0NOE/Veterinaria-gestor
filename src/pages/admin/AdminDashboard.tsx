import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

// Importar iconos de Lucide React para las estadísticas
import {
  Users, CalendarDays, PawPrint, MessageSquare, Stethoscope, UserCheck, Loader2, AlertCircle, XCircle,
  ClipboardList, TrendingDown, PackageX, Tag, Calendar, FlaskConical, Wrench, EyeOff
} from 'lucide-react';

// --- Definiciones de Tipos (Copias de InventarioPage para auto-contenido) ---
// Tipo para un medicamento del catálogo
interface Medicamento {
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

// Tipo para un suministro del catálogo
interface Suministro {
  id_suministro: number;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  unidad_medida: string | null;
}

// Tipo para un ítem del inventario_stock (raw data from DB)
interface InventarioItemRaw {
  id_stock: number;
  tipo_item: 'medicamento' | 'suministro';
  id_referencia_item: number; // FK a medicamentos.id_medicamento o suministro.id_suministro
  cantidad: number;
  ubicacion: string | null;
  ultima_actualizacion: string; // ISO string
  lote: string | null;
  fecha_caducidad_lote: string | null; // Date string
}

// Tipo extendido para la visualización en el frontend (combinado con catálogo info)
interface InventarioItem extends InventarioItemRaw {
  nombre_item: string;
  categoria_suministro?: string | null; // Solo para suministros
  unidad_display?: string | null; // Unidad de medida (de medicamento o suministro)
  vencimiento_display?: string | null; // Fecha de caducidad formateada
  precio_venta?: number | null; // Para medicamentos
}
// --- FIN Definiciones de Tipos ---

// Tipo para las citas pendientes, ajustado a tu esquema
type CitaPendienteDisplay = {
  id_cita: number;
  motivo: string;
  fecha: string;
  estado: string;
  nombre_mascota?: string; // Viene del join de mascotas
  nombre_cliente?: string; // Viene del lookup manual
  id_cliente?: number | null; // Necesario para la búsqueda manual
};

// Componente individual para cada tarjeta de estadística
const StatCard = ({ icon: Icon, label, value, onClick }: { icon: any; label: string; value: number | string; onClick?: () => void }) => (
  <div
    onClick={onClick}
    className="bg-gray-800 text-white rounded-lg p-6 border-l-4 border-indigo-700 flex items-center shadow-xl cursor-pointer
              transition-all duration-300 transform hover:scale-105 hover:bg-gray-700"
  >
    <div className="p-3 rounded-full mr-4 bg-indigo-600 bg-opacity-20 flex-shrink-0"> {/* Fondo más sutil para el icono */}
      <Icon className="w-8 h-8 text-indigo-400" /> {/* Icono más grande y color claro */}
    </div>
    <div>
      <p className="text-sm text-gray-300 font-medium">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClients: 0,
    totalPets: 0,
    totalVeterinarios: 0,
    totalAppointments: 0,
    pendingPublicAppointments: 0,
    confirmedTodayAppointments: 0,
  });
  const [pendingAppointmentsList, setPendingAppointmentsList] = useState<CitaPendienteDisplay[]>([]);
  
  // NUEVOS ESTADOS PARA ALERTAS DE INVENTARIO
  const [lowStockItems, setLowStockItems] = useState<InventarioItem[]>([]);
  const [outOfStockItems, setOutOfStockItems] = useState<InventarioItem[]>([]);
  const [expiredItems, setExpiredItems] = useState<InventarioItem[]>([]);
  const LOW_STOCK_THRESHOLD = 10; // Umbral para la alerta de stock bajo

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Función para obtener todos los datos de la dashboard
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch counts first, as they are independent
      const { count: usersCount, error: usersError } = await supabase.from('users').select('*', { count: 'exact', head: true });
      if (usersError) throw usersError;

      const { count: clientsCount, error: clientsError } = await supabase.from('clientes').select('*', { count: 'exact', head: true });
      if (clientsError) throw clientsError;
      
      const { data: clientsDataForMap, error: clientsDataError } = await supabase.from('clientes').select('id_cliente, nombre');
      if (clientsDataError) throw clientsDataError;
      const clientsMap = new Map(clientsDataForMap.map(client => [client.id_cliente, client.nombre]));

      const { count: petsCount, error: petsError } = await supabase.from('mascotas').select('*', { count: 'exact', head: true });
      if (petsError) throw petsError;

      const { count: vetsCount, error: vetsError } = await supabase.from('veterinarios').select('*', { count: 'exact', head: true });
      if (vetsError) throw vetsError;

      // Fetch all appointments count
      const { count: totalCitasCount, error: totalCitasError } = await supabase.from('citas').select('*', { count: 'exact', head: true });
      if (totalCitasError) throw totalCitasError;

      // Fetch pending public appointments count (from citas_publicas)
      const { count: pendingPublicCount, error: pendingPublicError } = await supabase
        .from('citas_publicas')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');
      if (pendingPublicError) throw pendingPublicError;

      // Fetch pending internal appointments (from citas where estado is 'Pendiente')
      // CAMBIOS AQUÍ: Eliminadas columnas de invitados para 'citas' internas
      const { data: pendingInternal, error: pendingInternalError } = await supabase
        .from('citas')
        .select(`
          id_cita,
          motivo,
          fecha,
          estado,
          id_cliente,      
          mascotas (nombre)
        `)
        .eq('estado', 'Pendiente') // Estado default en la tabla 'citas'
        .order('fecha', { ascending: true });
      if (pendingInternalError) throw pendingInternalError;

      const processedPendingInternal = pendingInternal.map((cita: any) => ({
        id_cita: cita.id_cita,
        motivo: cita.motivo,
        fecha: cita.fecha,
        estado: cita.estado,
        nombre_mascota: cita.mascotas?.nombre || 'Mascota Desconocida', // Solo toma de mascotas (relación)
        // CAMBIOS AQUÍ: Lookup de nombre_cliente solo desde clientsMap
        nombre_cliente: (cita.id_cliente ? clientsMap.get(cita.id_cliente) : null) || 'Cliente Desconocido',
      }));

      // Fetch confirmed appointments for today (from citas)
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

      const { count: confirmedTodayCount, error: confirmedTodayError } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'confirmada')
        .gte('fecha', startOfDay)
        .lte('fecha', endOfDay);
      if (confirmedTodayError) throw confirmedTodayError;

      // --- INICIO: Fetch de Datos de Inventario para Alertas ---
      const { data: medData, error: medErrorInventario } = await supabase.from('medicamentos').select('*');
      if (medErrorInventario) throw medErrorInventario;

      const { data: sumData, error: sumErrorInventario } = await supabase.from('suministros').select('*');
      if (sumErrorInventario) throw sumErrorInventario;

      const { data: invData, error: invErrorInventario } = await supabase.from('inventario_stock').select('*');
      if (invErrorInventario) throw invErrorInventario;

      // Procesar y combinar datos de inventario
      const linkedInventario: InventarioItem[] = invData.map(item => {
        let nombre_item: string = 'Desconocido';
        let categoria_suministro: string | null = null;
        let unidad_display: string | null = null;
        let vencimiento_display: string | null = null;
        let precio_venta: number | null = null;

        if (item.tipo_item === 'medicamento') {
          const med = medData.find(m => m.id_medicamento === item.id_referencia_item);
          if (med) {
            nombre_item = med.nombre_generico || med.nombre_comercial || 'Medicamento Desconocido';
            unidad_display = med.unidad_medida || null;
            precio_venta = med.precio_venta || null;
          } else {
            nombre_item = `Medicamento Desconocido (ID: ${item.id_referencia_item})`;
          }
          if (item.fecha_caducidad_lote) {
            vencimiento_display = new Date(item.fecha_caducidad_lote + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'numeric', day: 'numeric' });
          }
        } else if (item.tipo_item === 'suministro') {
          const sum = sumData.find(s => s.id_suministro === item.id_referencia_item);
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
          categoria_suministro,
          unidad_display,
          vencimiento_display,
          precio_venta,
        };
      });

      // Filtrar para alertas de stock
      const todayForExpired = new Date();
      todayForExpired.setHours(0, 0, 0, 0); // Reset time to compare only dates

      setLowStockItems(linkedInventario.filter(item => item.cantidad <= LOW_STOCK_THRESHOLD && item.cantidad > 0));
      setOutOfStockItems(linkedInventario.filter(item => item.cantidad === 0));
      setExpiredItems(linkedInventario.filter(item =>
        item.tipo_item === 'medicamento' &&
        item.fecha_caducidad_lote &&
        new Date(item.fecha_caducidad_lote + 'T00:00:00') < todayForExpired &&
        item.cantidad > 0
      ));
      // --- FIN: Fetch de Datos de Inventario para Alertas ---


      setStats({
        totalUsers: usersCount || 0,
        totalClients: clientsCount || 0,
        totalPets: petsCount || 0,
        totalVeterinarios: vetsCount || 0,
        totalAppointments: totalCitasCount || 0,
        pendingPublicAppointments: pendingPublicCount || 0,
        confirmedTodayAppointments: confirmedTodayCount || 0,
      });
      setPendingAppointmentsList(processedPendingInternal);

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err.message);
      setError('Error al cargar los datos de la dashboard: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Setup Realtime Listeners for all relevant tables
    // Users table
    const usersChannel = supabase
      .channel('dashboard_users_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        console.log('Realtime change for users received:', payload);
        fetchDashboardData();
      })
      .subscribe();

    // Clients table (needed to update client names if changed)
    const clientsChannel = supabase
      .channel('dashboard_clientes_changes') // Renamed channel for clarity
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, (payload) => {
        console.log('Realtime change for clients received:', payload);
        fetchDashboardData();
      })
      .subscribe();

    // Mascotas table
    const petsChannel = supabase
      .channel('dashboard_mascotas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mascotas' }, (payload) => {
        console.log('Realtime change for mascotas received:', payload);
        fetchDashboardData();
      })
      .subscribe();

    // Veterinarios table
    const vetsChannel = supabase
      .channel('dashboard_veterinarios_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'veterinarios' }, (payload) => {
        console.log('Realtime change for veterinarios received:', payload);
        fetchDashboardData();
      })
      .subscribe();

    // Citas table
    const citasChannel = supabase
      .channel('dashboard_citas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, (payload) => {
        console.log('Realtime change for citas received:', payload);
        fetchDashboardData();
      })
      .subscribe();

    // Citas_publicas table
    const citasPublicasChannel = supabase
      .channel('dashboard_citas_publicas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas_publicas' }, (payload) => {
        console.log('Realtime change for citas_publicas received:', payload);
        fetchDashboardData();
      })
      .subscribe();

    // NUEVOS LISTENERS PARA INVENTARIO
    const inventarioChannel = supabase
      .channel('dashboard_inventario_stock_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario_stock' }, () => {
        console.log('Realtime change for inventario_stock received in dashboard.');
        fetchDashboardData();
      })
      .subscribe();

    const medicamentosChannel = supabase
      .channel('dashboard_medicamentos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicamentos' }, () => {
        console.log('Realtime change for medicamentos received in dashboard.');
        fetchDashboardData();
      })
      .subscribe();

    const suministrosChannel = supabase
      .channel('dashboard_suministros_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suministros' }, () => {
        console.log('Realtime change for suministros received in dashboard.');
        fetchDashboardData();
      })
      .subscribe();


    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(petsChannel);
      supabase.removeChannel(vetsChannel);
      supabase.removeChannel(citasChannel);
      supabase.removeChannel(citasPublicasChannel);
      // LIMPIEZA DE NUEVOS LISTENERS
      supabase.removeChannel(inventarioChannel);
      supabase.removeChannel(medicamentosChannel);
      supabase.removeChannel(suministrosChannel);
      console.log('Unsubscribed from all dashboard channels.');
    };
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-gray-950 text-white">
        <Loader2 className="animate-spin mr-3 text-blue-400" size={36} />
        <p className="text-xl text-blue-400">Cargando datos de la dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-950 text-white min-h-screen font-inter">
      {error && (
        <div className="bg-red-800 text-red-100 p-4 rounded-lg text-center border border-red-600 mb-6 flex items-center justify-between shadow-md animate-fade-in">
          <AlertCircle size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">{error}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setError(null)} />
        </div>
      )}

      {/* Grid de StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Users} label="Total Usuarios Registrados" value={stats.totalUsers} onClick={() => navigate('/admin-dashboard/ver-usuarios')} />
        <StatCard icon={UserCheck} label="Total Clientes" value={stats.totalClients} onClick={() => navigate('/admin-dashboard/ver-usuarios')} /> {/* Asumiendo 'ver-usuarios' también muestra clientes */}
        <StatCard icon={PawPrint} label="Total Mascotas" value={stats.totalPets} onClick={() => navigate('/admin-dashboard/gestion-mascotas')} />
        <StatCard icon={Stethoscope} label="Total Veterinarios" value={stats.totalVeterinarios} onClick={() => navigate('/admin-dashboard/ver-usuarios')} /> {/* Asumiendo 'ver-usuarios' también muestra veterinarios */}
        <StatCard icon={CalendarDays} label="Total Citas Agendadas" value={stats.totalAppointments} onClick={() => navigate('/admin-dashboard/admin-citas-module')} />
        <StatCard icon={MessageSquare} label="Solicitudes Citas Web (Pendientes)" value={stats.pendingPublicAppointments} onClick={() => navigate('/admin-dashboard/admin-citas-module')} />
        <StatCard icon={CalendarDays} label="Citas Confirmadas Hoy" value={stats.confirmedTodayAppointments} onClick={() => navigate('/admin-dashboard/admin-citas-module')} />
      </div>

      {/* NUEVA SECCIÓN: Alertas de Inventario en el Dashboard */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0 || expiredItems.length > 0) && (
        <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-yellow-700 mb-8">
          <h2 className="text-2xl font-bold text-yellow-400 mb-5 flex items-center gap-3">
            <ClipboardList size={24} /> Alertas de Inventario
          </h2>
          {lowStockItems.length > 0 && (
            <div className="bg-yellow-800/20 text-yellow-100 p-4 rounded-lg border border-yellow-600 mb-4 animate-fade-in">
              <h4 className="font-semibold text-lg mb-3 flex items-center text-yellow-300">
                <TrendingDown size={20} className="mr-2" /> Stock Bajo (menos de {LOW_STOCK_THRESHOLD} unidades)
              </h4>
              <ul className="list-none space-y-2">
                {lowStockItems.map(item => (
                  <li key={item.id_stock} className="flex items-center text-sm bg-yellow-900/30 p-2 rounded-md border border-yellow-700/50 cursor-pointer hover:bg-yellow-800/40 transition-colors"
                      onClick={() => navigate('/admin-dashboard/inventario')}>
                    <AlertCircle size={16} className="flex-shrink-0 text-yellow-300 mr-2" />
                    <span className="font-medium mr-1">{item.nombre_item} ({item.tipo_item === 'medicamento' ? 'Medicamento' : 'Suministro'}):</span>
                    <span className="text-yellow-100">{item.cantidad} unidades restantes en {item.ubicacion}.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {outOfStockItems.length > 0 && (
            <div className="bg-red-800/20 text-red-100 p-4 rounded-lg border border-red-600 mb-4 animate-fade-in">
              <h4 className="font-semibold text-lg mb-3 flex items-center text-red-300">
                <PackageX size={20} className="mr-2" /> Sin Stock (0 unidades)
              </h4>
              <ul className="list-none space-y-2">
                {outOfStockItems.map(item => (
                  <li key={item.id_stock} className="flex items-center text-sm bg-red-900/30 p-2 rounded-md border border-red-700/50 cursor-pointer hover:bg-red-800/40 transition-colors"
                      onClick={() => navigate('/admin-dashboard/inventario')}>
                    <EyeOff size={16} className="flex-shrink-0 text-red-300 mr-2" />
                    <span className="font-medium mr-1">{item.nombre_item} ({item.tipo_item === 'medicamento' ? 'Medicamento' : 'Suministro'}):</span>
                    <span className="text-red-100">Agotado en {item.ubicacion}.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {expiredItems.length > 0 && (
            <div className="bg-orange-800/20 text-orange-100 p-4 rounded-lg border border-orange-600 animate-fade-in">
              <h4 className="font-semibold text-lg mb-3 flex items-center text-orange-300">
                <Calendar size={20} className="mr-2" /> Lotes de Medicamentos Vencidos
              </h4>
              <ul className="list-none space-y-2">
                {expiredItems.map(item => (
                  <li key={item.id_stock} className="flex items-center text-sm bg-orange-900/30 p-2 rounded-md border border-orange-700/50 cursor-pointer hover:bg-orange-800/40 transition-colors"
                      onClick={() => navigate('/admin-dashboard/inventario')}>
                    <AlertCircle size={16} className="flex-shrink-0 text-orange-300 mr-2" />
                    <span className="font-medium mr-1">{item.nombre_item}:</span>
                    <span className="text-orange-100">Lote {item.lote || 'N/A'} vencido en {item.vencimiento_display || 'fecha desconocida'} ({item.cantidad} unidades).</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {/* FIN NUEVA SECCIÓN */}

      {/* Sección de Citas Pendientes de Aprobación (Internas) */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800">
        <h2 className="text-2xl font-bold text-indigo-400 mb-5 flex items-center gap-3">
          <CalendarDays size={24} /> Citas Pendientes de Aprobación (Internas)
        </h2>
        {pendingAppointmentsList.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No hay citas internas pendientes de aprobación.</p>
        ) : (
          <ul className="space-y-4">
            {pendingAppointmentsList.map((cita) => (
              <li key={cita.id_cita} className="bg-gray-800 p-4 rounded-md border border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <p className="font-semibold text-white text-lg">{cita.motivo}</p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Para:</span> {cita.nombre_mascota || 'Mascota Desconocida'} del cliente {cita.nombre_cliente || 'Cliente Desconocido'}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Fecha:</span> {new Date(cita.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} a las {new Date(cita.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="mt-3 md:mt-0">
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-600 text-white">
                    {cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1)}
                  </span>
                  <button
                    onClick={() => navigate(`/admin-dashboard/admin-citas-module`)} // Navegar al módulo de gestión de citas
                    className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors shadow-md"
                  >
                    Gestionar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
