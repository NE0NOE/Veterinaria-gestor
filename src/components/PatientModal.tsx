import React, { useState, useEffect } from 'react';
import { Patient } from '../types';
import { X } from 'lucide-react';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Omit<Patient, 'id'> | Patient) => void;
  patientToEdit?: Patient | null;
}

const PatientModal: React.FC<PatientModalProps> = ({ isOpen, onClose, onSave, patientToEdit }) => {
  const initialFormData: Omit<Patient, 'id'> = {
    name: '',
    species: '',
    breed: '',
    ownerName: '',
    dob: '',
  };
  const [formData, setFormData] = useState<Omit<Patient, 'id'>>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (patientToEdit) {
        setFormData({
          name: patientToEdit.name,
          species: patientToEdit.species,
          breed: patientToEdit.breed,
          ownerName: patientToEdit.ownerName,
          dob: patientToEdit.dob || '',
        });
      } else {
        setFormData(initialFormData);
      }
      setErrors({}); // Clear errors when modal opens or patient changes
    }
  }, [patientToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear specific error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es obligatorio.';
    if (!formData.species.trim()) newErrors.species = 'La especie es obligatoria.';
    if (!formData.breed.trim()) newErrors.breed = 'La raza es obligatoria.';
    if (!formData.ownerName.trim()) newErrors.ownerName = 'El nombre del propietario es obligatorio.';
    // Basic date validation (YYYY-MM-DD)
    if (formData.dob && !/^\d{4}-\d{2}-\d{2}$/.test(formData.dob)) {
       newErrors.dob = 'Formato de fecha inválido (AAAA-MM-DD).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    if (patientToEdit) {
      onSave({ ...formData, id: patientToEdit.id });
    } else {
      onSave(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold dark:text-gray-200">{patientToEdit ? 'Editar Paciente' : 'Nuevo Paciente'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Paciente</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 ${errors.name ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Species */}
            <div>
              <label htmlFor="species" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Especie</label>
              <input
                type="text"
                id="species"
                name="species"
                value={formData.species}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 ${errors.species ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.species && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.species}</p>}
            </div>

            {/* Breed */}
            <div>
              <label htmlFor="breed" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Raza</label>
              <input
                type="text"
                id="breed"
                name="breed"
                value={formData.breed}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 ${errors.breed ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.breed && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.breed}</p>}
            </div>

            {/* Owner Name */}
            <div>
              <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Propietario</label>
              <input
                type="text"
                id="ownerName"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 ${errors.ownerName ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.ownerName && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.ownerName}</p>}
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Nacimiento (Opcional)</label>
              <input
                type="date" // Use type="date" for better UX
                id="dob"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 ${errors.dob ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
                placeholder="AAAA-MM-DD"
              />
               {errors.dob && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.dob}</p>}
            </div>

          </div>
          <div className="flex justify-end p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientModal;
