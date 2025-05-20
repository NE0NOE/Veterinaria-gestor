// src/pages/admin/AgregarUsuario.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const AgregarUsuario = () => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    rol: '',
  });
  const [rolesDisponibles, setRolesDisponibles] = useState([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id_rol, nombre')
        .neq('nombre', 'cliente'); // Excluir cliente

      if (error) {
        console.error('Error al cargar roles:', error.message);
      } else {
        const [rolesDisponibles, setRolesDisponibles] = useState<{ id_rol: number; nombre: string }[]>([]);

      }
    };

    fetchRoles();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.name || !form.email || !form.password || !form.rol) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    // Crear en auth
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (signupError || !authData.user) {
      setError('No se pudo crear el usuario.');
      return;
    }

    const userId = authData.user.id;

    // Insertar en users
    const { error: userInsertError } = await supabase.from('users').insert({
      id_user: userId,
      nombre: form.name,
      email: form.email,
      telefono: form.phone,
      activo: true,
      creado_en: new Date().toISOString(),
    });

    if (userInsertError) {
      setError('Error al guardar usuario.');
      return;
    }

    // Insertar en user_roles
    const { error: rolInsertError } = await supabase.from('user_roles').insert({
      id_user: userId,
      id_rol: parseInt(form.rol),
    });

    if (rolInsertError) {
      setError('No se pudo asignar el rol.');
    } else {
      setSuccess('Usuario creado exitosamente.');
      setForm({ name: '', phone: '', email: '', password: '', rol: '' });
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-gray-900 text-white p-8 rounded shadow">
      <h2 className="text-2xl font-bold mb-6 text-indigo-400">Agregar Usuario</h2>
      {error && <p className="bg-red-200 text-red-800 px-4 py-2 rounded">{error}</p>}
      {success && <p className="bg-green-200 text-green-800 px-4 py-2 rounded">{success}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="name"
          placeholder="Nombre completo"
          value={form.name}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded"
          required
        />
        <input
          name="phone"
          placeholder="Teléfono"
          value={form.phone}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded"
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Correo"
          value={form.email}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded"
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded"
          required
        />
        <select
          name="rol"
          value={form.rol}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded"
          required
        >
          <option value="">Selecciona un rol</option>
          {rolesDisponibles.map((rol: any) => (
            <option key={rol.id_rol} value={rol.id_rol}>
              {rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="w-full py-3 bg-indigo-700 hover:bg-indigo-600 rounded text-white font-semibold"
        >
          Crear usuario
        </button>
      </form>
    </div>
  );
};

export default AgregarUsuario;
