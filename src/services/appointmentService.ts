import { Appointment } from '../types';
import { v4 as uuidv4 } from 'uuid'; // Assuming uuid is installed or install it: npm install uuid @types/uuid

const APPOINTMENTS_STORAGE_KEY = 'vetClinicAppointments';

// Helper function to get appointments from localStorage
const getAppointmentsFromStorage = (): Appointment[] => {
  const storedData = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
  if (storedData) {
    try {
      return JSON.parse(storedData) as Appointment[];
    } catch (error) {
      console.error("Failed to parse appointments from localStorage", error);
      return []; // Return empty array on error
    }
  }
  return []; // Return empty array if nothing is stored
};

// Helper function to save appointments to localStorage
const saveAppointmentsToStorage = (appointments: Appointment[]): void => {
  localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
};

// --- Service Functions ---

/**
 * Fetches all appointments.
 * @returns An array of appointments.
 */
export const getAppointments = (): Appointment[] => {
  return getAppointmentsFromStorage();
};

/**
 * Adds a new appointment.
 * @param appointmentData - The data for the new appointment (without id).
 * @returns The newly created appointment with an id.
 */
export const addAppointment = (appointmentData: Omit<Appointment, 'id'>): Appointment => {
  const appointments = getAppointmentsFromStorage();
  const newAppointment: Appointment = {
    ...appointmentData,
    id: uuidv4(), // Generate a unique ID
  };
  const updatedAppointments = [...appointments, newAppointment];
  saveAppointmentsToStorage(updatedAppointments);
  return newAppointment;
};

/**
 * Updates an existing appointment.
 * @param updatedAppointment - The appointment object with updated data.
 * @returns True if update was successful, false otherwise.
 */
export const updateAppointment = (updatedAppointment: Appointment): boolean => {
  const appointments = getAppointmentsFromStorage();
  const index = appointments.findIndex(app => app.id === updatedAppointment.id);
  if (index !== -1) {
    appointments[index] = updatedAppointment;
    saveAppointmentsToStorage(appointments);
    return true;
  }
  return false; // Appointment not found
};

/**
 * Deletes an appointment by its ID.
 * @param appointmentId - The ID of the appointment to delete.
 * @returns True if deletion was successful, false otherwise.
 */
export const deleteAppointment = (appointmentId: string): boolean => {
  const appointments = getAppointmentsFromStorage();
  const initialLength = appointments.length;
  const updatedAppointments = appointments.filter(app => app.id !== appointmentId);
  if (updatedAppointments.length < initialLength) {
    saveAppointmentsToStorage(updatedAppointments);
    return true;
  }
  return false; // Appointment not found or deletion failed
};

// Initialize with some mock data if storage is empty (optional)
if (!localStorage.getItem(APPOINTMENTS_STORAGE_KEY)) {
  const mockAppointments: Appointment[] = [
    { id: uuidv4(), date: '2024-08-01', time: '10:00', petName: 'Buddy', clientName: 'John Doe', service: 'Grooming', status: 'scheduled' },
    { id: uuidv4(), date: '2024-08-01', time: '11:30', petName: 'Lucy', clientName: 'Jane Smith', service: 'Vaccination', status: 'scheduled' },
    { id: uuidv4(), date: '2024-07-29', time: '14:00', petName: 'Max', clientName: 'Peter Jones', service: 'Check-up', status: 'completed' },
  ];
  saveAppointmentsToStorage(mockAppointments);
}
