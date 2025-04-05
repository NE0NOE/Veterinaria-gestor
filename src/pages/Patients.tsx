import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Patient } from '../types';
import * as patientService from '../services/patientService';
import PatientModal from '../components/PatientModal'; // Import the modal

const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // State for modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedPatients = patientService.getAllPatients();
      setPatients(fetchedPatients);
    } catch (err) {
      console.error("Error fetching patients:", err);
      setError("No se pudo cargar la lista de pacientes.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPatient = () => {
    setEditingPatient(null); // Ensure we are adding, not editing
    setIsModalOpen(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  const handleDeletePatient = (id: string) => {
    setError(null);
    if (window.confirm('¿Estás seguro de que quieres eliminar este paciente?')) {
      try {
        const success = patientService.deletePatient(id);
        if (success) {
          setPatients(patients.filter(p => p.id !== id));
        } else {
          setError("No se pudo encontrar o eliminar el paciente.");
        }
      } catch (err) {
        console.error("Error deleting patient:", err);
        setError("No se pudo eliminar el paciente.");
      }
    }
  };

  const handleSavePatient = (patientData: Omit<Patient, 'id'> | Patient) => {
    setError(null);
    try {
      let savedPatient: Patient | undefined;
      if ('id' in patientData) {
        // Editing existing patient
        savedPatient = patientService.updatePatient(patientData.id, patientData);
        if (savedPatient) {
          setPatients(patients.map(p => p.id === savedPatient!.id ? savedPatient! : p));
        } else {
           setError("No se pudo actualizar el paciente.");
        }
      } else {
        // Adding new patient
        savedPatient = patientService.addPatient(patientData);
        setPatients([...patients, savedPatient]);
      }
      setIsModalOpen(false); // Close modal on successful save
    } catch (err) {
      console.error("Error saving patient:", err);
      setError("No se pudo guardar el paciente.");
      // Keep modal open in case of error? Or close? User preference. Closing for now.
      // setIsModalOpen(false);
    }
  };


  // Basic date formatting
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    // Ensure date is treated as UTC to avoid timezone shifts on display
    try {
        // Split the date string and create Date object as UTC
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
            const day = parseInt(parts[2], 10);
            const date = new Date(Date.UTC(year, month, day));

             // Check if the date is valid after parsing
            if (isNaN(date.getTime())) {
                return 'Fecha inválida';
            }

            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                timeZone: 'UTC' // Specify UTC timezone for formatting
            });
        }
        return 'Formato inválido';

    } catch (e) {
      console.error("Error formatting date:", e);
      return 'Fecha inválida';
    }
  };


  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
         <div>
           <h1 className="text-3xl font-bold text-gray-800">Gestión de Pacientes</h1>
           <p className="text-sm text-gray-500">Administra la información de los pacientes</p>
         </div>
        <button
          onClick={handleAddPatient}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded inline-flex items-center transition duration-150 ease-in-out"
        >
          <Plus size={18} className="mr-2" />
          Añadir Paciente
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

      {isLoading ? (
        <p className="text-center text-gray-500">Cargando pacientes...</p>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especie</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raza</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propietario</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">F. Nacimiento</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No hay pacientes registrados.</td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.species}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.breed}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.ownerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(patient.dob)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditPatient(patient)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeletePatient(patient.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Render the Modal */}
      <PatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePatient}
        patientToEdit={editingPatient}
      />
    </div>
  );
};

export default Patients;
