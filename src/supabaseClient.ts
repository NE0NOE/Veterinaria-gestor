// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Tus claves de Supabase (asegúrate de que esta sea la clave 'anon public')
// Hemos vuelto a poner las claves directamente para evitar el error 'process is not defined'
const supabaseUrl = 'https://yphrgrvbvxjnueypjwpb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaHJncnZidnhqbnVleXBqd3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNDI0NjQsImV4cCI6MjA2MTgxODQ2NH0.jC5GckSrG6fgM1wgO0-UWheFYDqeifPvfow1AWRyEMQ';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage, // Usa localStorage para persistir la sesión
    autoRefreshToken: true, // Refresca automáticamente el token
    persistSession: true,   // Persiste la sesión en el almacenamiento
    detectSessionInUrl: true // Detecta la sesión en la URL (útil para callbacks de auth)
  },
});
