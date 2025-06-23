import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient'; // Asegúrate de que esta ruta sea correcta
import { useNavigate } from 'react-router-dom';

// --- CONFIGURACIÓN DE DISPONIBILIDAD PARA SOLICITUDES DE CITAS PÚBLICAS ---
// Máximo de solicitudes de citas públicas que la clínica acepta por día.
const MAX_PUBLIC_APPOINTMENT_REQUESTS_PER_DAY = 15;
// Franjas horarias predefinidas en las que la clínica considera iniciar una cita.
// ¡AJUSTADO PARA TERMINAR A LAS 16:00 (4 PM)!
const AVAILABLE_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00' // Termina a las 16:00
];
// --- FIN DE CONFIGURACIÓN ---

const CreateAppointment = () => {
  const [form, setForm] = useState({
    nombre: '',
    email: '', // Campo de correo electrónico, ahora opcional
    telefono: '',
    fecha: '', // Solo la parte de la fecha (YYYY-MM-DD)
    motivo: '', // Motivo de la cita, seleccionado de una lista
    nombre_mascota: '',
    recordatorio: false,
    hora: '', // Franja horaria de inicio seleccionada (HH:MM)
  });
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const navigate = useNavigate();

  // Función para obtener la fecha mínima seleccionable (hoy o en el futuro)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Función para verificar si una fecha cae entre lunes y sábado
  const isWeekdayOrSaturday = (dateString: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0: Domingo, 1: Lunes, ..., 6: Sábado
    return dayOfWeek >= 1 && dayOfWeek <= 6; // Verdadero para Lunes a Sábado
  };

  // Función para obtener las horas de inicio de las solicitudes de citas existentes para una fecha dada
  const fetchBookedAppointmentStartTimes = useCallback(async (date: string): Promise<string[]> => {
    if (!date) return [];
    setLoadingAvailability(true);
    setError(null);

    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data, error: fetchError } = await supabase
      .from('citas_publicas')
      .select('fecha') // 'fecha' en tu DB es TIMESTAMP WITHOUT TIME ZONE
      .gte('fecha', startOfDay)
      .lt('fecha', endOfDay);

    setLoadingAvailability(false);

    if (fetchError) {
      console.error('Error al obtener solicitudes de citas existentes:', fetchError);
      setError('Error al cargar la disponibilidad de solicitudes. Por favor, intenta de nuevo más tarde.');
      return [];
    }

    const bookedStartTimes = data.map(cita => {
      const dateTime = new Date(cita.fecha);
      return dateTime.toTimeString().substring(0, 5);
    });
    return bookedStartTimes;
  }, []);

  // Efecto para calcular y actualizar las franjas horarias disponibles
  useEffect(() => {
    const calculateAndSetAvailableSlots = async () => {
      if (!form.fecha) {
        setAvailableTimeSlots([]);
        setForm(prev => ({ ...prev, hora: '' }));
        return;
      }

      if (!isWeekdayOrSaturday(form.fecha)) {
        setAvailableTimeSlots([]);
        setError('Lo sentimos, las solicitudes de citas públicas solo están disponibles de lunes a sábado.');
        setForm(prev => ({ ...prev, hora: '' }));
        return;
      } else {
        setError(null);
      }

      const bookedStartTimes = await fetchBookedAppointmentStartTimes(form.fecha);
      const bookedCount = bookedStartTimes.length;

      if (bookedCount >= MAX_PUBLIC_APPOINTMENT_REQUESTS_PER_DAY) {
        setAvailableTimeSlots([]);
        setError(`No hay más solicitudes de citas disponibles para el ${form.fecha}. Se ha alcanzado el límite diario de solicitudes (${MAX_PUBLIC_APPOINTMENT_REQUESTS_PER_DAY}).`);
        setForm(prev => ({ ...prev, hora: '' }));
        return;
      } else {
        setError(null);
      }

      const uniqueBookedStartTimes = new Set(bookedStartTimes);
      const now = new Date();
      const selectedDate = new Date(form.fecha);
      const isToday = selectedDate.toDateString() === now.toDateString();

      const filteredSlots = AVAILABLE_TIME_SLOTS.filter(slot => {
        const [slotHour, slotMinute] = slot.split(':').map(Number);
        const slotDateTime = new Date(selectedDate);
        slotDateTime.setHours(slotHour, slotMinute, 0, 0);

        if (isToday && slotDateTime <= now) {
          return false;
        }
        return !uniqueBookedStartTimes.has(slot);
      });

      setAvailableTimeSlots(filteredSlots);

      if (!filteredSlots.includes(form.hora)) {
        setForm(prev => ({ ...prev, hora: filteredSlots.length > 0 ? filteredSlots[0] : '' }));
      }
    };

    calculateAndSetAvailableSlots();
  }, [form.fecha, fetchBookedAppointmentStartTimes, form.hora]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checked = isCheckbox ? (e.target as HTMLInputElement).checked : undefined;

    setForm((prev) => ({
      ...prev,
      [name]: isCheckbox ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensaje(null);

    if (!form.nombre || !form.telefono || !form.fecha || !form.hora || !form.motivo || !form.nombre_mascota) {
      setError('Por favor, completa todos los campos requeridos: Tu nombre, teléfono, la fecha y hora de la cita, el motivo y el nombre de tu mascota.');
      return;
    }

    if (!isWeekdayOrSaturday(form.fecha)) {
        setError('La fecha seleccionada no es válida. Las solicitudes de citas públicas solo están disponibles de lunes a sábado.');
        return;
    }

    const fullDateTime = `${form.fecha}T${form.hora}:00`; 

    setLoadingAvailability(true);
    const bookedStartTimes = await fetchBookedAppointmentStartTimes(form.fecha);
    const bookedCount = bookedStartTimes.length;
    setLoadingAvailability(false);

    if (bookedCount >= MAX_PUBLIC_APPOINTMENT_REQUESTS_PER_DAY || bookedStartTimes.includes(form.hora)) {
      setError('La franja horaria seleccionada ya no está disponible o la capacidad diaria de solicitudes ha sido alcanzada. Por favor, elige otra hora o fecha.');
      const uniqueBookedStartTimes = new Set(bookedStartTimes);
      const now = new Date();
      const selectedDate = new Date(form.fecha);
      const isToday = selectedDate.toDateString() === now.toDateString();
      const filteredSlots = AVAILABLE_TIME_SLOTS.filter(slot => {
          const [slotHour, slotMinute] = slot.split(':').map(Number);
          const slotDateTime = new Date(selectedDate);
          slotDateTime.setHours(slotHour, slotMinute, 0, 0);
          if (isToday && slotDateTime <= now) {
            return false;
          }
          return !uniqueBookedStartTimes.has(slot);
      });
      setAvailableTimeSlots(filteredSlots);
      setForm(prev => ({ ...prev, hora: filteredSlots.length > 0 ? filteredSlots[0] : '' }));
      return;
    }

    const { error: insertError } = await supabase.from('citas_publicas').insert({
      nombre: form.nombre,
      email: form.email || null,
      telefono: form.telefono,
      fecha: fullDateTime,
      motivo: form.motivo,
      nombre_mascota: form.nombre_mascota,
      recordatorio: form.recordatorio,
      estado: 'pendiente',
      id_cita_final: null,
    });

    if (insertError) {
      console.error('Error al guardar la solicitud de cita:', insertError);
      setError('Hubo un error al enviar tu solicitud de cita: ' + insertError.message);
    } else {
      setMensaje('¡Solicitud de cita enviada correctamente! Nos pondremos en contacto contigo pronto para confirmarla. Las citas de Grooming pueden requerir una confirmación adicional debido a su duración y la disponibilidad de nuestros especialistas.');
      setForm({
        nombre: '',
        email: '',
        telefono: '',
        fecha: '',
        motivo: '',
        nombre_mascota: '',
        recordatorio: false,
        hora: '',
      });
      setAvailableTimeSlots([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4 py-8"> {/* Aplicando estilo oscuro */}
      <div className="max-w-2xl w-full bg-gray-800 p-8 rounded-2xl shadow-2xl space-y-6 border border-indigo-700"> {/* Contenedor más oscuro */}
        <h2 className="text-3xl font-bold text-center text-indigo-400">Solicitar una Cita Pública</h2>
        <p className="text-center text-gray-400">
          Llena el siguiente formulario para que nuestro equipo se comunique contigo y confirme tu cita.
          <br/>
          <span className="font-semibold text-indigo-300">Importante: Esta es una *solicitud* de cita. Especialmente para "Grooming", la confirmación final de la hora y fecha está sujeta a la disponibilidad de nuestros especialistas y recursos dedicados.</span>
        </p>

        {error && <div className="bg-red-800 text-red-200 p-3 rounded text-center border border-red-600">{error}</div>} {/* Estilo oscuro para errores */}
        {mensaje && <div className="bg-green-800 text-green-200 p-3 rounded text-center border border-green-600">{mensaje}</div>} {/* Estilo oscuro para mensajes */}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <input
            name="nombre"
            type="text"
            placeholder="Tu nombre completo"
            value={form.nombre}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-400" // Estilo oscuro para inputs
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Correo electrónico (Opcional)"
            value={form.email}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-400" // Estilo oscuro para inputs
          />
          <input
            name="telefono"
            type="tel"
            placeholder="Teléfono"
            value={form.telefono}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-400" // Estilo oscuro para inputs
            required
          />
          <input
            name="nombre_mascota"
            type="text"
            placeholder="Nombre de la Mascota"
            value={form.nombre_mascota}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-400" // Estilo oscuro para inputs
            required
          />
          
          {/* Fecha de la Cita */}
          <div>
            <label htmlFor="fecha" className="block text-sm font-medium text-gray-300 mb-1">Fecha de la Cita</label>
            <input
              name="fecha"
              type="date"
              value={form.fecha}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 text-white" // Estilo oscuro
              min={getMinDate()}
              required
            />
            {!isWeekdayOrSaturday(form.fecha) && form.fecha && (
                <p className="text-red-500 text-xs mt-1">Las solicitudes de citas solo están disponibles de lunes a sábado.</p>
            )}
          </div>

          {/* Motivo de la cita (Select con opciones fijas) */}
          <div>
            <label htmlFor="motivo" className="block text-sm font-medium text-gray-300 mb-1">Motivo de la Cita</label>
            <select
              name="motivo"
              value={form.motivo}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 text-white" // Estilo oscuro
              required
            >
              <option value="">Selecciona un motivo</option>
              <option value="Grooming">Grooming</option>
              <option value="Revision-Consulta">Revisión/Consulta</option>
            </select>
          </div>

          {/* Hora de la Cita (Menú desplegable de disponibilidad de slots) */}
          <div>
            <label htmlFor="hora" className="block text-sm font-medium text-gray-300 mb-1">Hora de la Cita</label>
            <select
              name="hora"
              value={form.hora}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 text-white" // Estilo oscuro
              required
              disabled={loadingAvailability || !form.fecha || availableTimeSlots.length === 0 || !isWeekdayOrSaturday(form.fecha)}
            >
              <option value="">
                {loadingAvailability ? 'Cargando disponibilidad...' : 
                 !form.fecha ? 'Selecciona una fecha primero' :
                 !isWeekdayOrSaturday(form.fecha) ? 'Selecciona un día hábil (Lun-Sab)' :
                 availableTimeSlots.length === 0 ? 'No hay horas disponibles para esta fecha' :
                 'Selecciona una hora'}
              </option>
              {availableTimeSlots.map(slot => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              name="recordatorio"
              type="checkbox"
              checked={form.recordatorio}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-500 focus:ring-indigo-400 border-gray-600 rounded bg-gray-700" // Estilo oscuro
            />
            <label htmlFor="recordatorio" className="text-gray-300">
              Quiero recibir recordatorio por correo
            </label>
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md" // Estilo oscuro
            disabled={loadingAvailability || availableTimeSlots.length === 0 || !form.hora || !isWeekdayOrSaturday(form.fecha)}
          >
            {loadingAvailability ? 'Verificando disponibilidad...' : 'Solicitar Cita'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateAppointment;
