import { v4 as uuidv4 } from 'uuid';
import { Patient } from '../types';

const PATIENTS_STORAGE_KEY = 'patients';

// Helper function to get patients from localStorage
const getPatients = (): Patient[] => {
  const patientsJson = localStorage.getItem(PATIENTS_STORAGE_KEY);
  if (!patientsJson) return [];
  try {
    return JSON.parse(patientsJson) as Patient[];
  } catch (e) {
    console.error("Error parsing patients from localStorage", e);
    return [];
  }
};

// Helper function to save patients to localStorage
const savePatients = (patients: Patient[]) => {
  try {
    localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
  } catch (e) {
    console.error("Error saving patients to localStorage", e);
  }
};

// --- CRUD Operations ---

export const getAllPatients = (): Patient[] => {
  return getPatients();
};

export const getPatientById = (id: string): Patient | undefined => {
  const patients = getPatients();
  return patients.find(patient => patient.id === id);
};

export const addPatient = (patientData: Omit<Patient, 'id'>): Patient => {
  const patients = getPatients();
  const newPatient: Patient = {
    id: uuidv4(),
    ...patientData,
  };
  const updatedPatients = [...patients, newPatient];
  savePatients(updatedPatients);
  return newPatient;
};

export const updatePatient = (id: string, updates: Partial<Omit<Patient, 'id'>>): Patient | undefined => {
  const patients = getPatients();
  const patientIndex = patients.findIndex(patient => patient.id === id);

  if (patientIndex === -1) {
    console.warn(`Patient with id ${id} not found for update.`);
    return undefined;
  }

  const updatedPatient: Patient = {
    ...patients[patientIndex],
    ...updates,
    id: patients[patientIndex].id, // Ensure ID is not changed
  };

  patients[patientIndex] = updatedPatient;
  savePatients(patients);
  return updatedPatient;
};

export const deletePatient = (id: string): boolean => {
  const patients = getPatients();
  const initialLength = patients.length;
  const updatedPatients = patients.filter(patient => patient.id !== id);

  if (updatedPatients.length < initialLength) {
    savePatients(updatedPatients);
    return true;
  } else {
    console.warn(`Patient with id ${id} not found for deletion.`);
    return false;
  }
};

// --- Mock Data (Optional - for initial testing) ---
// Uncomment the following lines to add some initial data if the storage is empty
/*
if (getPatients().length === 0) {
  savePatients([
    { id: uuidv4(), name: 'Max', species: 'Canino', breed: 'Golden Retriever', ownerName: 'Juan Pérez', dob: '2020-05-15' },
    { id: uuidv4(), name: 'Luna', species: 'Felino', breed: 'Siames', ownerName: 'Maria García', dob: '2021-11-01' },
    { id: uuidv4(), name: 'Rocky', species: 'Canino', breed: 'Bulldog', ownerName: 'Carlos Sánchez' },
  ]);
}
*/
