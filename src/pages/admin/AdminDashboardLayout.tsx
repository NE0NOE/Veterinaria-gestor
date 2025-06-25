import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext'; 

// Importar iconos de Lucide React para el sidebar y las métricas
import {
  LogOut, LayoutDashboard, UserPlus, Users, CalendarDays, Package, Truck, FileText, PawPrint, MessageSquare, Stethoscope, Loader2 // 'HomeIcon' eliminado, 'Stethoscope' añadido, 'Loader2' añadido
} from 'lucide-react'; 

import imagenHero from '../../assets/maxi.jpg'; // Imagen de fondo para el hero

const AdminDashboardLayout = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth(); 
  const [adminName, setAdminName] = useState<string>('Administrador');
  const [metrics, setMetrics] = useState({
    pendingPublicAppointments: 0,
    totalClients: 0,
    totalPets: 0,
    totalVeterinarios: 0,
    totalCitasConfirmadasHoy: 0,
  });
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  // Handler para cerrar la sesión del usuario y redirigir a la LandingPage
  const handleLogoutAndGoToLanding = async () => {
    if (!window.confirm('¿Estás seguro de que quieres cerrar tu sesión y regresar a la página principal?')) {
      return; 
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error al cerrar sesión:', error.message);
      // En un entorno de producción, aquí usarías un modal personalizado
      // alert('Error al cerrar sesión: ' + error.message); 
    } else {
      navigate('/'); 
    }
  };


  // Función para obtener el nombre del administrador y las métricas
  const fetchAdminDataAndMetrics = useCallback(async () => {
    if (authLoading || !user) {
      setIsLoadingMetrics(false);
      return;
    }

    setIsLoadingMetrics(true);
    try {
      // Obtener el nombre del usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('nombre')
        .eq('id_user', user.id)
        .single();

      if (userError && userError.code !== 'PGRST116') { 
        console.error('Error al obtener el nombre del usuario:', userError.message);
      } else if (userData) {
        setAdminName(userData.nombre || 'Administrador');
      }

      // 1. Citas públicas pendientes
      const { count: pendingPublic, error: publicError } = await supabase
        .from('citas_publicas')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');
      if (publicError) throw publicError;

      // 2. Total de clientes
      const { count: totalClients, error: clientsError } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });
      if (clientsError) throw clientsError;

      // 3. Total de mascotas
      const { count: totalPets, error: petsError } = await supabase
        .from('mascotas')
        .select('*', { count: 'exact', head: true });
      if (petsError) throw petsError;

      // 4. Total de veterinarios
      const { count: totalVeterinarios, error: vetsError } = await supabase
        .from('veterinarios')
        .select('*', { count: 'exact', head: true });
      if (vetsError) throw vetsError;

      // 5. Citas confirmadas para hoy
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

      const { count: confirmedToday, error: confirmedTodayError } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'confirmada')
        .gte('fecha', startOfDay)
        .lte('fecha', endOfDay);
      if (confirmedTodayError) throw confirmedTodayError;


      setMetrics({
        pendingPublicAppointments: pendingPublic || 0,
        totalClients: totalClients || 0,
        totalPets: totalPets || 0,
        totalVeterinarios: totalVeterinarios || 0,
        totalCitasConfirmadasHoy: confirmedToday || 0,
      });

    } catch (error: any) {
      console.error('Error al cargar datos del admin o métricas:', error.message);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    fetchAdminDataAndMetrics();

  }, [fetchAdminDataAndMetrics]);


  return (
    <div className="flex min-h-screen bg-gray-950 text-white font-inter">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 p-6 flex flex-col justify-between shadow-lg border-r border-gray-800">
        <div>
          {/* Título de la Aplicación - Ahora clickeable para cerrar sesión y navegar a Home */}
          <div
            onClick={handleLogoutAndGoToLanding}
            className="cursor-pointer block text-3xl font-extrabold tracking-tight mb-10 text-blue-400 hover:text-blue-300 transition-colors duration-200"
            role="button"
            aria-label="Regresar a la página principal y cerrar sesión"
          >
            Max's Groomer
          </div>
          <nav className="flex flex-col gap-3 text-lg"> {/* Cambiado gap-4 a gap-3 */}
            <NavLink
              to="/admin-dashboard"
              end
              className={({ isActive }) =>
                `flex items-center p-3 rounded-md transition-colors duration-200 ease-in-out 
                ${isActive ? 'bg-indigo-700 text-white shadow-inner font-semibold' : 'hover:bg-gray-800 text-gray-300'}`
              }
            >
              <LayoutDashboard size={20} className="mr-3" /> Panel
            </NavLink>

            <NavLink
              to="/admin-dashboard/ver-usuarios"
              className={({ isActive }) =>
                `flex items-center p-3 rounded-md transition-colors duration-200 ease-in-out 
                ${isActive ? 'bg-indigo-700 text-white shadow-inner font-semibold' : 'hover:bg-gray-800 text-gray-300'}`
              }
            >
              <UserPlus size={20} className="mr-3" /> Gestion de empleados
            </NavLink>

    
            <NavLink
              to="/admin-dashboard/admin-citas-module" 
              className={({ isActive }) =>
                `flex items-center p-3 rounded-md transition-colors duration-200 ease-in-out 
                ${isActive ? 'bg-indigo-700 text-white shadow-inner font-semibold' : 'hover:bg-gray-800 text-gray-300'}`
              }
            >
              <CalendarDays size={20} className="mr-3" /> Gestión de Citas
            </NavLink>
            
            <NavLink
              to="/admin-dashboard/gestion-mascotas"
              className={({ isActive }) =>
                `flex items-center p-3 rounded-md transition-colors duration-200 ease-in-out 
                ${isActive ? 'bg-indigo-700 text-white shadow-inner font-semibold' : 'hover:bg-gray-800 text-gray-300'}`
              }
            >
              <PawPrint size={20} className="mr-3" /> Gestión de Mascotas
            </NavLink>

            <NavLink
              to="/admin-dashboard/inventario"
              className={({ isActive }) =>
                `flex items-center p-3 rounded-md transition-colors duration-200 ease-in-out 
                ${isActive ? 'bg-indigo-700 text-white shadow-inner font-semibold' : 'hover:bg-gray-800 text-gray-300'}`
              }
            >
              <Package size={20} className="mr-3" /> Inventario
            </NavLink>

            <NavLink
              to="/admin-dashboard/proveedores-compras"
              className={({ isActive }) =>
                `flex items-center p-3 rounded-md transition-colors duration-200 ease-in-out 
                ${isActive ? 'bg-indigo-700 text-white shadow-inner font-semibold' : 'hover:bg-gray-800 text-gray-300'}`
              }
            >
              <Truck size={20} className="mr-3" /> Proveedores
            </NavLink>

            <NavLink
              to="/admin-dashboard/historial-clinico"
              className={({ isActive }) =>
                `flex items-center p-3 rounded-md transition-colors duration-200 ease-in-out 
                ${isActive ? 'bg-indigo-700 text-white shadow-inner font-semibold' : 'hover:bg-gray-800 text-gray-300'}`
              }
            >
              <FileText size={20} className="mr-3" /> Historial Clínico
            </NavLink> 
          </nav>
        </div>

        {/* Botón de Cerrar Sesión - Ahora ambos botones llaman la misma función */}
        <div className="mt-auto pt-6 border-t border-gray-700">
          <button
            onClick={handleLogoutAndGoToLanding}
            className="flex items-center w-full p-3 rounded-md text-red-400 hover:bg-red-500 hover:text-white transition-colors duration-200 ease-in-out font-semibold shadow-sm"
          >
            <LogOut size={20} className="mr-3" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
        {/* Hero header */}
        <section
          className="relative h-64 text-white flex flex-col items-center justify-center text-center p-6"
          style={{
            backgroundImage: `url(${imagenHero})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-60" />
          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-2 drop-shadow-lg">¡Hola, {adminName}!</h2>
            <p className="text-lg text-gray-200 drop-shadow">Bienvenido al Panel Administrativo de Max's Groomer</p>
          </div>
        </section>

        {/* Sección de Métricas */}
        <section className="bg-gray-950 p-6 -mt-8 relative z-20"> 
          {isLoadingMetrics ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin mr-2 text-blue-400" size={28} />
              <p className="text-xl text-blue-400">Cargando métricas...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6"> 
              {/* Tarjeta de Citas Públicas Pendientes */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-xl border border-blue-700 flex items-center justify-between transition-transform transform hover:scale-105">
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-1">Solicitudes Pendientes</h3>
                  <p className="text-4xl font-bold text-yellow-400">{metrics.pendingPublicAppointments}</p>
                </div>
                <MessageSquare size={48} className="text-yellow-600 opacity-30" />
              </div>

              {/* Tarjeta de Citas Confirmadas Hoy */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-xl border border-blue-700 flex items-center justify-between transition-transform transform hover:scale-105">
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-1">Citas Confirmadas Hoy</h3>
                  <p className="text-4xl font-bold text-green-400">{metrics.totalCitasConfirmadasHoy}</p>
                </div>
                <CalendarDays size={48} className="text-green-600 opacity-30" />
              </div>

              {/* Tarjeta de Total de Clientes */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-xl border border-blue-700 flex items-center justify-between transition-transform transform hover:scale-105">
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-1">Total Clientes</h3>
                  <p className="text-4xl font-bold text-blue-400">{metrics.totalClients}</p>
                </div>
                <Users size={48} className="text-blue-600 opacity-30" />
              </div>

              {/* Tarjeta de Total de Mascotas */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-xl border border-blue-700 flex items-center justify-between transition-transform transform hover:scale-105">
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-1">Total Mascotas</h3>
                  <p className="text-4xl font-bold text-purple-400">{metrics.totalPets}</p>
                </div>
                <PawPrint size={48} className="text-purple-600 opacity-30" />
              </div>
              
              {/* Tarjeta de Total de Veterinarios */}
              <div className="bg-gray-800 p-5 rounded-lg shadow-xl border border-blue-700 flex items-center justify-between transition-transform transform hover:scale-105">
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-1">Total Veterinarios</h3>
                  <p className="text-4xl font-bold text-teal-400">{metrics.totalVeterinarios}</p>
                </div>
                <Stethoscope size={48} className="text-teal-600 opacity-30" />
              </div>
            </div>
          )}
        </section>

        {/* Rutas hijas */}
        <main className="flex-1 bg-gray-950 text-white p-6 pt-0"> 
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardLayout;
