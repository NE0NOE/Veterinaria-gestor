import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Appointment } from '../types';
import * as appointmentService from '../services/appointmentService'; // Import service functions

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null); // Store ID of appointment being edited
  const [currentAppointment, setCurrentAppointment] = useState<Omit<Appointment, 'id' | 'status'>>({
    date: '',
    time: '',
    petName: '',
    clientName: '',
    service: '',
    notes: '',
  });

  // Load appointments on component mount
  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = () => {
    const fetchedAppointments = appointmentService.getAppointments();
    // Sort by date and time for better display
    fetchedAppointments.sort((a, b) => {
      const dateComparison = a.date.localeCompare(b.date);
      if (dateComparison !== 0) return dateComparison;
      return a.time.localeCompare(b.time);
    });
    setAppointments(fetchedAppointments);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentAppointment(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setCurrentAppointment({
      date: '',
      time: '',
      petName: '',
      clientName: '',
      service: '',
      notes: '',
    });
    setIsEditing(null);
    setShowForm(false);
  };

  const handleAddAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      // Update logic
      const appointmentToUpdate: Appointment = {
        ...currentAppointment,
        id: isEditing,
        status: appointments.find(a => a.id === isEditing)?.status || 'scheduled', // Keep original status or default
      };
      const success = appointmentService.updateAppointment(appointmentToUpdate);
      if (success) {
        loadAppointments(); // Reload the list
        resetForm();
      } else {
        alert('Error al actualizar la cita.'); // Basic error handling
      }
    } else {
      // Add new logic
      const newAppointmentData: Omit<Appointment, 'id'> = {
        ...currentAppointment,
        status: 'scheduled', // Default status for new appointments
      };
      appointmentService.addAppointment(newAppointmentData);
      loadAppointments(); // Reload the list
      resetForm();
    }
  };

  const handleEditClick = (appointment: Appointment) => {
    setIsEditing(appointment.id);
    setCurrentAppointment({
      date: appointment.date,
      time: appointment.time,
      petName: appointment.petName,
      clientName: appointment.clientName,
      service: appointment.service,
      notes: appointment.notes || '',
    });
    setShowForm(true); // Show form when editing
  };

  const handleDeleteClick = (appointmentId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta cita?')) {
      const success = appointmentService.deleteAppointment(appointmentId);
      if (success) {
        loadAppointments(); // Reload the list
      } else {
        alert('Error al eliminar la cita.'); // Basic error handling
      }
    }
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const toggleForm = () => {
    if (showForm && isEditing) {
      // If closing the form while editing, reset edit state
      resetForm();
    } else {
      setShowForm(!showForm);
      // Ensure form is reset if opening for a new entry
      if (!showForm) {
        setIsEditing(null);
         setCurrentAppointment({ date: '', time: '', petName: '', clientName: '', service: '', notes: '' });
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Citas</h1>
        <button
          onClick={toggleForm}
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          {showForm ? (isEditing ? 'Cancelar Edición' : 'Cancelar') : 'Añadir Cita'}
        </button>
      </div>

      {/* Form Section (Conditional Rendering) */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">{isEditing ? 'Editar Cita' : 'Añadir Nueva Cita'}</h2>
          <form onSubmit={handleAddAppointment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={currentAppointment.date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={currentAppointment.time}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="petName" className="block text-sm font-medium text-gray-700 mb-1">Nombre Mascota</label>
                <input
                  type="text"
                  id="petName"
                  name="petName"
                  value={currentAppointment.petName}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: Buddy"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">Nombre Cliente</label>
                <input
                  type="text"
                  id="clientName"
                  name="clientName"
                  value={currentAppointment.clientName}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
              <input
                type="text"
                id="service"
                name="service"
                value={currentAppointment.service}
                onChange={handleInputChange}
                required
                placeholder="Ej: Peluquería, Vacunación"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
             <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notas (Opcional)</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={currentAppointment.notes}
                  onChange={handleInputChange}
                  placeholder="Alergias conocidas, comportamiento, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            <div className="flex justify-end space-x-3">
               <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isEditing ? 'Actualizar Cita' : 'Guardar Cita'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Appointments List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <h2 className="text-xl font-semibold p-4 border-b border-gray-200 text-gray-700">Lista de Citas</h2>
        {appointments.length === 0 ? (
          <p className="p-4 text-gray-500">No hay citas programadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mascota</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicio</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.petName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appointment.clientName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{appointment.service}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                       <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                         appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                         appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                         'bg-red-100 text-red-800' // cancelled
                       }`}>
                         {appointment.status === 'scheduled' ? 'Programada' : appointment.status === 'completed' ? 'Completada' : 'Cancelada'}
                       </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => handleEditClick(appointment)} className="text-indigo-600 hover:text-indigo-900" title="Editar">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteClick(appointment.id)} className="text-red-600 hover:text-red-900" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {/* Add button to change status later */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Appointments;
