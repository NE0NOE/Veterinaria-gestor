import React from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'; // Asegúrate de importar Link

import { supabase } from '../../supabaseClient'; // Asegúrate de que la ruta sea correcta

import imagenHero from '../../assets/maxi.jpg'; // Reutiliza tu imagen

import { LogOut, Home as HomeIcon, Calendar, PawPrint, Clock } from 'lucide-react'; // Eliminado Package

const VeterinarioDashboardLayout: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login'); // Redirige al login después de cerrar sesión
  };

  return (
    <div className="flex min-h-screen bg-black text-white font-inter">
      {/* Sidebar para el Veterinario */}
      <aside className="w-64 bg-gray-900 p-6 flex flex-col justify-between shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-green-400 mb-8">Panel Veterinario</h1>
          <nav className="flex flex-col gap-4 text-lg">
            <NavLink
              to="/veterinario-dashboard"
              end // Asegura que solo esté activo en la ruta exacta /veterinario-dashboard
              className={({ isActive }) =>
                isActive
                  ? 'text-green-300 font-semibold flex items-center p-2 rounded-md bg-gray-800'
                  : 'hover:text-green-300 flex items-center p-2 rounded-md hover:bg-gray-800 transition-colors'
              }
            >
              <HomeIcon className="mr-3" size={20} /> Dashboard
            </NavLink>
            <NavLink
              to="/veterinario-dashboard/gestionar-citas"
              className={({ isActive }) =>
                isActive
                  ? 'text-green-300 font-semibold flex items-center p-2 rounded-md bg-gray-800'
                  : 'hover:text-green-300 flex items-center p-2 rounded-md hover:bg-gray-800 transition-colors'
              }
            >
              <Calendar className="mr-3" size={20} /> Gestionar Citas
            </NavLink>
            <NavLink
              to="/veterinario-dashboard/gestionar-mascotas"
              className={({ isActive }) =>
                isActive
                  ? 'text-green-300 font-semibold flex items-center p-2 rounded-md bg-gray-800'
                  : 'hover:text-green-300 flex items-center p-2 rounded-md hover:bg-gray-800 transition-colors'
              }
            >
              <PawPrint className="mr-3" size={20} /> Gestionar Mascotas
            </NavLink>
            {/* Esta ruta ya no será para el historial general de edición, sino que se accederá desde cada mascota */}
            {/* Si tienes una sección de inventario para el veterinario, podrías añadirla aquí */}
            {/* ELIMINADO: NavLink a Inventario */}
          </nav>
        </div>
        {/* ELIMINADO: Botón de Cerrar Sesión movido al Header Superior */}
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
        {/* Nuevo Header Superior */}
        <header
          className="relative h-24 text-white flex items-center justify-between px-8 py-4"
          style={{
            backgroundImage: `url(${imagenHero})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay para oscurecer y desaturar la imagen de fondo */}
          <div className="absolute inset-0 bg-black bg-opacity-60 grayscale" />

          <div className="relative z-10 flex items-center justify-between w-full">
            {/* Título Max Groomer que lleva a la landing page */}
            <Link to="/" className="text-3xl font-extrabold text-green-400 hover:text-green-300 transition-colors cursor-pointer">
              Max Groomer
            </Link>

            {/* Botón de Cerrar Sesión */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-md flex items-center font-semibold"
            >
              <LogOut className="mr-2" size={18} /> Cerrar Sesión
            </button>
          </div>
        </header>

        {/* Contenido de las rutas hijas */}
        <main className="flex-1 bg-black text-white p-6">
          <Outlet /> {/* Aquí se renderizarán las rutas anidadas */}
        </main>
      </div>
    </div>
  );
};

export default VeterinarioDashboardLayout;
