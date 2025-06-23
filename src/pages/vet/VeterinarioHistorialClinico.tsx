import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, PlusCircle, Edit, Save, XCircle, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

// --- Type Definitions ---

type Cliente = {
  id_cliente: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string | null;
  ciudad: string | null;
  recibir_recordatorios: boolean | null;
};

type Mascota = {
  id_mascota: number;
  id_cliente: number;
  nombre: string;
  especie: string;
  raza: string | null;
  edad: number | null;
  peso: number | null;
  fecha_nacimiento: string;
};

type HistorialClinicoEntry = {
  id_historial: number;
  id_mascota: number;
  id_cita: number | null;
  fecha_consulta: string;
  motivo_consulta: string;
  diagnostico: string;
  tratamiento: string;
  observaciones: string | null;
  detalles_tratamiento?: TratamientoDetalle[];
  prescripciones?: PrescripcionDetalle[];
};

type TratamientoDetalle = {
  id_tratamiento_detalle?: number;
  id_historial: number;
  nombre_tratamiento: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
};

type PrescripcionDetalle = {
  id_prescripcion?: number;
  id_historial: number;
  id_medicamento: number;
  dosis: string;
  duracion: string | null;
  fecha_prescripcion: string;
  nombre_medicamento?: string; // Para mostrar en la UI
};

type MedicamentoCatalogo = {
  id_medicamento: number;
  nombre_generico: string;
  nombre_comercial: string | null;
  unidad_medida: string | null;
};

// Componente Modal de Confirmación (Reutilizado de VeterinarioCitas)
interface ConfirmationModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, message, onConfirm, onCancel, title = 'Confirmación' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 font-inter">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full border border-indigo-600">
        <h3 className="text-lg font-semibold text-indigo-400 mb-4">{title}</h3>
        <p className="text-white mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};


