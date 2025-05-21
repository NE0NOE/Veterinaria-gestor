import { ArrowRight, CalendarPlus, PawPrint } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            {/* Aquí puedes poner un logo si tienes */}
          </div>
          <div className="flex space-x-6">
            {/* Botón Login */}
            <Link 
              to="/login" 
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all duration-300"
            >
              <ArrowRight className="mr-2 h-5 w-5" />
              Login
            </Link>

            {/* Botón Agendar */}
            <Link 
              to="/create-appointment" 
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-full text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:text-indigo-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all duration-300"
            >
              <CalendarPlus className="mr-2 h-5 w-5" />
              Agendar
            </Link>

            {/* Botón Nutrición de tu mascota */}
            <Link 
              to="/calculadora-alimentos" 
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-full text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-all duration-300"
            >
              <PawPrint className="mr-2 h-5 w-5" />
              Nutrición de tu mascota
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
