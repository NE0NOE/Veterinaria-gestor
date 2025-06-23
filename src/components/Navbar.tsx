import { ArrowRight, CalendarPlus, PawPrint } from 'lucide-react';
import { Link } from 'react-router-dom';
import React from 'react'; // Asegurarse de que React esté importado

// 1. Define la interfaz de props para tu Navbar.
// Esto le dice a TypeScript que tu componente puede recibir una prop 'className'.
interface NavbarProps {
  className?: string; // 'className' es opcional y de tipo string
}

// 2. Modifica la función del componente para que acepte las props.
// Desestructuramos 'className' de las props que el componente recibe.
export function Navbar({ className }: NavbarProps) {
  return (
    // 3. Aplica la prop 'className' al elemento HTML principal de tu Navbar.
    // Combinamos tus clases existentes con la 'className' pasada,
    // y usamos 'className || '' ' para manejar el caso en que no se pase 'className'.
    <nav className={`fixed top-0 left-0 right-0 bg-gray-950 shadow-md z-10 text-white ${className || ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            {/* Puedes envolver el h1 en un Link si quieres que te lleve a la landing al hacer clic */}
            <h1 className="text-xl font-bold text-indigo-400">Max's Groomer</h1>
          </div>
          <div className="flex space-x-4">
            {/* Botón Login */}
            <Link 
              to="/login" 
              className="inline-flex items-center px-5 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-300"
            >
              <ArrowRight className="mr-2 h-5 w-5" />
              Login
            </Link>

            {/* Botón Agendar */}
            <Link 
              to="/create-appointment" 
              className="inline-flex items-center px-5 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-indigo-800 hover:bg-indigo-700 transition-all duration-300"
            >
              <CalendarPlus className="mr-2 h-5 w-5" />
              Agendar
            </Link>

            {/* Botón Nutrición de tu mascota */}
            <Link 
              to="/calculadora-alimentos" 
              className="inline-flex items-center px-5 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-red-600 hover:bg-red-700 transition-all duration-300"
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
