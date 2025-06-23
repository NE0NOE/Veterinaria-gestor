import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient'; // Asegúrate de que la ruta sea correcta
import { useAuth } from '../context/AuthContext'; // Para obtener el ID del usuario/cliente
import { Loader2, PawPrint } from 'lucide-react';

interface Mascota {
  id_mascota: number;
  nombre: string;
  especie: string;
}

interface PetSelectorProps {
  onSelectPet: (petId: number | null) => void;
  // Puedes añadir una prop para el valor inicial si lo necesitas
  initialSelectedPetId?: number | null;
}

const PetSelector: React.FC<PetSelectorProps> = ({ onSelectPet, initialSelectedPetId = null }) => {
  const { user, loading: authLoading } = useAuth();
  const [pets, setPets] = useState<Mascota[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(initialSelectedPetId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener el ID del cliente asociado al usuario logeado
  const fetchClientId = useCallback(async () => {
    if (!user?.id) return null;
    try {
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('id_cliente')
        .eq('id_user', user.id)
        .single();
      if (clienteError) {
        if (clienteError.code !== 'PGRST116') { // PGRST116: No rows found.
          console.error('Error al obtener id_cliente:', clienteError.message);
          throw new Error('Error al cargar la información del cliente.');
        }
        return null;
      }
      return clienteData?.id_cliente || null;
    } catch (err: any) {
      console.error('Error en fetchClientId (PetSelector):', err.message);
      setError('Error al cargar la información del cliente: ' + err.message);
      return null;
    }
  }, [user]);

  // Cargar las mascotas del cliente
  useEffect(() => {
    if (authLoading || !user) {
      setIsLoading(true);
      return;
    }

    const loadPets = async () => {
      setIsLoading(true);
      setError(null);

      const clienteId = await fetchClientId();
      if (!clienteId) {
        setError('No se pudo obtener el perfil del cliente. Asegúrate de que tu cuenta de usuario está asociada a un cliente.');
        setIsLoading(false);
        setPets([]);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('mascotas')
          .select('id_mascota, nombre, especie')
          .eq('id_cliente', clienteId)
          .order('nombre', { ascending: true });

        if (fetchError) throw fetchError;

        setPets(data || []);
        if (data && data.length > 0 && initialSelectedPetId === null) {
          // Opcional: Seleccionar la primera mascota por defecto si no hay una inicial
          // setSelectedPetId(data[0].id_mascota);
          // onSelectPet(data[0].id_mascota);
        }

      } catch (err: any) {
        console.error('Error al cargar mascotas en PetSelector:', err.message);
        setError('Error al cargar tus mascotas: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadPets();
  }, [authLoading, user, fetchClientId, initialSelectedPetId, onSelectPet]); // Dependencias

  // Manejar el cambio de selección
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value === "" ? null : parseInt(e.target.value);
    setSelectedPetId(id);
    onSelectPet(id); // Notificar al componente padre
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-800 rounded-md text-white">
        <Loader2 className="animate-spin mr-2" size={20} />
        <p>Cargando mascotas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-200 text-red-800 px-4 py-2 rounded text-sm text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      <label htmlFor="pet-selector" className="block text-sm font-medium text-gray-300 mb-1">
        <PawPrint size={16} className="inline-block mr-1" /> Selecciona una Mascota:
      </label>
      <select
        id="pet-selector"
        value={selectedPetId || ""}
        onChange={handleChange}
        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">-- Seleccione mascota --</option>
        {pets.map((pet) => (
          <option key={pet.id_mascota} value={pet.id_mascota}>
            {pet.nombre} ({pet.especie})
          </option>
        ))}
      </select>
      {pets.length === 0 && (
        <p className="text-yellow-400 text-sm mt-2">No tienes mascotas registradas. Por favor, registra una mascota primero.</p>
      )}
    </div>
  );
};

export default PetSelector;
