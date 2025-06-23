import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Pencil, Trash2, CheckCircle2 } from 'lucide-react';

type CitaPublica = {
  id_cita: number;
  nombre: string;
  email: string;
  telefono: string;
  fecha: string;
  motivo: string;
  estado: string;
};

type Cliente = { id_cliente: number; nombre: string };
type Mascota = { id_mascota: number; nombre: string; id_cliente: number };

const GestionarCitasPage = () => {
  const [citasPublicas, setCitasPublicas] = useState<CitaPublica[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mascotas, setMascotas] = useState<Mascota[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: citasPub } = await supabase.from('citas_publicas').select('*').order('fecha', { ascending: true });
    const { data: clientesData } = await supabase.from('clientes').select('id_cliente, nombre');
    const { data: mascotasData } = await supabase.from('mascotas').select('id_mascota, nombre, id_cliente');

    if (citasPub) setCitasPublicas(citasPub);
    if (clientesData) setClientes(clientesData);
    if (mascotasData) setMascotas(mascotasData);
  };

  const confirmarCita = async (cita: CitaPublica, id_cliente: number, id_mascota: number) => {
    const insert = await supabase.from('citas').insert([{
      fecha: cita.fecha,
      motivo: cita.motivo,
      estado: 'confirmada',
      tipo: 'veterinaria',
      id_cliente,
      id_mascota
    }]);

    if (insert.error) {
      alert('Error al confirmar cita: ' + insert.error.message);
      return;
    }

    await supabase.from('citas_publicas').update({ estado: 'confirmada' }).eq('id_cita', cita.id_cita);
    fetchData();
  };

  const eliminarCitaPublica = async (id_cita: number) => {
    await supabase.from('citas_publicas').delete().eq('id_cita', id_cita);
    fetchData();
  };

  return (
    <div className="p-6 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-4 text-indigo-400">Solicitudes de Citas Públicas</h2>
      <table className="w-full bg-gray-800 rounded-lg text-sm mb-8">
        <thead>
          <tr>
            <th className="p-2">Nombre</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Fecha</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {citasPublicas.map((cita) => (
            <tr key={cita.id_cita} className="border-b border-gray-700">
              <td className="p-2">{cita.nombre}</td>
              <td>{cita.email}</td>
              <td>{cita.telefono}</td>
              <td>{new Date(cita.fecha).toLocaleString()}</td>
              <td>{cita.motivo}</td>
              <td>{cita.estado}</td>
              <td className="space-x-2 flex">
                <select
                  onChange={(e) => {
                    const selected = e.target.value.split(',');
                    confirmarCita(cita, Number(selected[0]), Number(selected[1]));
                  }}
                  className="text-sm bg-gray-700 text-white rounded px-2 py-1"
                >
                  <option>Asignar cliente y mascota</option>
                  {clientes.map((cli) =>
                    mascotas
                      .filter((m) => m.id_cliente === cli.id_cliente)
                      .map((m) => (
                        <option key={m.id_mascota} value={`${cli.id_cliente},${m.id_mascota}`}>
                          {cli.nombre} - {m.nombre}
                        </option>
                      ))
                  )}
                </select>
                <button
                  onClick={() => eliminarCitaPublica(cita.id_cita)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GestionarCitasPage;
