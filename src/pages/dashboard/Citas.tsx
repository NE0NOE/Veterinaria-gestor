import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

interface Mascota {
  id_mascota: number;
  nombre: string;
}

const Citas = () => {
  const [tipo, setTipo] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [idMascota, setIdMascota] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchMascotas = async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user.id;

      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('id_cliente')
        .eq('id_user', userId)
        .single();

      if (!clienteData || clienteError) {
        setError('No se pudo obtener el cliente');
        return;
      }

      const { data, error } = await supabase
        .from('mascotas')
        .select('id_mascota, nombre')
        .eq('id_cliente', clienteData.id_cliente);

      if (error) {
        setError('Error al obtener mascotas');
        return;
      }

      setMascotas(data || []);
    };

    fetchMascotas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fecha || !hora || !tipo || !idMascota) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    const fechaCompleta = new Date(`${fecha}T${hora}`);
    const hoy = new Date();
    const maxFecha = new Date();
    maxFecha.setDate(hoy.getDate() + 30);

    if (fechaCompleta < hoy || fechaCompleta > maxFecha) {
      setError('La fecha debe estar dentro de los próximos 30 días.');
      return;
    }

    const { data: conflicto, error: conflictoError } = await supabase.rpc('validar_conflicto_cita', {
      p_mascota_id: parseInt(idMascota),
      p_fecha: fechaCompleta.toISOString()
    });

    if (conflictoError) {
      setError('Error al validar conflicto de cita.');
      return;
    }

    if (conflicto) {
      setError('Ya existe una cita para esa mascota en ese horario.');
      return;
    }

    const { error: insertError } = await supabase.from('citas').insert([
      {
        id_mascota: parseInt(idMascota),
        fecha: fechaCompleta,
        motivo: tipo,
        estado: 'pendiente'
      }
    ]);

    if (insertError) {
      setError('Error al registrar la cita.');
    } else {
      setSuccess('Cita registrada correctamente.');
      setFecha('');
      setHora('');
      setTipo('');
      setIdMascota('');
    }
  };

  return (
<form onSubmit={handleSubmit} className="relative z-10 space-y-4 bg-white text-black p-6 rounded shadow-md max-w-md w-full mx-auto">

      <h2 className="text-xl font-semibold">Solicitar Cita</h2>
      {error && <p className="text-red-600">{error}</p>}
      {success && <p className="text-green-600">{success}</p>}

      <select
        value={idMascota}
        onChange={(e) => setIdMascota(e.target.value)}
        required
        className="w-full border px-3 py-2 rounded"
      >
        <option value="">Seleccione mascota</option>
        {mascotas.map((m) => (
          <option key={m.id_mascota} value={m.id_mascota}>
            {m.nombre}
          </option>
        ))}
      </select>

      <select
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
        required
        className="w-full border px-3 py-2 rounded"
      >
        <option value="">Tipo de cita</option>
        <option value="chequeo">Chequeo veterinario (20 min)</option>
        <option value="grooming">Grooming (hasta 2 horas)</option>
      </select>

      <input
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        className="w-full border px-3 py-2 rounded"
        required
      />

      <input
        type="time"
        value={hora}
        onChange={(e) => setHora(e.target.value)}
        className="w-full border px-3 py-2 rounded"
        required
      />
<button
  type="submit"
  className="w-full bg-indigo-700 text-white py-2 rounded hover:bg-indigo-600 transition-all"
>
  Solicitar Cita
</button>

    </form>
  );
};

export default Citas;
