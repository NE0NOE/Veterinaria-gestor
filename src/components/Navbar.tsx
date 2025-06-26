import { ArrowRight, CalendarPlus, PawPrint, Menu, X } from 'lucide-react'; // Importamos Menu y X para el menú hamburguesa
import { Link } from 'react-router-dom';
import React, { useState } from 'react'; // Importamos useState para el estado del menú

// Define la interfaz de props para tu Navbar.
interface NavbarProps {
  className?: string; // 'className' es opcional y de tipo string
}

// Modifica la función del componente para que acepte las props.
export function Navbar({ className }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false); // Estado para controlar si el menú móvil está abierto

  // Función para alternar el estado del menú móvil
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 bg-gray-950 shadow-lg z-50 text-white ${className || ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo/Título de la aplicación */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center space-x-2"> {/* Envolver en Link para ir a la landing */}
              <PawPrint className="h-7 w-7 text-indigo-400" /> {/* Icono de huella */}
              <h1 className="text-xl sm:text-2xl font-bold text-indigo-400 hover:text-indigo-300 transition-colors duration-200">
                Max's Groomer
              </h1>
            </Link>
          </div>

          {/* Botones de navegación para pantallas grandes (ocultos en móviles) */}
          <div className="hidden md:flex space-x-4 items-center"> {/* 'hidden' por defecto, 'md:flex' para pantallas medianas y grandes */}
            {/* Botón Login */}
            <Link 
              to="/login" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-300 shadow-md"
            >
              <ArrowRight className="mr-2 h-5 w-5" />
              Login
            </Link>

            {/* Botón Agendar */}
            <Link 
              to="/create-appointment" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-indigo-800 hover:bg-indigo-700 transition-all duration-300 shadow-md"
            >
              <CalendarPlus className="mr-2 h-5 w-5" />
              Agendar
            </Link>

          </div>

          {/* Botón de menú hamburguesa para móviles (visible solo en móviles) */}
          <div className="md:hidden flex items-center"> {/* 'md:hidden' para ocultar en pantallas medianas y grandes */}
            <button
              onClick={toggleMenu}
              type="button"
              className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white p-2 rounded-md transition-colors duration-200"
              aria-controls="mobile-menu"
              aria-expanded={isOpen ? "true" : "false"}
            >
              <span className="sr-only">Abrir menú principal</span>
              {isOpen ? (
                <X className="block h-7 w-7" aria-hidden="true" /> // Icono de cerrar (X)
              ) : (
                <Menu className="block h-7 w-7" aria-hidden="true" /> // Icono de menú (hamburguesa)
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menú desplegable para móviles (visible solo cuando isOpen es true) */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'}`} id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-2 sm:px-3 bg-gray-900 border-t border-gray-800">
          <Link
            to="/login"
            className="block px-3 py-2 rounded-md text-base font-medium text-white bg-indigo-700 hover:bg-indigo-600 transition-colors duration-200 flex items-center"
            onClick={toggleMenu} // Cierra el menú al hacer clic
          >
            <ArrowRight className="mr-2 h-5 w-5" />
            Login
          </Link>
          <Link
            to="/create-appointment"
            className="block px-3 py-2 rounded-md text-base font-medium text-white bg-indigo-800 hover:bg-indigo-700 transition-colors duration-200 flex items-center"
            onClick={toggleMenu} // Cierra el menú al hacer clic
          >
            <CalendarPlus className="mr-2 h-5 w-5" />
            Agendar
          </Link>

        </div>
      </div>
    </nav>
  );
}
