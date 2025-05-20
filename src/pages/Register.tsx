import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    password: '',
    city: '',
    receiveReminders: false,
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name || !form.phone || !form.address || !form.email || !form.password || !form.city) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    if (!form.email.endsWith('@gmail.com')) {
      setError('El correo debe ser de tipo Gmail (@gmail.com).');
      return;
    }

    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (signupError || !authData.user) {
      setError('Hubo un error al registrar el usuario.');
      return;
    }

    const user = authData.user;

    const { error: userInsertError } = await supabase.from('users').insert({
      id_user: user.id,
      nombre: form.name,
      email: form.email,
      telefono: form.phone,
      activo: true,
      creado_en: new Date().toISOString(),
    });

    if (userInsertError) {
      setError('No se pudo guardar los datos del usuario.');
      return;
    }

    const { error: clientInsertError } = await supabase.from('clientes').insert({
      id_user: user.id,
      nombre: form.name,
      email: form.email,
      telefono: form.phone,
      direccion: form.address,
      ciudad: form.city,
      recibir_recordatorios: form.receiveReminders,
    });

    if (clientInsertError) {
      setError('No se pudo agregar el usuario a la tabla de clientes.');
      return;
    }

    const { data: rolData, error: rolError } = await supabase
      .from('roles')
      .select('id_rol')
      .eq('nombre', 'cliente')
      .single();

    if (rolError || !rolData) {
      setError('Rol de cliente no encontrado.');
      return;
    }

    const { error: rolInsertError } = await supabase.from('user_roles').insert({
      id_user: user.id,
      id_rol: rolData.id_rol,
    });

    if (rolInsertError) {
      setError('No se pudo asignar el rol.');
      return;
    }

    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg bg-gray-900 rounded-2xl shadow-2xl p-8 space-y-6 text-white"
      >
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-indigo-400">Crear Cuenta</h2>
          <p className="mt-1 text-sm text-gray-400">Únete a Max's Groomer</p>
        </div>

        {error && (
          <div className="bg-red-200 text-red-800 px-4 py-2 rounded text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: 'name', placeholder: 'Nombre completo' },
            { name: 'phone', placeholder: 'Teléfono' },
            { name: 'address', placeholder: 'Dirección' },
            { name: 'city', placeholder: 'Ciudad' },
            { name: 'email', placeholder: 'Correo electrónico (Gmail)', type: 'email' },
            { name: 'password', placeholder: 'Contraseña', type: 'password' },
          ].map((field) => (
            <input
              key={field.name}
              name={field.name}
              type={field.type || 'text'}
              placeholder={field.placeholder}
              value={(form as any)[field.name]}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
              required
            />
          ))}

          <div className="flex items-center space-x-3 text-sm">
            <input
              id="receiveReminders"
              name="receiveReminders"
              type="checkbox"
              checked={form.receiveReminders}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="receiveReminders" className="text-gray-300">
              Deseo recibir recordatorios de citas al correo.
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-700 hover:bg-indigo-600 text-white py-3 px-4 text-sm font-medium rounded-md transition-colors"
          >
            Registrarme
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          ¿Ya tienes una cuenta?{' '}
          <span
            onClick={() => navigate('/login')}
            className="text-indigo-400 font-medium cursor-pointer hover:underline"
          >
            Inicia sesión
          </span>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
