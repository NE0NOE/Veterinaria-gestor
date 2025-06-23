export type Cliente = {
  id_cliente: number;
  nombre: string;
};

export type Mascota = {
  id_mascota: number;
  nombre: string;
  clientes?: Cliente;
};

export type Veterinario = {
  id_veterinario: number;
  nombre: string;
};

export type Cita = {
  id_cita: number;
  fecha: string;
  motivo: string;
  estado: string;
  tipo: 'veterinaria' | 'grooming';
  id_mascota?: number;
  id_cliente?: number;
  id_veterinario?: number;
  mascotas?: Mascota;
  veterinarios?: Veterinario;
};