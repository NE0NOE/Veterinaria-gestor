
import { createClient } from '@supabase/supabase-js';

// Reemplaza estas con tus credenciales de Supabase
const supabaseUrl = 'https://yphrgrvbvxjnueypjwpb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwaHJncnZidnhqbnVleXBqd3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNDI0NjQsImV4cCI6MjA2MTgxODQ2NH0.jC5GckSrG6fgM1wgO0-UWheFYDqeifPvfow1AWRyEMQ';
export const supabase = createClient(supabaseUrl, supabaseKey);
