import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

interface Mascota {
  id_mascota: number;
  nombre: string;
  especie?: string;
  raza?: string;
  edad?: number;
}

const Mascotas = () => {
  const [mascotas, setMascotas] = useState<Mascota[]>([]);

  useEffect(() => {
    const fetchMascotas = async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user.id;

      const { data: clienteData, error } = await supabase
        .from('clientes')
        .select('id_cliente')
        .eq('id_user', userId)
        .single();

      if (!clienteData) {
        console.error('Cliente no encontrado');
        return;
      }

      const { data } = await supabase
        .from('mascotas')
        .select('*')
        .eq('id_cliente', clienteData.id_cliente);

      if (data) setMascotas(data);
    };

    fetchMascotas();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Mis Mascotas</h2>
      {mascotas.length === 0 ? (
        <p className="text-gray-300">No tienes mascotas registradas aún.</p>
      ) : (
        mascotas.map((m) => (
          <div key={m.id_mascota} className="bg-white text-black p-4 rounded shadow">
            <h3 className="font-semibold text-lg">{m.nombre}</h3>
            <p>Especie: {m.especie}</p>
            <p>Raza: {m.raza}</p>
            <p>Edad: {m.edad} años</p>
          </div>
        ))
      )}
    </div>
  );
};

export default Mascotas;