const VeterinarioHistorialClinico: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { mascotaId: urlMascotaId } = useParams<{ mascotaId?: string }>();
  const navigate = useNavigate();

  const [selectedMascota, setSelectedMascota] = useState<Mascota | null>(null);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [historialRecords, setHistorialRecords] = useState<HistorialClinicoEntry[]>([]);
  const [medicamentosCatalogo, setMedicamentosCatalogo] = useState<MedicamentoCatalogo[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Eliminado el estado 'veterinarioId' ya que no se usará para restringir la vista.

  // Estados para el formulario de nuevo registro de historial
  const [newRecord, setNewRecord] = useState<Omit<HistorialClinicoEntry, 'id_historial' | 'detalles_tratamiento' | 'prescripciones'>>({
    id_mascota: 0,
    id_cita: null,
    fecha_consulta: new Date().toISOString().split('T')[0],
    motivo_consulta: '',
    diagnostico: '',
    tratamiento: '',
    observaciones: '',
  });
  const [newTratamientosDetalles, setNewTratamientosDetalles] = useState<Omit<TratamientoDetalle, 'id_historial' | 'id_tratamiento_detalle'>[]>([]);
  const [newPrescripciones, setNewPrescripciones] = useState<Omit<PrescripcionDetalle, 'id_historial' | 'id_prescripcion'>[]>([]);

  const [currentNewTratamiento, setCurrentNewTratamiento] = useState<Omit<TratamientoDetalle, 'id_historial' | 'id_tratamiento_detalle'>>({
    nombre_tratamiento: '',
    descripcion: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
  });
  const [currentNewPrescripcion, setCurrentNewPrescripcion] = useState<Omit<PrescripcionDetalle, 'id_historial' | 'id_prescripcion' | 'nombre_medicamento'>>({
    id_medicamento: 0,
    dosis: '',
    duracion: '',
    fecha_prescripcion: new Date().toISOString().split('T')[0],
  });

  // Estado para edición
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [editedRecord, setEditedRecord] = useState<HistorialClinicoEntry | null>(null);

  // Estados para el modal de confirmación
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);
  const [confirmationTitle, setConfirmationTitle] = useState('Confirmación');

  const openConfirmationModal = (message: string, action: () => void, title?: string) => {
    setConfirmationMessage(message);
    setConfirmationAction(() => action);
    setConfirmationTitle(title || 'Confirmación');
    setShowConfirmationModal(true);
  };

  const handleConfirmationModalConfirm = () => {
    if (confirmationAction) {
      confirmationAction();
    }
    setShowConfirmationModal(false);
    setConfirmationAction(null);
  };

  const handleConfirmationModalCancel = () => {
    setShowConfirmationModal(false);
    setConfirmationAction(null);
  };


  // Carga inicial de medicamentos (necesario para todas las vistas que muestren prescripciones)
  useEffect(() => {
    const fetchMedicamentos = async () => {
      const { data: medsData, error: medsError } = await supabase
        .from('medicamentos')
        .select('id_medicamento, nombre_generico, nombre_comercial, unidad_medida');
      if (medsError) {
        console.error('Error al cargar catálogo de medicamentos:', medsError);
        setError('Error al cargar catálogo de medicamentos: ' + medsError.message);
      } else {
        setMedicamentosCatalogo(medsData || []);
      }
    };
    fetchMedicamentos();
  }, []);

  // Función para cargar el historial de una mascota específica (sin restricciones de asignación)
  const fetchHistorial = useCallback(async (mascotaId: number, currentMedicamentosCatalogo: MedicamentoCatalogo[]) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Cargar la información de la mascota
      const { data: mascotaData, error: mascotaError } = await supabase
        .from('mascotas')
        .select('*')
        .eq('id_mascota', mascotaId)
        .single();
      if (mascotaError) {
        if (mascotaError.code === 'PGRST116') { // No rows found
          throw new Error(`Mascota con ID ${mascotaId} no encontrada. Verifica el ID o las políticas RLS.`);
        }
        throw mascotaError;
      }
      setSelectedMascota(mascotaData);

      // 2. Cargar la información de su cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id_cliente', mascotaData.id_cliente)
        .single();
      if (clienteError) {
        if (clienteError.code === 'PGRST116') { // No rows found
          console.warn(`Cliente con ID ${mascotaData.id_cliente} no encontrado para la mascota ${mascotaData.nombre}.`);
          setSelectedClient(null); // Establecer como null si no se encuentra el cliente
        } else {
          throw clienteError;
        }
      } else {
        setSelectedClient(clienteData);
      }


      // 3. Cargar el historial clínico
      const { data: historialData, error: historialError } = await supabase
        .from('historial_clinico')
        .select('*')
        .eq('id_mascota', mascotaId)
        .order('fecha_consulta', { ascending: false });
      if (historialError) throw historialError;

      const processedHistorial: HistorialClinicoEntry[] = [];
      for (const entry of (historialData || [])) {
        const { data: tratamientosData, error: tratamientosError } = await supabase
          .from('tratamientos_detalles')
          .select('*')
          .eq('id_historial', entry.id_historial)
          .order('fecha_inicio', { ascending: false });
        if (tratamientosError) throw tratamientosError;

        const { data: prescripcionesData, error: prescripcionesError } = await supabase
          .from('prescripciones')
          .select('*')
          .eq('id_historial', entry.id_historial)
          .order('fecha_prescripcion', { ascending: false });
        if (prescripcionesError) throw prescripcionesError;

        const linkedPrescripciones = (prescripcionesData || []).map(p => ({
          ...p,
          nombre_medicamento: currentMedicamentosCatalogo.find(m => m.id_medicamento === p.id_medicamento)?.nombre_generico || 'Medicamento Desconocido'
        }));

        processedHistorial.push({
          ...entry,
          detalles_tratamiento: tratamientosData || [],
          prescripciones: linkedPrescripciones,
        });
      }
      setHistorialRecords(processedHistorial);
      setNewRecord(prev => ({ ...prev, id_mascota: mascotaId }));
    } catch (err: any) {
      console.error('Error al cargar historial clínico:', err);
      setError('Error al cargar historial clínico: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependencias: ninguna, ya que fetchVeterinarioId y el check de asignación se han eliminado.


  useEffect(() => {
    if (!authLoading && urlMascotaId && medicamentosCatalogo.length > 0) {
      fetchHistorial(parseInt(urlMascotaId), medicamentosCatalogo);
    }
  }, [authLoading, urlMascotaId, fetchHistorial, medicamentosCatalogo]);


  // --- Handlers para Nuevo Registro de Historial ---
  const handleNewRecordChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewRecord(prev => ({ ...prev, [name]: value }));
  };

  const handleNewTratamientoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentNewTratamiento(prev => ({ ...prev, [name]: value }));
  };

  const addTratamientoToNewRecord = () => {
    setError(null);
    if (!currentNewTratamiento.nombre_tratamiento || !currentNewTratamiento.fecha_inicio) {
      setError('Nombre y fecha de inicio del tratamiento son obligatorios.');
      return;
    }
    setNewTratamientosDetalles(prev => [...prev, { ...currentNewTratamiento }]);
    setCurrentNewTratamiento({ nombre_tratamiento: '', descripcion: '', fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin: '' });
  };

  const removeTratamientoFromNewRecord = (index: number) => {
    setNewTratamientosDetalles(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewPrescripcionChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentNewPrescripcion(prev => ({ ...prev, [name]: name === 'id_medicamento' ? parseInt(value) : value }));
  };

  const addPrescripcionToNewRecord = () => {
    setError(null);
    if (!currentNewPrescripcion.id_medicamento || !currentNewPrescripcion.dosis || !currentNewPrescripcion.fecha_prescripcion) {
      setError('Medicamento, dosis y fecha de prescripción son obligatorios.');
      return;
    }
    const medName = medicamentosCatalogo.find(m => m.id_medicamento === currentNewPrescripcion.id_medicamento)?.nombre_generico || 'Medicamento Desconocido';
    setNewPrescripciones(prev => [...prev, { ...currentNewPrescripcion, nombre_medicamento: medName }]);
    setCurrentNewPrescripcion({ id_medicamento: 0, dosis: '', duracion: '', fecha_prescripcion: new Date().toISOString().split('T')[0] });
  };

  const removePrescripcionFromNewRecord = (index: number) => {
    setNewPrescripciones(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddHistorialRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedMascota) {
      setError('No hay mascota seleccionada.');
      return;
    }
    if (!newRecord.motivo_consulta || !newRecord.diagnostico || !newRecord.tratamiento || !newRecord.fecha_consulta) {
      setError('Por favor, completa los campos obligatorios del historial clínico.');
      return;
    }

    setIsLoading(true);
    try {
      const { data: historialData, error: historialError } = await supabase
        .from('historial_clinico')
        .insert([{ ...newRecord, id_mascota: selectedMascota.id_mascota }])
        .select()
        .single();
      if (historialError) throw historialError;

      const id_historial_nuevo = historialData.id_historial;

      for (const tratamiento of newTratamientosDetalles) {
        const { error: tratamientoError } = await supabase
          .from('tratamientos_detalles')
          .insert([{ ...tratamiento, id_historial: id_historial_nuevo }]);
        if (tratamientoError) throw tratamientoError;
      }

      for (const prescripcion of newPrescripciones) {
        const { error: prescripcionError } = await supabase
          .from('prescripciones')
          .insert([{ ...prescripcion, id_historial: id_historial_nuevo }]);
        if (prescripcionError) throw prescripcionError;
      }

      // Recargar el historial para que se muestren los nuevos datos
      if (selectedMascota) {
        await fetchHistorial(selectedMascota.id_mascota, medicamentosCatalogo);
      }
      setNewRecord({
        id_mascota: selectedMascota.id_mascota,
        id_cita: null,
        fecha_consulta: new Date().toISOString().split('T')[0],
        motivo_consulta: '',
        diagnostico: '',
        tratamiento: '',
        observaciones: '',
      });
      setNewTratamientosDetalles([]);
      setNewPrescripciones([]);

    } catch (err: any) {
      console.error('Error al añadir registro de historial:', err);
      setError('Error al añadir registro de historial: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers para Edición ---
  const handleEditClick = (record: HistorialClinicoEntry) => {
    setEditingRecordId(record.id_historial);
    setEditedRecord({ ...record });
    // Asegurarse de que los detalles de tratamientos y prescripciones se copian correctamente
    setNewTratamientosDetalles(record.detalles_tratamiento ? [...record.detalles_tratamiento] : []);
    setNewPrescripciones(record.prescripciones ? [...record.prescripciones] : []);
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setEditedRecord(null);
    setNewTratamientosDetalles([]);
    setNewPrescripciones([]);
  };

  const handleEditedRecordChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedRecord(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!editedRecord || !editingRecordId) {
      setError('No hay registro para editar.');
      return;
    }
    if (!editedRecord.motivo_consulta || !editedRecord.diagnostico || !editedRecord.tratamiento || !editedRecord.fecha_consulta) {
      setError('Por favor, completa los campos obligatorios del historial clínico.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateHistorialError } = await supabase
        .from('historial_clinico')
        .update({
          fecha_consulta: editedRecord.fecha_consulta,
          motivo_consulta: editedRecord.motivo_consulta,
          diagnostico: editedRecord.diagnostico,
          tratamiento: editedRecord.tratamiento,
          observaciones: editedRecord.observaciones,
        })
        .eq('id_historial', editingRecordId);
      if (updateHistorialError) throw updateHistorialError;

      // Eliminar y reinsertar tratamientos
      const { error: deleteTreatmentsError } = await supabase
        .from('tratamientos_detalles')
        .delete()
        .eq('id_historial', editingRecordId);
      if (deleteTreatmentsError) throw deleteTreatmentsError;

      for (const tratamiento of newTratamientosDetalles) {
        const { error: insertTratamientoError } = await supabase
          .from('tratamientos_detalles')
          .insert([{ ...tratamiento, id_historial: editingRecordId }]);
        if (insertTratamientoError) throw insertTratamientoError;
      }

      // Eliminar y reinsertar prescripciones
      const { error: deletePrescriptionsError } = await supabase
        .from('prescripciones')
        .delete()
        .eq('id_historial', editingRecordId);
      if (deletePrescriptionsError) throw deletePrescriptionsError;

      for (const prescripcion of newPrescripciones) {
        const { error: insertPrescripcionError } = await supabase
          .from('prescripciones')
          .insert([{
            id_historial: editingRecordId,
            id_medicamento: prescripcion.id_medicamento,
            dosis: prescripcion.dosis,
            duracion: prescripcion.duracion,
            fecha_prescripcion: prescripcion.fecha_prescripcion,
          }]);
        if (insertPrescripcionError) throw insertPrescripcionError;
      }

      if (selectedMascota) {
        await fetchHistorial(selectedMascota.id_mascota, medicamentosCatalogo);
      }
      setEditingRecordId(null);
      setEditedRecord(null);
      setNewTratamientosDetalles([]);
      setNewPrescripciones([]);
    } catch (err: any) {
      console.error('Error al actualizar registro de historial:', err);
      setError('Error al actualizar registro de historial: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecord = async (id_historial: number) => {
    openConfirmationModal(
      '¿Estás seguro de que quieres eliminar este registro de historial clínico y todos sus tratamientos y prescripciones asociados? Esta acción no se puede deshacer.',
      async () => {
        setIsLoading(true);
        setError(null);
        try {
          // Eliminar tratamientos_detalles asociados
          const { error: deleteTreatmentsError } = await supabase
            .from('tratamientos_detalles')
            .delete()
            .eq('id_historial', id_historial);
          if (deleteTreatmentsError) throw deleteTreatmentsError;

          // Eliminar prescripciones asociadas
          const { error: deletePrescriptionsError } = await supabase
            .from('prescripciones')
            .delete()
            .eq('id_historial', id_historial);
          if (deletePrescriptionsError) throw deletePrescriptionsError;

          // Finalmente, eliminar el registro de historial_clinico
          const { error: historialError } = await supabase
            .from('historial_clinico')
            .delete()
            .eq('id_historial', id_historial);
          if (historialError) throw historialError;

          setHistorialRecords(prev => prev.filter(rec => rec.id_historial !== id_historial));
        } catch (err: any) {
          console.error('Error al eliminar registro:', err);
          setError('Error al eliminar registro: ' + err.message);
        } finally {
          setIsLoading(false);
        }
      },
      'Confirmar Eliminación'
    );
  };


  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <Loader2 className="animate-spin mr-2" size={24} />
        <p className="text-xl text-green-400">Cargando historial clínico...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 text-white min-h-screen font-inter">
        <div className="bg-red-800 p-4 rounded-md text-red-100 mb-4 flex items-center">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <div>
            <p className="font-bold">Error:</p>
            <p>{error}</p>
            <p className="text-sm mt-2">Asegúrate de que estás autenticado como veterinario y que las tablas y sus políticas RLS están configuradas correctamente.</p>
          </div>
        </div>
        <button
          onClick={() => {
            setError(null);
            if (urlMascotaId) {
              fetchHistorial(parseInt(urlMascotaId), medicamentosCatalogo);
            } else {
              navigate('/veterinario-dashboard/mis-mascotas');
            }
          }}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition shadow-md"
        >
          Reintentar Carga / Volver
        </button>
      </div>
    );
  }

  if (!selectedMascota) {
    return (
      <div className="p-6 bg-gray-900 text-white min-h-screen font-inter">
        <div className="bg-red-800 p-4 rounded-md text-red-100 mb-4">
          <p>Error: No se encontró información para la mascota con ID {urlMascotaId}. Esto podría deberse a un ID incorrecto o problemas de permisos (RLS).</p>
        </div>
        <button
          onClick={() => navigate('/veterinario-dashboard/mis-mascotas')}
          className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition shadow-md"
        >
          <ArrowLeft size={18} className="mr-2" /> Volver a Mis Mascotas
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 text-white space-y-12 min-h-screen font-inter">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/veterinario-dashboard/mis-mascotas')}
          className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition shadow-md"
        >
          <ArrowLeft size={18} className="mr-2" /> Volver a Mis Mascotas
        </button>
        <h2 className="text-3xl font-extrabold text-green-400 text-center flex-grow">
          Historial Clínico de {selectedMascota.nombre}
        </h2>
        <div className="w-24"></div> {/* Espaciador para centrar el título */}
      </div>

      <ConfirmationModal
        isOpen={showConfirmationModal}
        message={confirmationMessage}
        onConfirm={handleConfirmationModalConfirm}
        onCancel={handleConfirmationModalCancel}
        title={confirmationTitle}
      />

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
        <h3 className="text-xl font-semibold text-green-300 mb-4">Información de la Mascota y Cliente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
          <p><strong className="text-green-200">Nombre Mascota:</strong> {selectedMascota.nombre}</p>
          <p><strong className="text-green-200">Especie:</strong> {selectedMascota.especie}</p>
          <p><strong className="text-green-200">Raza:</strong> {selectedMascota.raza || 'N/A'}</p>
          <p><strong className="text-green-200">Fecha Nacimiento:</strong> {selectedMascota.fecha_nacimiento}</p>
          <p><strong className="text-green-200">Peso:</strong> {selectedMascota.peso || 'N/A'} kg</p>
          <p><strong className="text-green-200">Edad:</strong> {selectedMascota.edad || 'N/A'} años</p>
          {selectedClient ? (
            <>
              <p><strong className="text-green-200">Propietario:</strong> {selectedClient.nombre} {selectedClient.apellido}</p>
              <p><strong className="text-green-200">Email Propietario:</strong> {selectedClient.email}</p>
              <p><strong className="text-green-200">Teléfono Propietario:</strong> {selectedClient.telefono}</p>
            </>
          ) : (
            <p className="text-yellow-400 col-span-2">Información del cliente no disponible o no asociada.</p>
          )}
        </div>
      </div>

      {/* Formulario para Añadir Nuevo Registro */}
      <div className="bg-gray-700 p-6 rounded-lg shadow-md mb-8">
        <h4 className="text-xl font-semibold text-green-300 mb-4 flex items-center gap-2">
          <PlusCircle size={20} /> Añadir Nuevo Registro Clínico
        </h4>
        <form onSubmit={handleAddHistorialRecord} className="space-y-4">
          <div>
            <label htmlFor="fecha_consulta" className="block text-sm font-medium text-gray-300">Fecha de Consulta:</label>
            <input
              type="date"
              id="fecha_consulta"
              name="fecha_consulta"
              value={newRecord.fecha_consulta}
              onChange={handleNewRecordChange}
              className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
          <div>
            <label htmlFor="motivo_consulta" className="block text-sm font-medium text-gray-300">Motivo de Consulta:</label>
            <textarea
              id="motivo_consulta"
              name="motivo_consulta"
              value={newRecord.motivo_consulta}
              onChange={handleNewRecordChange}
              rows={2}
              className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-green-500 focus:border-green-500"
              required
            ></textarea>
          </div>
          <div>
            <label htmlFor="diagnostico" className="block text-sm font-medium text-gray-300">Diagnóstico:</label>
            <textarea
              id="diagnostico"
              name="diagnostico"
              value={newRecord.diagnostico}
              onChange={handleNewRecordChange}
              rows={3}
              className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-green-500 focus:border-green-500"
              required
            ></textarea>
          </div>
          <div>
            <label htmlFor="tratamiento" className="block text-sm font-medium text-gray-300">Resumen de Tratamiento:</label>
            <textarea
              id="tratamiento"
              name="tratamiento"
              value={newRecord.tratamiento}
              onChange={handleNewRecordChange}
              rows={3}
              className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-green-500 focus:border-green-500"
              required
            ></textarea>
          </div>
          <div>
            <label htmlFor="observaciones" className="block text-sm font-medium text-gray-300">Observaciones (Opcional):</label>
            <textarea
              id="observaciones"
              name="observaciones"
              value={newRecord.observaciones || ''}
              onChange={handleNewRecordChange}
              rows={2}
              className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-green-500 focus:border-green-500"
            ></textarea>
          </div>

          {/* Sección para Añadir Detalles de Tratamiento */}
          <div className="border-t border-gray-600 pt-4 mt-4">
            <h5 className="text-lg font-semibold text-green-400 mb-3">Añadir Detalles de Tratamiento</h5>
            <div className="space-y-2 mb-3">
              {newTratamientosDetalles.map((trat, idx) => (
                <div key={idx} className="bg-gray-600 p-2 rounded-md flex justify-between items-center">
                  <p className="text-gray-200">{trat.nombre_tratamiento} ({new Date(trat.fecha_inicio).toLocaleDateString()})</p>
                  <button type="button" onClick={() => removeTratamientoFromNewRecord(idx)} className="text-red-400 hover:text-red-500"><XCircle size={16} /></button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                name="nombre_tratamiento"
                placeholder="Nombre Tratamiento"
                value={currentNewTratamiento.nombre_tratamiento}
                onChange={handleNewTratamientoChange}
                className="p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
              />
              <input
                type="text"
                name="descripcion"
                placeholder="Descripción"
                value={currentNewTratamiento.descripcion || ''}
                onChange={handleNewTratamientoChange}
                className="p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
              />
              <label className="block text-sm font-medium text-gray-300">Inicio:</label>
              <input
                type="date"
                name="fecha_inicio"
                value={currentNewTratamiento.fecha_inicio}
                onChange={handleNewTratamientoChange}
                className="p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
              />
              <label className="block text-sm font-medium text-gray-300">Fin (Opcional):</label>
              <input
                type="date"
                name="fecha_fin"
                value={currentNewTratamiento.fecha_fin || ''}
                onChange={handleNewTratamientoChange}
                className="p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
              />
            </div>
            <button type="button" onClick={addTratamientoToNewRecord} className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
              Añadir Detalle de Tratamiento
            </button>
          </div>

          {/* Sección para Añadir Prescripciones */}
          <div className="border-t border-gray-600 pt-4 mt-4">
            <h5 className="text-lg font-semibold text-green-400 mb-3">Añadir Prescripciones</h5>
            <div className="space-y-2 mb-3">
              {newPrescripciones.map((presc, idx) => (
                <div key={idx} className="bg-gray-600 p-2 rounded-md flex justify-between items-center">
                  <p className="text-gray-200">{presc.nombre_medicamento} - {presc.dosis} ({new Date(presc.fecha_prescripcion).toLocaleDateString()})</p>
                  <button type="button" onClick={() => removePrescripcionFromNewRecord(idx)} className="text-red-400 hover:text-red-500"><XCircle size={16} /></button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="presc_medicamento" className="block text-sm font-medium text-gray-300">Medicamento:</label>
                <select
                  id="presc_medicamento"
                  name="id_medicamento"
                  value={currentNewPrescripcion.id_medicamento || ''}
                  onChange={handleNewPrescripcionChange}
                  className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                >
                  <option value="">Selecciona un medicamento</option>
                  {medicamentosCatalogo.map(med => (
                        <option key={med.id_medicamento} value={med.id_medicamento}>
                          {med.nombre_generico} ({med.nombre_comercial || med.unidad_medida})
                        </option>
                      ))}
                </select>
              </div>
              <div>
                <label htmlFor="presc_dosis" className="block text-sm font-medium text-gray-300">Dosis:</label>
                <input
                  type="text"
                  id="presc_dosis"
                  name="dosis"
                  placeholder="Ej. 10mg cada 8h"
                  value={currentNewPrescripcion.dosis}
                  onChange={handleNewPrescripcionChange}
                  className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                />
              </div>
              <div>
                <label htmlFor="presc_duracion" className="block text-sm font-medium text-gray-300">Duración (Opcional):</label>
                <input
                  type="text"
                  id="presc_duracion"
                  name="duracion"
                  placeholder="Ej. 7 días"
                  value={currentNewPrescripcion.duracion || ''}
                  onChange={handleNewPrescripcionChange}
                  className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                />
              </div>
              <div>
                <label htmlFor="presc_fecha" className="block text-sm font-medium text-gray-300">Fecha Prescripción:</label>
                <input
                  type="date"
                  id="presc_fecha"
                  name="fecha_prescripcion"
                  value={currentNewPrescripcion.fecha_prescripcion}
                  onChange={handleNewPrescripcionChange}
                  className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                />
              </div>
            </div>
            <button type="button" onClick={addPrescripcionToNewRecord} className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
              Añadir Prescripción
            </button>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {isLoading ? 'Guardando...' : 'Guardar Nuevo Registro'}
          </button>
        </form>
      </div>

      {/* Listado de Registros de Historial Clínico */}
      <section className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-2xl text-green-300 mb-6 font-semibold">Registros Clínicos Anteriores</h3>
        {historialRecords.length === 0 ? (
          <p className="text-gray-400">No hay registros de historial clínico para esta mascota.</p>
        ) : (
          <div className="space-y-6">
            {historialRecords.map((record) => (
              <div key={record.id_historial} className="bg-gray-700 p-4 rounded-md border border-gray-600">
                {editingRecordId === record.id_historial ? (
                  // Formulario de Edición
                  <form onSubmit={handleUpdateRecord} className="space-y-4">
                    <div>
                      <label htmlFor={`edit_fecha_consulta_${record.id_historial}`} className="block text-sm font-medium text-gray-300">Fecha de Consulta:</label>
                      <input
                        type="date"
                        id={`edit_fecha_consulta_${record.id_historial}`}
                        name="fecha_consulta"
                        value={editedRecord?.fecha_consulta || ''}
                        onChange={handleEditedRecordChange}
                        className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor={`edit_motivo_consulta_${record.id_historial}`} className="block text-sm font-medium text-gray-300">Motivo de Consulta:</label>
                      <textarea
                        id={`edit_motivo_consulta_${record.id_historial}`}
                        name="motivo_consulta"
                        value={editedRecord?.motivo_consulta || ''}
                        onChange={handleEditedRecordChange}
                        rows={2}
                        className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                        required
                      ></textarea>
                    </div>
                    <div>
                      <label htmlFor={`edit_diagnostico_${record.id_historial}`} className="block text-sm font-medium text-gray-300">Diagnóstico:</label>
                      <textarea
                        id={`edit_diagnostico_${record.id_historial}`}
                        name="diagnostico"
                        value={editedRecord?.diagnostico || ''}
                        onChange={handleEditedRecordChange}
                        rows={3}
                        className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                        required
                      ></textarea>
                    </div>
                    <div>
                      <label htmlFor={`edit_tratamiento_${record.id_historial}`} className="block text-sm font-medium text-gray-300">Resumen de Tratamiento:</label>
                      <textarea
                        id={`edit_tratamiento_${record.id_historial}`}
                        name="tratamiento"
                        value={editedRecord?.tratamiento || ''}
                        onChange={handleEditedRecordChange}
                        rows={3}
                        className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                        required
                      ></textarea>
                    </div>
                    <div>
                      <label htmlFor={`edit_observaciones_${record.id_historial}`} className="block text-sm font-medium text-gray-300">Observaciones (Opcional):</label>
                      <textarea
                        id={`edit_observaciones_${record.id_historial}`}
                        name="observaciones"
                        value={editedRecord?.observaciones || ''}
                        onChange={handleEditedRecordChange}
                        rows={2}
                        className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                      ></textarea>
                    </div>

                    {/* Sección para Editar Detalles de Tratamiento */}
                    <div className="border-t border-gray-600 pt-4 mt-4">
                      <h5 className="text-lg font-semibold text-green-400 mb-3">Detalles de Tratamiento</h5>
                      <div className="space-y-2 mb-3">
                        {newTratamientosDetalles.map((trat, idx) => (
                          <div key={idx} className="bg-gray-600 p-2 rounded-md flex justify-between items-center">
                            <p className="text-gray-200">{trat.nombre_tratamiento} ({new Date(trat.fecha_inicio).toLocaleDateString()})</p>
                            <button type="button" onClick={() => removeTratamientoFromNewRecord(idx)} className="text-red-400 hover:text-red-500"><XCircle size={16} /></button>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          name="nombre_tratamiento"
                          placeholder="Nombre Tratamiento"
                          value={currentNewTratamiento.nombre_tratamiento}
                          onChange={handleNewTratamientoChange}
                          className="p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                        />
                        <input
                          type="text"
                          name="descripcion"
                          placeholder="Descripción"
                          value={currentNewTratamiento.descripcion || ''}
                          onChange={handleNewTratamientoChange}
                          className="p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                        />
                        <label className="block text-sm font-medium text-gray-300">Inicio:</label>
                        <input
                          type="date"
                          name="fecha_inicio"
                          value={currentNewTratamiento.fecha_inicio}
                          onChange={handleNewTratamientoChange}
                          className="p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                        />
                        <label className="block text-sm font-medium text-gray-300">Fin (Opcional):</label>
                        <input
                          type="date"
                          name="fecha_fin"
                          value={currentNewTratamiento.fecha_fin || ''}
                          onChange={handleNewTratamientoChange}
                          className="p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                        />
                      </div>
                      <button type="button" onClick={addTratamientoToNewRecord} className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                        Añadir Detalle de Tratamiento
                      </button>
                    </div>

                    {/* Sección para Editar Prescripciones */}
                    <div className="border-t border-gray-600 pt-4 mt-4">
                      <h5 className="text-lg font-semibold text-green-400 mb-3">Prescripciones</h5>
                      <div className="space-y-2 mb-3">
                        {newPrescripciones.map((presc, idx) => (
                          <div key={idx} className="bg-gray-600 p-2 rounded-md flex justify-between items-center">
                            <p className="text-gray-200">{presc.nombre_medicamento} - {presc.dosis} ({new Date(presc.fecha_prescripcion).toLocaleDateString()})</p>
                            <button type="button" onClick={() => removePrescripcionFromNewRecord(idx)} className="text-red-400 hover:text-red-500"><XCircle size={16} /></button>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="edit_presc_medicamento" className="block text-sm font-medium text-gray-300">Medicamento:</label>
                          <select
                            id="edit_presc_medicamento"
                            name="id_medicamento"
                            value={currentNewPrescripcion.id_medicamento || ''}
                            onChange={handleNewPrescripcionChange}
                            className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                          >
                            <option value="">Selecciona un medicamento</option>
                            {medicamentosCatalogo.map(med => (
                                  <option key={med.id_medicamento} value={med.id_medicamento}>
                                    {med.nombre_generico} ({med.nombre_comercial || med.unidad_medida})
                                  </option>
                                ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="edit_presc_dosis" className="block text-sm font-medium text-gray-300">Dosis:</label>
                          <input
                            type="text"
                            id="edit_presc_dosis"
                            name="dosis"
                            placeholder="Ej. 10mg cada 8h"
                            value={currentNewPrescripcion.dosis}
                            onChange={handleNewPrescripcionChange}
                            className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                          />
                        </div>
                        <div>
                          <label htmlFor="edit_presc_duracion" className="block text-sm font-medium text-gray-300">Duración (Opcional):</label>
                          <input
                            type="text"
                            id="edit_presc_duracion"
                            name="duracion"
                            placeholder="Ej. 7 días"
                            value={currentNewPrescripcion.duracion || ''}
                            onChange={handleNewPrescripcionChange}
                            className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                          />
                        </div>
                        <div>
                          <label htmlFor="edit_presc_fecha" className="block text-sm font-medium text-gray-300">Fecha Prescripción:</label>
                          <input
                            type="date"
                            id="edit_presc_fecha"
                            name="fecha_prescripcion"
                            value={currentNewPrescripcion.fecha_prescripcion}
                            onChange={handleNewPrescripcionChange}
                            className="mt-1 block w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                          />
                        </div>
                      </div>
                      <button type="button" onClick={addPrescripcionToNewRecord} className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                        Añadir Prescripción
                      </button>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition flex items-center gap-2"
                      >
                        <XCircle size={20} /> Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center gap-2"
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </div>
                  </form>
                ) : (
                  // Vista de Registro Normal
                  <>
                    <p className="text-lg font-semibold text-white mb-2">
                      <span className="text-green-300">Fecha:</span> {new Date(record.fecha_consulta).toLocaleDateString()}
                    </p>
                    <p className="text-gray-300 text-base mb-1">
                      <strong className="text-green-200">Motivo:</strong> {record.motivo_consulta}
                    </p>
                    <p className="text-gray-300 text-base mb-1">
                      <strong className="text-green-200">Diagnóstico:</strong> {record.diagnostico}
                    </p>
                    <p className="text-gray-300 text-base mb-1">
                      <strong className="text-green-200">Tratamiento:</strong> {record.tratamiento}
                    </p>
                    {record.observaciones && (
                      <p className="text-gray-300 text-base mb-1">
                        <strong className="text-green-200">Observaciones:</strong> {record.observaciones}
                      </p>
                    )}

                    {record.detalles_tratamiento && record.detalles_tratamiento.length > 0 && (
                      <div className="mt-4 border-t border-gray-600 pt-3">
                        <h5 className="text-md font-semibold text-green-400 mb-2">Detalles de Tratamiento:</h5>
                        <ul className="list-disc list-inside text-gray-300">
                          {record.detalles_tratamiento.map((det, idx) => (
                            <li key={idx}>
                              {det.nombre_tratamiento}: {det.descripcion || 'Sin descripción'} (Inicio: {new Date(det.fecha_inicio).toLocaleDateString()} {det.fecha_fin ? ` - Fin: ${new Date(det.fecha_fin).toLocaleDateString()}` : ''})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {record.prescripciones && record.prescripciones.length > 0 && (
                      <div className="mt-4 border-t border-gray-600 pt-3">
                        <h5 className="text-md font-semibold text-green-400 mb-2">Prescripciones:</h5>
                        <ul className="list-disc list-inside text-gray-300">
                          {record.prescripciones.map((presc, idx) => (
                            <li key={idx}>
                              {presc.nombre_medicamento}: {presc.dosis} (Duración: {presc.duracion || 'N/A'}) - {new Date(presc.fecha_prescripcion).toLocaleDateString()}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleEditClick(record)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition flex items-center gap-1"
                      >
                        <Edit size={16} /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(record.id_historial)}
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition flex items-center gap-1"
                      >
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default VeterinarioHistorialClinico;

