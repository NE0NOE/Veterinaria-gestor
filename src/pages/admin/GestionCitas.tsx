import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Pencil, Trash2, CheckCircle2, Plus } from 'lucide-react';

type Cita = {
  id_cita: number;
  motivo: string;
  fecha: string;
  estado: string;
  tipo: string;
  id_cliente: number;
  id_mascota: number;
};

type Cliente = {
  id_cliente: number;
  nombre: string;
};

type Mascota = {
  id_mascota: number;
  nombre: string;
  id_cliente: number;
};

const GestionCitas = () => {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [modoEdicion, setModoEdicion] = useState<Cita | null>(null);
  const [form, setForm] = useState<Omit<Cita, 'id_cita'>>({
    motivo: '',
    fecha: '',
    estado: 'pendiente',
    tipo: '',
    id_cliente: 0,
    id_mascota: 0,
  });

  const fetchData = async () => {
    const { data: citasData } = await supabase.from('citas').select('*');
    const { data: clientesData } = await supabase.from('clientes').select('id_cliente, nombre');
    const { data: mascotasData } = await supabase.from('mascotas').select('id_mascota, nombre, id_cliente');

    if (citasData) setCitas(citasData);
    if (clientesData) setClientes(clientesData);
    if (mascotasData) setMascotas(mascotasData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'id_cliente' || name === 'id_mascota' ? Number(value) : value,
    }));
  };

  const handleEdit = (cita: Cita) => {
    setModoEdicion(cita);
    setForm({
      motivo: cita.motivo,
      fecha: cita.fecha.slice(0, 16),
      estado: cita.estado,
      tipo: cita.tipo,
      id_cliente: cita.id_cliente,
      id_mascota: cita.id_mascota,
    });
  };

  const handleDelete = async (id: number) => {
    await supabase.from('citas').delete().eq('id_cita', id);
    fetchData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modoEdicion) {
      await supabase.from('citas').update(form).eq('id_cita', modoEdicion.id_cita);
    } else {
      await supabase.from('citas').insert([form]);
    }

    setForm({ motivo: '', fecha: '', estado: 'pendiente', tipo: '', id_cliente: 0, id_mascota: 0 });
    setModoEdicion(null);
    fetchData();
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg shadow space-y-8">
      <h2 className="text-2xl font-bold text-indigo-400">Gestión de Citas</h2>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <label className="block mb-1">Cliente</label>
          <select name="id_cliente" value={form.id_cliente} onChange={handleChange} className="w-full p-2 bg-gray-800 border border-gray-600 rounded" required>
            <option value="">Selecciona</option>
            {clientes.map(c => (
              <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">Mascota</label>
          <select name="id_mascota" value={form.id_mascota} onChange={handleChange} className="w-full p-2 bg-gray-800 border border-gray-600 rounded" required>
            <option value="">Selecciona</option>
            {mascotas.filter(m => m.id_cliente === form.id_cliente).map(m => (
              <option key={m.id_mascota} value={m.id_mascota}>{m.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">Fecha</label>
          <input type="datetime-local" name="fecha" value={form.fecha} onChange={handleChange} className="w-full p-2 bg-gray-800 border border-gray-600 rounded" required />
        </div>

        <div>
          <label className="block mb-1">Motivo</label>
          <input name="motivo" value={form.motivo} onChange={handleChange} className="w-full p-2 bg-gray-800 border border-gray-600 rounded" required />
        </div>

        <div>
          <label className="block mb-1">Tipo</label>
          <select name="tipo" value={form.tipo} onChange={handleChange} className="w-full p-2 bg-gray-800 border border-gray-600 rounded" required>
            <option value="">Selecciona</option>
            <option value="veterinaria">Veterinaria</option>
            <option value="grooming">Grooming</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <button type="submit" className="w-full py-2 bg-indigo-700 hover:bg-indigo-600 rounded font-semibold">
            {modoEdicion ? 'Actualizar Cita' : 'Agregar Cita'}
          </button>
        </div>
      </form>

      {/* Tabla */}
      <table className="w-full bg-gray-800 rounded-lg text-sm">
        <thead>
          <tr>
            <th className="p-2">Cliente</th>
            <th>Mascota</th>
            <th>Fecha</th>
            <th>Motivo</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {citas.map((c) => (
            <tr key={c.id_cita} className="border-b border-gray-700">
              <td className="p-2">{clientes.find((x) => x.id_cliente === c.id_cliente)?.nombre || 'N/A'}</td>
              <td>{mascotas.find((x) => x.id_mascota === c.id_mascota)?.nombre || 'N/A'}</td>
              <td>{new Date(c.fecha).toLocaleString()}</td>
              <td>{c.motivo}</td>
              <td>{c.tipo}</td>
              <td>{c.estado}</td>
              <td className="flex space-x-2 p-2">
                <button onClick={() => handleEdit(c)} className="text-indigo-400 hover:text-indigo-600"><Pencil size={16} /></button>
                <button onClick={() => handleDelete(c.id_cita)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GestionCitas;
