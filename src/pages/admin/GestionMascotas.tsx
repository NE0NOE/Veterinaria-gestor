import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient'; // Asegúrate de que esta ruta sea correcta
import { Pencil, Trash2, PlusCircle, Loader2, AlertCircle, CheckCircle,
  XCircle, User, PawPrint, Tag, Weight, Calendar, RefreshCw } from 'lucide-react'; // Importado RefreshCw para el botón

// Definición de tipos basada en tu esquema de base de datos
type Mascota = {
  id_mascota: number;
  nombre: string;
  especie: string;
  raza: string | null;
  edad: number | null; // Puede ser nulo en la DB
  peso: number | null; // Puede ser nulo en la DB
  id_cliente: number | null; // Puede ser nulo en la DB
};

type Cliente = {
  id_cliente: number;
  nombre: string;
};

// Estado inicial del formulario para agregar/editar mascotas
const initialFormState: Omit<Mascota, 'id_mascota'> = {
  nombre: '',
  especie: '',
  raza: '',
  edad: null,
  peso: null,
  id_cliente: null,
};

const GestionMascotas: React.FC = () => {
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modoEdicion, setModoEdicion] = useState<Mascota | null>(null);
  const [form, setForm] = useState<Omit<Mascota, 'id_mascota'>> (initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mascotaToDelete, setMascotaToDelete] = useState<number | null>(null);

  // Función para cargar los datos de mascotas y clientes
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Limpiar errores al intentar recargar
    setSuccess(null); // Limpiar mensajes de éxito al recargar

    try {
      // Consulta todas las mascotas y las ordena por nombre
      const { data: mascotasData, error: mascotasError } = await supabase
        .from('mascotas')
        .select('*')
        .order('nombre', { ascending: true });

      // Consulta todos los clientes y los ordena por nombre
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('id_cliente, nombre')
        .order('nombre', { ascending: true });

      if (mascotasError) throw mascotasError;
      if (clientesError) throw clientesError;

      setMascotas(mascotasData || []);
      setClientes(clientesData || []);

    } catch (err: any) {
      console.error("Error al cargar datos:", err.message);
      setError("Error al cargar la información: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(); // Carga inicial de datos al montar el componente

    // IMPORTANT: Se han REMOVIDO las suscripciones en tiempo real (Realtime)
    // para evitar el "parpadeo" y permitir actualizaciones manuales con el botón.
    // Si en el futuro necesitas Realtime, considera un enfoque más sofisticado
    // que no implique recargar toda la lista o que maneje las animaciones de forma más suave.

    // La función de retorno vacío o sin suscripciones no es necesaria si no hay canales que remover.
    return () => {
        // No hay suscripciones de Realtime para remover en este componente ahora.
        // Si las vuelves a añadir, asegúrate de removerlas aquí.
    };
  }, [fetchData]); // Dependencia de fetchData para que se vuelva a ejecutar si la función cambia (aunque con useCallback es estable)

  // Manejador para los cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      let parsedValue: string | number | null = value;

      if (name === 'edad') {
        parsedValue = value === '' ? null : parseInt(value, 10);
        if (isNaN(parsedValue as number)) parsedValue = null; // Asegura null si no es un número válido
      } else if (name === 'peso') {
        parsedValue = value === '' ? null : parseFloat(value);
        if (isNaN(parsedValue as number)) parsedValue = null; // Asegura null si no es un número válido
      } else if (name === 'id_cliente') {
        // '0' de la opción "Sin asignar cliente" se mapea a null
        parsedValue = value === '0' ? null : parseInt(value, 10);
        if (isNaN(parsedValue as number)) parsedValue = null;
      } else if (name === 'raza' && value.trim() === '') {
        parsedValue = null; // Si la raza está vacía, la guardamos como null
      }

      return {
        ...prev,
        [name]: parsedValue,
      };
    });
  };

  // Manejador para iniciar la edición de una mascota
  const handleEdit = (mascota: Mascota) => {
    setModoEdicion(mascota);
    setForm({
      nombre: mascota.nombre,
      especie: mascota.especie,
      raza: mascota.raza || '', // Si es null en DB, que sea string vacío en el form
      edad: mascota.edad,
      peso: mascota.peso,
      id_cliente: mascota.id_cliente,
    });
    setError(null);
    setSuccess(null);
  };

  // Manejador para cancelar la edición
  const handleCancelEdit = () => {
    setModoEdicion(null);
    setForm(initialFormState);
    setError(null);
    setSuccess(null);
  };

  // Manejador para confirmar eliminación (abre el modal)
  const confirmDelete = (id: number) => {
    setMascotaToDelete(id);
    setShowDeleteConfirm(true);
  };

  // Manejador para ejecutar la eliminación
  const handleDelete = async () => {
    if (mascotaToDelete === null) return;

    setError(null);
    setSuccess(null);
    setIsSubmitting(true); // Usamos isSubmitting para indicar que la eliminación está en curso

    try {
      const { error: deleteError } = await supabase
        .from('mascotas')
        .delete()
        .eq('id_mascota', mascotaToDelete);

      if (deleteError) throw deleteError;

      setSuccess('Mascota eliminada correctamente.');
      fetchData(); // Llamar fetchData para actualizar la lista después de la eliminación
    } catch (err: any) {
      console.error("Error al eliminar mascota:", err.message);
      setError("Error al eliminar la mascota: " + err.message);
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false); // Cierra el modal de confirmación
      setMascotaToDelete(null); // Resetea el ID a eliminar
    }
  };

  // Manejador para el envío del formulario (agregar/actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    // Preparar el payload, asegurando que los campos opcionales son null si están vacíos
    const payload = {
      nombre: form.nombre.trim(),
      especie: form.especie.trim(),
      raza: form.raza?.trim() || null, // Si es string vacío, convertir a null
      edad: form.edad,
      peso: form.peso,
      id_cliente: form.id_cliente,
    };

    // Validaciones básicas
    if (!payload.nombre || !payload.especie) {
      setError('Los campos Nombre y Especie son obligatorios.');
      setIsSubmitting(false);
      return;
    }

    // Asegurar que el id_cliente no sea 0 si se selecciona la opción por defecto y no hay cliente
    if (payload.id_cliente === 0) {
      payload.id_cliente = null;
    }

    try {
      if (modoEdicion) {
        // Si estamos en modo edición, actualizamos
        const { error: updateError } = await supabase
          .from('mascotas')
          .update(payload)
          .eq('id_mascota', modoEdicion.id_mascota);

        if (updateError) throw updateError;

        setSuccess('Mascota actualizada correctamente.');
        setModoEdicion(null); // Salir del modo edición
        setForm(initialFormState); // Limpiar formulario
        fetchData(); // Recargar datos después de la actualización

      } else {
        // Si no estamos en modo edición, insertamos una nueva
        const { error: insertError } = await supabase
          .from('mascotas')
          .insert([payload]);

        if (insertError) throw insertError;

        setSuccess('Mascota agregada correctamente.');
        setForm(initialFormState); // Limpiar formulario
        fetchData(); // Recargar datos después de la inserción
      }
    } catch (err: any) {
      console.error("Error al guardar mascota:", err.message);
      setError("Error al guardar la mascota: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Componente de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-900 text-white">
        <Loader2 className="animate-spin mr-2 text-indigo-400" size={32} />
        <p className="text-xl text-indigo-400">Cargando datos de mascotas...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-950 text-white rounded-lg shadow-xl space-y-8 font-inter">
      <h2 className="text-3xl font-extrabold text-blue-400 mb-8 flex items-center gap-3">
        <PawPrint size={28} /> Gestión de Mascotas
      </h2>

      {/* Mensajes de feedback */}
      {error && (
        <div className="bg-red-800 text-red-100 p-4 rounded-lg text-center
          border border-red-600 mb-6 flex items-center justify-between shadow-md animate-fade-in">
          <AlertCircle size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">{error}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setError(null)} />
        </div>
      )}

      {success && (
        <div className="bg-green-800 text-green-100 p-4 rounded-lg text-
          center border border-green-600 mb-6 flex items-center justify-between
          shadow-md animate-fade-in">
          <CheckCircle size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">{success}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setSuccess(null)} />
        </div>
      )}

      {/* FORMULARIO */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800">
        <h3 className="text-2xl font-bold text-indigo-400 mb-5 flex items-center gap-2">
          <PlusCircle size={22} /> {modoEdicion ? 'Editar Mascota' : 'Agregar Nueva Mascota'}
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-base">
          <div>
            <label htmlFor="nombre" className="block mb-1 text-gray-300">Nombre</label>
            <input
              id="nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-700 border border-gray-600
                rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Nombre de la mascota"
              required
            />
          </div>

          <div>
            <label htmlFor="especie" className="block mb-1 text-gray-300">Especie</label>
            <input
              id="especie"
              name="especie"
              value={form.especie}
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-700 border border-gray-600
                rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Ej: Perro, Gato"
              required
            />
          </div>

          <div>
            <label htmlFor="raza" className="block mb-1 text-gray-300">Raza (Opcional)</label>
            <input
              id="raza"
              name="raza"
              value={form.raza || ''} // Mostrar vacío si es null
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-700 border border-gray-600
                rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Ej: Labrador, Siames"
            />
          </div>

          <div>
            <label htmlFor="edad" className="block mb-1 text-gray-300">Edad (años, Opcional)</label>
            <input
              id="edad"
              name="edad"
              type="number"
              value={form.edad ?? ''} // Mostrar vacío si es null o undefined
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-700 border border-gray-600
                rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Ej: 3"
              min="0" // Edad no puede ser negativa
            />
          </div>

          <div>
            <label htmlFor="peso" className="block mb-1 text-gray-300">Peso (kg, Opcional)</label>
            <input
              id="peso"
              name="peso"
              type="number" // Cambiado a number para mejor validación nativa
              step="0.01" // Permite decimales para el peso
              value={form.peso ?? ''} // Mostrar vacío si es null o undefined
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-700 border border-gray-600
                rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Ej: 5.2"
              min="0" // Peso no puede ser negativo
            />
          </div>

          <div className="lg:col-span-3"> {/* Asegura que el selector de cliente ocupe todo el ancho en pantallas grandes */}
            <label htmlFor="id_cliente" className="block mb-1 text-gray-300">Cliente (Asignar a, Opcional)</label>
            <select
              id="id_cliente"
              name="id_cliente"
              value={form.id_cliente ?? 0} // Si es null, selecciona la opción por defecto (0)
              onChange={handleChange}
              className="w-full p-2.5 bg-gray-700 border border-gray-600
                rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
            >
              <option value={0}>-- Sin asignar cliente (invitado) --</option>
              {clientes.map((c) => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  {c.nombre} (ID: {c.id_cliente})
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end space-x-3 mt-4">
            {modoEdicion && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-md"
              >
                Cancelar Edición
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-semibold transition shadow-md flex items-center
                justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Guardando...
                </>
              ) : modoEdicion ? (
                'Actualizar Mascota'
              ) : (
                'Agregar Mascota'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* TABLA DE MASCOTAS */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800">
        <h3 className="text-2xl font-bold text-blue-400 mb-5 flex items-center gap-2">
          Listado de Mascotas
        </h3>
        <div className="mb-4 text-right">
            <button
                onClick={fetchData} // Llama a fetchData al hacer clic
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition shadow-md flex items-center justify-end ml-auto"
                disabled={isLoading} // Deshabilitar mientras se está cargando
            >
                {isLoading ? (
                    <Loader2 className="animate-spin mr-2" size={18} />
                ) : (
                    <RefreshCw className="mr-2" size={18} />
                )}
                Actualizar Tabla
            </button>
        </div>
        {mascotas.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No hay mascotas registradas.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="min-w-full table-auto divide-y divide-gray-700 text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><PawPrint size={14} />Nombre</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><Tag size={14} />Especie</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">Raza</th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><Calendar size={14} />Edad</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><Weight size={14} />Peso (kg)</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><User size={14} />Cliente Asignado</div>
                  </th>
                  <th className="px-4 py-3 text-right text-gray-300 font-semibold text-xs uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-700">
                {mascotas.map((m) => (
                  <tr key={m.id_mascota} className="hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{m.nombre}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{m.especie}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{m.raza || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{m.edad ?? 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{m.peso ?? 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.id_cliente
                        ? clientes.find((c) => c.id_cliente === m.id_cliente)?.nombre || 'Cliente Desconocido'
                        : 'No Asignado'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => handleEdit(m)}
                        className="text-blue-400 hover:text-blue-500 p-2 rounded-md transition-colors"
                        title="Editar Mascota"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => confirmDelete(m.id_mascota)}
                        className="text-red-400 hover:text-red-500 p-2 rounded-md transition-colors"
                        title="Eliminar Mascota"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm space-y-6 border border-red-700 transform scale-100 animate-scale-in">
            <h3 className="text-2xl font-bold text-red-400 text-center flex
              items-center justify-center gap-2">
              <AlertCircle size={24} /> Confirmar Eliminación
            </h3>
            <p className="text-gray-300 text-center">
              ¿Estás seguro de que quieres eliminar esta mascota? Esta
              acción no se puede deshacer.
            </p>
            <div className="flex justify-center space-x-4 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-md"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2 bg-red-700 hover:bg-red-600 text-white
                  rounded-lg font-semibold transition shadow-md flex items-center justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionMascotas;
