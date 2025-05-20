import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import imagenHero from '../../assets/maxi.jpg';

const ClienteDashboardLayout = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col justify-between p-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-10 text-indigo-400">Max's Groomer</h1>
          <nav className="flex flex-col gap-4 text-lg">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                isActive
                  ? 'font-semibold text-indigo-300'
                  : 'hover:text-indigo-300 transition-all'
              }
            >
              Inicio
            </NavLink>
            <NavLink
              to="/dashboard/citas"
              className={({ isActive }) =>
                isActive
                  ? 'font-semibold text-indigo-300'
                  : 'hover:text-indigo-300 transition-all'
              }
            >
              Citas
            </NavLink>
            <NavLink
              to="/dashboard/mascotas"
              className={({ isActive }) =>
                isActive
                  ? 'font-semibold text-indigo-300'
                  : 'hover:text-indigo-300 transition-all'
              }
            >
              Mascotas
            </NavLink>
          </nav>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="text-sm text-gray-300 hover:text-red-400 font-medium mt-6 transition-all"
        >
          Cerrar sesión
        </button>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
        <section
          className="relative h-56 text-white flex items-center justify-center text-center"
          style={{
            backgroundImage: `url(${imagenHero})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50" />
          <div className="relative z-10 px-4">
            <h2 className="text-4xl font-bold mb-2">Bienvenidos a Max's Groomer</h2>
            <p className="text-lg text-gray-200">Tu clínica veterinaria de confianza en Rivas</p>
          </div>
        </section>

        <main className="flex-1 bg-black text-white p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ClienteDashboardLayout;
