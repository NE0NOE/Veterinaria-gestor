import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  PawPrint, Eye, Loader2, ArrowLeft, AlertTriangle,
  PlusCircle, Edit, Trash2, CheckCircle, XCircle, User,
  Dog, Cat, Rabbit, Bird // Iconos que sí existen en Lucide-React para especies
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// --- Type Definitions ---
interface Cliente {
  id_cliente: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
}

interface Mascota {
  id_mascota: number;
  id_cliente: number | null;
  nombre: string;
  especie: string;
  raza: string | null;
  edad: number | null; // Edad en años
  peso: number | null; // Peso en kg
  // REMOVIDO: fecha_nacimiento: string | null; // Ya no existe en la DB
  // Campos derivados para la UI
  nombre_cliente?: string;
  email_cliente?: string;
}

// Interfaz para el estado del formulario de agregar/editar mascota
interface MascotaFormState {
  id_mascota?: number; // Para edición
  id_cliente: number | null;
  nombre: string;
  especie: string;
  raza: string;
  edad: number | '';
  peso: number | '';
  // REMOVIDO: fecha_nacimiento: string;
  // Campos para clientes/mascotas invitados (si no seleccionan un cliente registrado)
  nombre_cliente_invitado: string;
  email_cliente_invitado: string;
}

const initialMascotaFormState: MascotaFormState = {
  id_cliente: null,
  nombre: '',
  especie: '',
  raza: '',
  edad: '',
  peso: '',
  // REMOVIDO: fecha_nacimiento: '',
  nombre_cliente_invitado: '',
  email_cliente_invitado: '',
};

// --- Componente Modal de Confirmación (Reutilizado) ---
interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmButtonText = 'Confirmar',
  cancelButtonText = 'Cancelar',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full border border-red-600 relative">
        <h3 className="text-xl font-semibold text-red-400 mb-4 flex items-center justify-center gap-2">
          <AlertTriangle size={24} /> {title}
        </h3>
        <p className="text-white mb-6 text-center">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition shadow-md"
          >
            {cancelButtonText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition shadow-md"
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Componente Modal para Añadir/Editar Mascota ---
interface AddEditMascotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mascota: MascotaFormState) => void;
  initialData?: MascotaFormState | null;
  isLoading: boolean; // Para deshabilitar botones durante submit
  allClients: Cliente[]; // Para el select de clientes registrados
}

