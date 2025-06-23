// src/pages/admin/VerMascotas.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Pencil, Trash2 } from 'lucide-react';

type Mascota = {
  id_mascota: number;
  nombre: string;
  especie: string;
  raza: string;
  edad: number;
  peso: number;
  id_cliente: number;
};

const VerMascotas = () => {
  const [mascotas, setMascotas] = useState<Mascota[]>([]);

  useEffect(() => {
    const fetchMascotas = async () => {
      const { data, error } = await supabase.from('mascotas').select('*');
      if (error) {
        console.error('Error al obtener mascotas:', error);
      } else {
        setMascotas(data);
      }
    };

    fetchMascotas();
  }, []);

  const handleEditar = (id: number) => {
    // Lógica para editar la mascota
    console.log('Editar mascota con ID:', id);
  };

  const handleEliminar = async (id: number) => {
    const { error } = await supabase.from('mascotas').delete().eq('id_mascota', id);
    if (error) {
      console.error('Error al eliminar mascota:', error);
    } else {
      setMascotas(mascotas.filter((mascota) => mascota.id_mascota !== id));
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4 text-indigo-400">Gestión de Mascotas</h2>
      <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left">Nombre</th>
            <th className="px-4 py-2 text-left">Especie</th>
            <th className="px-4 py-2 text-left">Raza</th>
            <th className="px-4 py-2 text-left">Edad</th>
            <th className="px-4 py-2 text-left">Peso</th>
            <th className="px-4 py-2 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {mascotas.map((mascota) => (
            <tr key={mascota.id_mascota} className="border-b border-gray-700">
              <td className="px-4 py-2">{mascota.nombre}</td>
              <td className="px-4 py-2">{mascota.especie}</td>
              <td className="px-4 py-2">{mascota.raza}</td>
              <td className="px-4 py-2">{mascota.edad}</td>
              <td className="px-4 py-2">{mascota.peso}</td>
              <td className="px-4 py-2 flex space-x-2">
                <button
                  onClick={() => handleEditar(mascota.id_mascota)}
                  className="text-indigo-400 hover:text-indigo-600"
                >
                  <Pencil />
                </button>
                <button
                  onClick={() => handleEliminar(mascota.id_mascota)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VerMascotas;
