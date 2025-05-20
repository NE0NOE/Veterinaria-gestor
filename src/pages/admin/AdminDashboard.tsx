import React, { useEffect, useState } from 'react';
import { Users, CalendarDays, PawPrint, LogOut } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import imagenHero from '../../assets/maxi.jpg';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ icon: Icon, label, value }: any) => (
  <div className="bg-white shadow rounded-lg p-5 border-l-4 border-indigo-600 flex items-center">
    <div className="bg-indigo-100 p-3 rounded-full mr-4">
      <Icon className="w-6 h-6 text-indigo-600" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({ usuarios: 0, citas: 0, mascotas: 0 });
  const [citasPendientes, setCitasPendientes] = useState([]);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  useEffect(() => {
    const fetchStats = async () => {
      const { data: usuarios } = await supabase.from('users').select('*');
      const { data: mascotas } = await supabase.from('mascotas').select('*');
      const { data: citas } = await supabase.from('citas').select('*');
      const { data: pendientes } = await supabase
        .from('citas')
        .select('id_cita, motivo, fecha, estado, mascotas(nombre)')
        .eq('estado', 'pendiente')
        .order('fecha', { ascending: true });

      setStats({
        usuarios: usuarios?.length || 0,
        citas: citas?.length || 0,
        mascotas: mascotas?.length || 0,
      });

      setCitasPendientes(pendientes || []);
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <section
        className="relative h-56 text-white flex items-center justify-center text-center"
        style={{
          backgroundImage: `url(${imagenHero})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-60" />
        <div className="relative z-10 px-4">
          <h2 className="text-4xl font-bold mb-2">Panel de Administración</h2>
          <p className="text-lg">Bienvenido a Max's Groomer</p>
        </div>
        <button
          onClick={handleLogout}
          className="absolute top-5 right-5 bg-gray-900 text-red-400 px-3 py-1 rounded hover:text-white transition"
        >
          <LogOut className="inline-block w-4 h-4 mr-1" /> Cerrar sesión
        </button>
      </section>

      <main className="p-6 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard icon={Users} label="Usuarios" value={stats.usuarios} />
          <StatCard icon={CalendarDays} label="Total de Citas" value={stats.citas} />
          <StatCard icon={PawPrint} label="Mascotas" value={stats.mascotas} />
        </div>

        <div className="bg-white text-black p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Citas Pendientes</h2>
          {citasPendientes.length === 0 ? (
            <p>No hay citas pendientes.</p>
          ) : (
            <ul className="space-y-3">
              {citasPendientes.map((cita: any) => (
                <li key={cita.id_cita} className="border-b pb-2">
                  <p className="font-semibold">Motivo: {cita.motivo}</p>
                  <p className="text-sm text-gray-700">
                    {new Date(cita.fecha).toLocaleString()} - Mascota: {cita.mascotas?.nombre}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <button
            onClick={() => navigate('/admin-dashboard/agregar-usuario')}
            className="bg-indigo-700 text-white px-4 py-2 rounded hover:bg-indigo-800"
          >
            Añadir nuevo trabajador
          </button>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