const AddEditMascotaModal: React.FC<AddEditMascotaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isLoading,
  allClients,
}) => {
  const [form, setForm] = useState<MascotaFormState>(
    initialData || initialMascotaFormState
  );
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialData || initialMascotaFormState);
    setLocalError(null);
  }, [isOpen, initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (name === 'id_cliente') {
      const id = value ? parseInt(value) : null;
      setForm((prev) => ({
        ...prev,
        id_cliente: id,
        // Limpiar campos de invitado si se selecciona un cliente registrado
        nombre_cliente_invitado: '',
        email_cliente_invitado: '',
      }));
    } else if (name === 'edad' || name === 'peso') {
      setForm((prev) => ({
        ...prev,
        [name]: value === '' ? '' : Number(value),
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
      // Limpiar id_cliente y mascotas asociadas si se usa un cliente invitado
      if (
        (name === 'nombre_cliente_invitado' || name === 'email_cliente_invitado') &&
        value !== ''
      ) {
        setForm((prev) => ({ ...prev, id_cliente: null }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validación básica
    if (!form.nombre || !form.especie) {
      setLocalError('El nombre y la especie son obligatorios.');
      return;
    }

    // Validación de cliente: debe haber un id_cliente O ambos campos de invitado
    const isRegisteredClientSelected = form.id_cliente !== null && form.id_cliente !== 0;
    const isGuestClientProvided = form.nombre_cliente_invitado && form.email_cliente_invitado;

    if (!isRegisteredClientSelected && !isGuestClientProvided) {
      setLocalError('Por favor, selecciona un cliente registrado o proporciona el nombre y email de un cliente invitado.');
      return;
    }
    if (form.edad !== '' && (isNaN(Number(form.edad)) || Number(form.edad) < 0)) {
        setLocalError('La edad debe ser un número positivo.');
        return;
    }
    if (form.peso !== '' && (isNaN(Number(form.peso)) || Number(form.peso) < 0)) {
        setLocalError('El peso debe ser un número positivo.');
        return;
    }

    onSave(form);
  };

  const getSpeciesIcon = (species: string) => {
    const lowerSpecies = species.toLowerCase();
    switch (lowerSpecies) {
      case 'perro': return <Dog size={16} className="text-yellow-400" />;
      case 'gato': return <Cat size={16} className="text-gray-400" />;
      case 'conejo': return <Rabbit size={16} className="text-orange-400" />;
      case 'ave': return <Bird size={16} className="text-blue-400" />;
      case 'reptil': return <PawPrint size={16} className="text-green-400" />;
      case 'pez': return <PawPrint size={16} className="text-cyan-400" />;
      case 'caballo': return <PawPrint size={16} className="text-amber-600" />;
      default: return <PawPrint size={16} className="text-indigo-400" />;
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md space-y-6 border border-blue-700 transform scale-100 animate-scale-in relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          title="Cerrar"
        >
          <XCircle size={24} />
        </button>
        <h3 className="text-2xl font-bold text-blue-400 text-center flex items-center justify-center gap-2">
          {initialData ? <Edit size={24} /> : <PlusCircle size={24} />}
          {initialData ? 'Editar Mascota' : 'Registrar Nueva Mascota'}
        </h3>

        {localError && (
          <div className="bg-red-800 text-red-100 p-3 rounded text-center border border-red-600 flex items-center justify-between">
            <span>{localError}</span>
            <XCircle size={18} className="cursor-pointer" onClick={() => setLocalError(null)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-gray-300 text-sm font-bold mb-1">Nombre de la Mascota</label>
            <input type="text" name="nombre" id="nombre"
              value={form.nombre} onChange={handleChange} required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading} />
          </div>
          <div>
            <label htmlFor="especie" className="block text-gray-300 text-sm font-bold mb-1">Especie</label>
            <select name="especie" id="especie"
              value={form.especie} onChange={handleChange} required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}>
              <option value="">Selecciona una especie</option>
              {['Perro', 'Gato', 'Conejo', 'Ave', 'Reptil', 'Pez', 'Caballo', 'Otro'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="raza" className="block text-gray-300 text-sm font-bold mb-1">Raza (Opcional)</label>
            <input type="text" name="raza" id="raza"
              value={form.raza} onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edad" className="block text-gray-300 text-sm font-bold mb-1">Edad (años)</label>
              <input type="number" name="edad" id="edad"
                value={form.edad} onChange={handleChange} min="0"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading} />
            </div>
            <div>
              <label htmlFor="peso" className="block text-gray-300 text-sm font-bold mb-1">Peso (kg)</label>
              <input type="number" name="peso" id="peso"
                value={form.peso} onChange={handleChange} step="0.1" min="0"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading} />
            </div>
          </div>
          {/* REMOVIDO: Campo de fecha_nacimiento */}
          {/* <div>
            <label htmlFor="fecha_nacimiento" className="block text-gray-300 text-sm font-bold mb-1">Fecha de Nacimiento</label>
            <input type="date" name="fecha_nacimiento" id="fecha_nacimiento"
              value={form.fecha_nacimiento} onChange={handleChange} required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading} />
          </div> */}

          <hr className="border-gray-600 my-4" />
          <p className="text-gray-400 text-sm text-center mb-4">Asignar a un Cliente Existente **O** Crear Cliente Invitado</p>

          <div>
            <label htmlFor="id_cliente" className="block text-gray-300 text-sm font-bold mb-1">Asignar a Cliente Registrado</label>
            <select name="id_cliente" id="id_cliente"
              value={form.id_cliente || ''} onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading || (form.nombre_cliente_invitado || form.email_cliente_invitado) !== ''}>
              <option value="">Selecciona un cliente (Opcional)</option>
              {allClients.map(client => (
                <option key={client.id_cliente} value={client.id_cliente}>
                  {client.nombre} ({client.email || client.telefono})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Si seleccionas un cliente aquí, los campos de invitado se deshabilitarán.</p>
          </div>

          <div className="text-center text-gray-400">--- O ---</div>

          <div>
            <label htmlFor="nombre_cliente_invitado" className="block text-gray-300 text-sm font-bold mb-1">Nombre Cliente Invitado</label>
            <input type="text" name="nombre_cliente_invitado" id="nombre_cliente_invitado"
              value={form.nombre_cliente_invitado} onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading || form.id_cliente !== null}
              placeholder="Ej: Juan Pérez"
            />
          </div>
          <div>
            <label htmlFor="email_cliente_invitado" className="block text-gray-300 text-sm font-bold mb-1">Email Cliente Invitado</label>
            <input type="email" name="email_cliente_invitado" id="email_cliente_invitado"
              value={form.email_cliente_invitado} onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading || form.id_cliente !== null}
              placeholder="Ej: juan.perez@example.com"
            />
          </div>


          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-md"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-semibold transition shadow-md flex items-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : null}
              {initialData ? (isLoading ? 'Guardando...' : 'Guardar Cambios') : (isLoading ? 'Agregando...' : 'Registrar Mascota')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- Componente Principal VeterinarioMascotas ---
const VeterinarioMascotas: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [clientes, setClients] = useState<Cliente[]>([]); // Todos los clientes para el modal
  const [isLoading, setIsLoading] = useState(true); // Carga inicial de datos
  const [isSubmitting, setIsSubmitting] = useState(false); // Para submit de formularios
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Estados para el modal de Añadir/Editar
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [currentMascotaToEdit, setCurrentMascotaToEdit] = useState<MascotaFormState | null>(null);

  // Estados para el modal de Confirmación de Eliminación
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [mascotaToDelete, setMascotaToDelete] = useState<Mascota | null>(null);

  // Estados para búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterSpecies, setFilterSpecies] = useState<string>('todas');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const showFeedbackMessage = useCallback((type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setMessage(msg);
      setError(null);
    } else {
      setError(msg);
      setMessage(null);
    }
    setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 5000);
  }, []);

  // --- Funciones de Carga de Datos ---
  const fetchAllClients = useCallback(async () => {
    try {
      const { data, error: clientsError } = await supabase
        .from('clientes')
        .select('id_cliente, nombre, email, telefono'); // REMOVIDO: apellido
      if (clientsError) throw clientsError;
      setClients(data || []);
    } catch (err: any) {
      console.error('Error fetching clients:', err.message);
      showFeedbackMessage('error', 'Error al cargar la lista de clientes: ' + err.message);
    }
  }, [showFeedbackMessage]);

  const fetchAllMascotas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null); // Limpiar mensajes al recargar

    if (authLoading) return; // Esperar a que la autenticación termine

    try {
      const { data: mascotasData, error: mascotasError } = await supabase
        .from('mascotas')
        .select(`
          id_mascota,
          id_cliente,
          nombre,
          especie,
          raza,
          edad,
          peso,
          clientes (nombre, email) {/* REMOVIDO: fecha_nacimiento, apellido */}
        `) // REMOVIDO: fecha_nacimiento del select de mascotas
        .order('nombre', { ascending: true });

      if (mascotasError) throw mascotasError;

      const processedMascotas: Mascota[] = (mascotasData || []).map((m: any) => ({
        id_mascota: m.id_mascota,
        id_cliente: m.id_cliente,
        nombre: m.nombre,
        especie: m.especie,
        raza: m.raza,
        edad: m.edad,
        peso: m.peso,
        fecha_nacimiento: null, // Asignar null o undefined si ya no se usa
        nombre_cliente: m.clientes?.nombre || '',
        email_cliente: m.clientes?.email,
      }));
      setMascotas(processedMascotas);
      showFeedbackMessage('success', 'Mascotas cargadas exitosamente.');

    } catch (err: any) {
      console.error('Error al cargar todas las mascotas:', err.message);
      showFeedbackMessage('error', 'Error al cargar las mascotas: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, showFeedbackMessage]);

  // --- Efecto para Carga Inicial ---
  useEffect(() => {
    if (!authLoading && user) { // Asegurarse de que el usuario está autenticado
      fetchAllClients();
      fetchAllMascotas();
    } else if (!authLoading && !user) {
        setIsLoading(false);
    }
  }, [authLoading, user, fetchAllClients, fetchAllMascotas]);

  // --- Manejo de Modales y Formularios ---
  const handleOpenAddModal = () => {
    setCurrentMascotaToEdit(null); // Reiniciar para añadir
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (mascota: Mascota) => {
    setCurrentMascotaToEdit({
      id_mascota: mascota.id_mascota,
      id_cliente: mascota.id_cliente,
      nombre: mascota.nombre,
      especie: mascota.especie,
      raza: mascota.raza || '',
      edad: mascota.edad || '',
      peso: mascota.peso || '',
      // REMOVIDO: fecha_nacimiento: mascota.fecha_nacimiento || '',
      nombre_cliente_invitado: '', // Estos se ignorarán si id_cliente está seteado
      email_cliente_invitado: '',
    });
    setShowAddEditModal(true);
  };

  const handleCloseAddEditModal = () => {
    setShowAddEditModal(false);
    setCurrentMascotaToEdit(null);
    setIsSubmitting(false); // Resetear estado de submit
  };

  const handleSaveMascota = async (formData: MascotaFormState) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (formData.id_mascota) {
        // Lógica de Edición
        const { error: updateError } = await supabase
          .from('mascotas')
          .update({
            id_cliente: formData.id_cliente,
            nombre: formData.nombre,
            especie: formData.especie,
            raza: formData.raza || null,
            edad: formData.edad === '' ? null : formData.edad,
            peso: formData.peso === '' ? null : formData.peso,
            // REMOVIDO: fecha_nacimiento: formData.fecha_nacimiento || null,
          })
          .eq('id_mascota', formData.id_mascota);

        if (updateError) throw updateError;
        showFeedbackMessage('success', 'Mascota actualizada exitosamente.');

      } else {
        // Lógica de Añadir
        let finalClientId = formData.id_cliente;

        if (formData.id_cliente === null && formData.nombre_cliente_invitado && formData.email_cliente_invitado) {
          // Crear un nuevo cliente si se proporcionó información de invitado
          const { data: newClientData, error: newClientError } = await supabase
            .from('clientes')
            .insert({
              nombre: formData.nombre_cliente_invitado,
              email: formData.email_cliente_invitado,
            })
            .select('id_cliente')
            .single();

          if (newClientError) throw newClientError;
          finalClientId = newClientData.id_cliente;
          showFeedbackMessage('success', 'Nuevo cliente invitado registrado y asignado.');
          fetchAllClients(); // Recargar clientes para que aparezca en el select
        } else if (formData.id_cliente === null && (!formData.nombre_cliente_invitado || !formData.email_cliente_invitado)) {
            throw new Error('Debe seleccionar un cliente o proporcionar el nombre y email de un cliente invitado.');
        }


        const { error: insertError } = await supabase
          .from('mascotas')
          .insert({
            id_cliente: finalClientId,
            nombre: formData.nombre,
            especie: formData.especie,
            raza: formData.raza || null,
            edad: formData.edad === '' ? null : formData.edad,
            peso: formData.peso === '' ? null : formData.peso,
            // REMOVIDO: fecha_nacimiento: formData.fecha_nacimiento || null,
          });

        if (insertError) throw insertError;
        showFeedbackMessage('success', 'Mascota registrada exitosamente.');
      }
      handleCloseAddEditModal();
      fetchAllMascotas(); // Recargar la lista para ver los cambios
    } catch (err: any) {
      console.error('Error al guardar mascota:', err.message);
      showFeedbackMessage('error', 'Error al guardar mascota: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Lógica de Eliminación ---
  const handleDeleteClick = (mascota: Mascota) => {
    setMascotaToDelete(mascota);
    setShowDeleteConfirmModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!mascotaToDelete) return;

    setIsSubmitting(true); // Usar este estado para deshabilitar botones
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('mascotas')
        .delete()
        .eq('id_mascota', mascotaToDelete.id_mascota);

      if (deleteError) throw deleteError;

      showFeedbackMessage('success', `Mascota "${mascotaToDelete.nombre}" eliminada exitosamente.`);
      setShowDeleteConfirmModal(false);
      setMascotaToDelete(null);
      fetchAllMascotas(); // Recargar la lista
    } catch (err: any) {
      console.error('Error al eliminar mascota:', err.message);
      showFeedbackMessage('error', 'Error al eliminar mascota: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmModal(false);
    setMascotaToDelete(null);
  };

  // --- Lógica de Búsqueda y Paginación ---
  const filteredMascotas = useMemo(() => {
    let currentMascotas = mascotas;

    if (filterSpecies !== 'todas') {
      currentMascotas = currentMascotas.filter(m => m.especie.toLowerCase() === filterSpecies.toLowerCase());
    }

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      currentMascotas = currentMascotas.filter(m =>
        m.nombre.toLowerCase().includes(lowerCaseSearchTerm) ||
        m.raza?.toLowerCase().includes(lowerCaseSearchTerm) ||
        m.especie.toLowerCase().includes(lowerCaseSearchTerm) ||
        m.nombre_cliente?.toLowerCase().includes(lowerCaseSearchTerm) ||
        m.email_cliente?.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
    return currentMascotas;
  }, [mascotas, searchTerm, filterSpecies]);

  const totalPages = Math.ceil(filteredMascotas.length / itemsPerPage);
  const paginatedMascotas = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredMascotas.slice(startIndex, endIndex);
  }, [filteredMascotas, currentPage, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getSpeciesIcon = (species: string) => {
    const lowerSpecies = species.toLowerCase();
    switch (lowerSpecies) {
      case 'perro': return <Dog size={16} className="text-yellow-400" />;
      case 'gato': return <Cat size={16} className="text-gray-400" />;
      case 'conejo': return <Rabbit size={16} className="text-orange-400" />;
      case 'ave': return <Bird size={16} className="text-blue-400" />;
      case 'reptil': return <PawPrint size={16} className="text-green-400" />;
      case 'pez': return <PawPrint size={16} className="text-cyan-400" />;
      case 'caballo': return <PawPrint size={16} className="text-amber-600" />;
      default: return <PawPrint size={16} className="text-indigo-400" />;
    }
  };


  // --- Navegar al historial clínico detallado ---
  const handleViewHistorial = (mascotaId: number) => {
    navigate(`/veterinario-dashboard/historial-clinico/${mascotaId}`);
  };

  // --- Renderizado principal (Loaders y Errores) ---
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white font-inter">
        <Loader2 className="animate-spin mr-3 text-green-400" size={36} />
        <p className="text-xl text-green-400">Cargando gestión de mascotas...</p>
      </div>
    );
  }

  // Si no hay usuario o el ProtectedRoute no lo permitió (aunque ProtectedRoute redirige)
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-red-400 text-xl text-center">
          Error de autenticación o acceso denegado. Por favor, inicia sesión.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-950 text-white min-h-screen font-inter">
      <h2 className="text-3xl font-extrabold text-green-400 text-center mb-8 flex items-center justify-center gap-3">
        <PawPrint size={28} /> Gestión de Mascotas
      </h2>

      {/* Mensajes de Feedback (éxito/error) */}
      {error && (
        <div className="bg-red-800 text-red-100 p-4 rounded-lg text-center border border-red-600 mb-6 flex items-center justify-between shadow-md animate-fade-in">
          <AlertTriangle size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">{error}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setError(null)} />
        </div>
      )}
      {message && (
        <div className="bg-green-800 text-green-100 p-4 rounded-lg text-center border border-green-600 mb-6 flex items-center justify-between shadow-md animate-fade-in">
          <CheckCircle size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">{message}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setMessage(null)} />
        </div>
      )}

      {/* Controles de Búsqueda y Filtrado */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-green-800 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Campo de Búsqueda */}
          <div>
            <label htmlFor="search" className="block text-gray-300 text-sm font-bold mb-1">Buscar Mascota/Cliente</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <PawPrint size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500"
                placeholder="Nombre, raza, cliente..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          {/* Filtro por Especie */}
          <div>
            <label htmlFor="filterSpecies" className="block text-gray-300 text-sm font-bold mb-1">Filtrar por Especie</label>
            <select
              id="filterSpecies"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-green-500 focus:border-green-500"
              value={filterSpecies}
              onChange={(e) => { setFilterSpecies(e.target.value); setCurrentPage(1); }}
            >
              <option value="todas">Todas las Especies</option>
              {['Perro', 'Gato', 'Conejo', 'Ave', 'Reptil', 'Pez', 'Caballo', 'Otro'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Botón de Añadir Mascota */}
          <div className="flex items-end">
            <button
              onClick={handleOpenAddModal}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center transition shadow-md"
            >
              <PlusCircle size={20} className="mr-2" /> Añadir Mascota
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Mascotas */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-green-800">
        {paginatedMascotas.length === 0 && !isLoading ? (
          <p className="text-gray-400 text-center py-8">No se encontraron mascotas que coincidan con los filtros.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="min-w-full table-auto divide-y divide-gray-700 text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><PawPrint size={14} /> Nombre</div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1">Especie</div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    Raza
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    Edad
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    Peso
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><User size={14} /> Propietario</div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-700">
                {paginatedMascotas.map((mascota) => (
                  <tr key={mascota.id_mascota} className="hover:bg-gray-800 transition-colors duration-200">
                    <td className="px-4 py-3 font-medium text-white whitespace-nowrap flex items-center gap-2">
                        {getSpeciesIcon(mascota.especie)}
                        {mascota.nombre}
                    </td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap capitalize">{mascota.especie}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{mascota.raza || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{mascota.edad !== null ? `${mascota.edad} años` : 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{mascota.peso !== null ? `${mascota.peso} kg` : 'N/A'}</td>
                    <td className="px-4 py-3 text-blue-400 whitespace-nowrap">
                      {mascota.nombre_cliente || 'Cliente Invitado'}
                      {mascota.email_cliente && <div className="text-xs text-gray-500">{mascota.email_cliente}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleViewHistorial(mascota.id_mascota); }}
                          className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-md"
                          title="Ver Historial Clínico"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenEditModal(mascota); }}
                          className="p-2 rounded-full bg-yellow-600 text-white hover:bg-yellow-700 transition shadow-md"
                          title="Editar Mascota"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(mascota); }}
                          className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition shadow-md"
                          title="Eliminar Mascota"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Controles de Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-6">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isSubmitting}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-gray-300">Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isSubmitting}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Modal de Añadir/Editar Mascota */}
      <AddEditMascotaModal
        isOpen={showAddEditModal}
        onClose={handleCloseAddEditModal}
        onSave={handleSaveMascota}
        initialData={currentMascotaToEdit}
        isLoading={isSubmitting}
        allClients={clientes}
      />

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmationModal
        isOpen={showDeleteConfirmModal}
        title="Confirmar Eliminación de Mascota"
        message={`¿Estás seguro de que quieres eliminar a la mascota "${mascotaToDelete?.nombre}" (${mascotaToDelete?.especie})? Esta acción es irreversible y eliminará todos los registros asociados (citas, historial clínico).`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmButtonText={isSubmitting ? 'Eliminando...' : 'Sí, Eliminar'}
        cancelButtonText="No, Mantener"
      />
    </div>
  );
};

export default VeterinarioMascotas;
