import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { PawPrint, Eye, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Para navegar al historial clínico

// Tipo para la mascota que el veterinario puede ver
interface MascotaVeterinario {
  id_mascota: number;
  nombre: string;
  especie: string;
  raza: string | null;
  edad: number | null;
  peso: number | null;
  id_cliente: number; // Necesario para enlazar al cliente
  nombre_cliente?: string; // Para mostrar el nombre del cliente
  email_cliente?: string; // Para mostrar el email del cliente
}

// Tipo para el historial clínico simplificado para el veterinario (no se usa directamente aquí, pero es buena práctica)
interface HistorialClinicoVeterinarioEntry {
  id_historial: number;
  fecha_consulta: string;
  motivo_consulta: string;
  diagnostico: string;
  tratamiento: string;
  observaciones: string | null;
}

const VeterinarioMascotas: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [mascotas, setMascotas] = useState<MascotaVeterinario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // No necesitamos el veterinarioId para filtrar mascotas aquí, pero lo mantenemos si es útil en el futuro.
  // const [veterinarioId, setVeterinarioId] = useState<number | null>(null);

  const navigate = useNavigate(); // Hook para la navegación

  // Función para cargar TODAS las mascotas registradas
  const fetchAllMascotas = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Si la autenticación aún está cargando, esperamos.
    if (authLoading) return;

    // Opcional: Si quieres asegurarte de que solo los veterinarios puedan ver todas las mascotas
    // puedes añadir aquí una verificación de perfil de veterinario,
    // pero la política RLS en Supabase es la forma más segura de controlarlo.
    // const vetId = await fetchVeterinarioId(); // Si se necesita el ID del veterinario para algo más
    // if (!vetId) {
    //   setError('Acceso denegado: Solo los veterinarios pueden ver esta sección.');
    //   setIsLoading(false);
    //   setMascotas([]);
    //   return;
    // }

    try {
      // Obtener todas las mascotas y sus clientes asociados
      const { data: mascotasData, error: mascotasError } = await supabase
        .from('mascotas')
        .select(`
          id_mascota,
          nombre,
          especie,
          raza,
          edad,
          peso,
          id_cliente,
          clientes (nombre, apellido, email)
        `)
        .order('nombre', { ascending: true }); // Ordenar por nombre para mejor visualización

      if (mascotasError) throw mascotasError;

      const processedMascotas: MascotaVeterinario[] = (mascotasData || []).map((m: any) => ({
        id_mascota: m.id_mascota,
        nombre: m.nombre,
        especie: m.especie,
        raza: m.raza,
        edad: m.edad,
        peso: m.peso,
        id_cliente: m.id_cliente,
        nombre_cliente: `${m.clientes?.nombre || ''} ${m.clientes?.apellido || ''}`.trim(),
        email_cliente: m.clientes?.email,
      }));

      setMascotas(processedMascotas);

    } catch (err: any) {
      console.error('Error al cargar todas las mascotas:', err.message);
      setError('Error al cargar las mascotas: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading]); // La dependencia es solo authLoading ahora

  useEffect(() => {
    // Llamar a fetchAllMascotas en lugar de fetchMascotasAsignadas
    fetchAllMascotas();
  }, [fetchAllMascotas]);

  // Navegar al historial clínico detallado
  const handleViewHistorial = (mascotaId: number) => {
    navigate(`/veterinario-dashboard/historial-clinico/${mascotaId}`);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <Loader2 className="animate-spin mr-2" size={24} />
        <p className="text-xl text-green-400">Cargando mascotas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 text-white min-h-screen font-inter">
        <div className="bg-red-800 p-4 rounded-md text-red-100 mb-4">
          <p>Error: {error}</p>
          <p className="text-sm mt-2">Asegúrate de que estás autenticado como veterinario y que las tablas y sus políticas RLS están configuradas correctamente.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition shadow-md"
        >
          Reintentar Carga
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 text-white space-y-12 min-h-screen font-inter">
      <h2 className="text-3xl font-extrabold text-green-400 text-center mb-8 flex items-center justify-center gap-2">
        <PawPrint size={30} /> Todas las Mascotas Registradas
      </h2>

      <section className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-2xl text-green-300 mb-6 font-semibold">Listado Completo de Mascotas</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-200 uppercase bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3">Nombre Mascota</th>
                <th scope="col" className="px-6 py-3">Especie</th>
                <th scope="col" className="px-6 py-3">Raza</th>
                <th scope="col" className="px-6 py-3">Edad</th>
                <th scope="col" className="px-6 py-3">Propietario</th>
                <th scope="col" className="px-6 py-3">Email Propietario</th>
                <th scope="col" className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {mascotas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">No hay mascotas registradas en el sistema.</td>
                </tr>
              ) : (
                mascotas.map(mascota => (
                  <tr key={mascota.id_mascota} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-6 py-4 font-medium text-white">{mascota.nombre}</td>
                    <td className="px-6 py-4">{mascota.especie}</td>
                    <td className="px-6 py-4">{mascota.raza || 'N/A'}</td>
                    <td className="px-6 py-4">{mascota.edad ? `${mascota.edad} años` : 'N/A'}</td>
                    <td className="px-6 py-4">{mascota.nombre_cliente || 'N/A'}</td>
                    <td className="px-6 py-4">{mascota.email_cliente || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewHistorial(mascota.id_mascota)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition flex items-center gap-1"
                      >
                        <Eye size={16} /> Ver Historial
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default VeterinarioMascotas;
