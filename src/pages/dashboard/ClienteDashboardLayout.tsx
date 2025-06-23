import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient'; // Asegúrate de que esta ruta sea correcta
// Importar los iconos de lucide-react
import { Home as HomeIcon, CalendarDays, PawPrint, LogOut } from 'lucide-react'; // Quitamos FileText si no se usa aquí
import imagenHero from '../../assets/maxi.jpg'; // Asegúrate de que esta ruta sea correcta

const ClienteDashboardLayout = () => {
  const navigate = useNavigate();

  // Handler para cerrar la sesión del usuario y redirigir a la LandingPage
  const handleLogoutAndGoToLanding = async () => {
    if (!window.confirm('¿Estás seguro de que quieres cerrar tu sesión y regresar a la página principal?')) {
      return; // Si el usuario cancela, no hacemos nada
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error al cerrar sesión:', error.message);
      // Usar un modal personalizado en lugar de alert en un entorno de producción
      alert('Error al cerrar sesión: ' + error.message);
    } else {
      // Redirigir a la LandingPage (ruta '/') después de cerrar sesión
      navigate('/'); 
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      {/* Sidebar - Ahora con flex-col y justify-between para empujar el logout al final */}
      <aside className="w-64 bg-gray-800 text-white flex flex-col justify-between p-6 shadow-lg border-r border-gray-700">
        <div>
          {/* Título de la Aplicación - Ahora es un elemento clickeable que cierra sesión */}
          <div
            onClick={handleLogoutAndGoToLanding} // Llama a la función de cerrar sesión y navegar
            className="cursor-pointer block text-3xl font-extrabold tracking-tight mb-10 text-indigo-400 hover:text-indigo-300 transition-colors duration-200"
            role="button" // Semántica para accesibilidad, indica que es interactivo
            aria-label="Regresar a la página principal y cerrar sesión"
          >
            Max's Groomer
          </div>
          
          {/* Enlaces de Navegación con iconos */}
          <nav className="flex flex-col gap-3 text-lg">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `flex items-center p-3 rounded-md transition-colors duration-200 ease-in-out ${
                  isActive
                    ? 'bg-indigo-700 text-white shadow-inner font-semibold'
                    : 'hover:bg-gray-700 text-gray-300'
                }`
              }
            >
              <HomeIcon size={20} className="mr-3" />
              Inicio
            </NavLink>
            <NavLink
              to="/dashboard/citas"
              className={({ isActive }) =>
                `flex items-center p-3 rounded-md transition-colors duration-200 ease-in-out ${
                  isActive
                    ? 'bg-indigo-700 text-white shadow-inner font-semibold'
                    : 'hover:bg-gray-700 text-gray-300'
                }`
              }
            >
              <CalendarDays size={20} className="mr-3" />
              Citas
            </NavLink>
            <NavLink
              to="/dashboard/mascotas"
              className={({ isActive }) =>
                `flex items-center p-3 rounded-md transition-colors duration-200 ease-in-out ${
                  isActive
                    ? 'bg-indigo-700 text-white shadow-inner font-semibold'
                    : 'hover:bg-gray-700 text-gray-300'
                }`
              }
            >
              <PawPrint size={20} className="mr-3" />
              Mascotas
            </NavLink>
          </nav>
        </div>

        {/* Botón de Cerrar Sesión - Ahora ambos botones llaman la misma función */}
        <div className="mt-auto pt-6 border-t border-gray-700">
          <button
            onClick={handleLogoutAndGoToLanding} // Llama a la misma función
            className="flex items-center w-full p-3 rounded-md text-red-400 hover:bg-red-500 hover:text-white transition-colors duration-200 ease-in-out font-semibold shadow-sm"
          >
            <LogOut size={20} className="mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
        {/* Sección de Héroe con imagen y texto */}
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

        {/* Área donde se renderizan las rutas anidadas */}
        <main className="flex-1 bg-gray-900 text-white p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ClienteDashboardLayout;
