import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as patientService from '../services/patientService';
import { Patient } from '../types';
import { PawPrint } from 'lucide-react'; // Icono para mascotas

const Pets: React.FC = () => {
  const { user } = useAuth();
  const [myPets, setMyPets] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'client' && user.username) {
      setIsLoading(true);
      setError(null);
      try {
        const allPatients = patientService.getAllPatients();
        // Filtra los pacientes cuyo ownerName coincide con el username del cliente
        const filteredPets = allPatients.filter(
          (patient) => patient.ownerName.toLowerCase() === user.username.toLowerCase()
        );
        setMyPets(filteredPets);
      } catch (err) {
        console.error("Error fetching pets for client:", err);
        setError("No se pudo cargar la lista de mascotas.");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Si no es cliente o no hay username, no cargar mascotas
      setIsLoading(false);
      setMyPets([]); // Asegura que la lista esté vacía si no es cliente
    }
  }, [user]); // Recargar si el usuario cambia

  // Formateador de fecha simple (igual que en Patients.tsx)
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(Date.UTC(year, month, day));
        if (isNaN(date.getTime())) return 'Fecha inválida';
        return date.toLocaleDateString('es-ES', {
          year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC'
        });
      }
      return 'Formato inválido';
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  // Si no es un cliente, mostrar un mensaje indicativo
  if (user?.role !== 'client') {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Mis Mascotas</h1>
        <p className="text-gray-600">Esta sección es exclusiva para clientes.</p>
        {/* Podrías redirigir al login o al dashboard si prefieres */}
      </div>
    );
  }

  // Vista para el cliente logueado
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Mis Mascotas</h1>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      {isLoading ? (
        <p className="text-center text-gray-500">Cargando tus mascotas...</p>
      ) : myPets.length === 0 ? (
        <div className="text-center p-6 bg-white rounded shadow">
          <PawPrint size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Aún no tienes mascotas registradas en nuestra clínica.</p>
          <p className="text-sm text-gray-500 mt-2">Contacta con nosotros para añadir a tu compañero.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myPets.map((pet) => (
            <div key={pet.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
              <div className="p-5">
                <div className="flex items-center mb-3">
                   <PawPrint className="text-indigo-500 mr-3" size={24} />
                   <h2 className="text-xl font-semibold text-gray-800">{pet.name}</h2>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong className="font-medium text-gray-700">Especie:</strong> {pet.species}</p>
                  <p><strong className="font-medium text-gray-700">Raza:</strong> {pet.breed}</p>
                  <p><strong className="font-medium text-gray-700">Fecha de Nacimiento:</strong> {formatDate(pet.dob)}</p>
                  {/* Podrías añadir más detalles o enlaces aquí, como ver historial médico */}
                </div>
              </div>
               {/* Opcional: Pie de la tarjeta para acciones futuras */}
               {/* <div className="bg-gray-50 px-5 py-3 text-right">
                 <button className="text-sm text-indigo-600 hover:text-indigo-800">Ver Detalles</button>
               </div> */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Pets;
