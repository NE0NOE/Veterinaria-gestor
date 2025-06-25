import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient'; // Asegúrate de que esta ruta sea correcta

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    email: '',
    password: '',
    receiveReminders: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // Nuevo estado para mensajes de éxito

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
    setSuccessMessage(null); // Limpiar mensaje de éxito al intentar registrar de nuevo

    // 1. Validaciones básicas del formulario
    if (!form.name || !form.phone || !form.address || !form.email || !form.password || !form.city) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }

    if (!form.email.endsWith('@gmail.com')) {
      setError('El correo debe ser de tipo Gmail (@gmail.com).');
      return;
    }

    // 2. Registro del usuario en Supabase Auth
    // Nota: Por defecto, los usuarios registrados con `signUp` necesitan confirmar su correo electrónico
    // a menos que hayas deshabilitado la confirmación por correo en la configuración de Supabase Auth.
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (signupError || !authData.user) {
      // Si hay un error de signup o el usuario no se obtiene (ej. ya existe, contraseña débil),
      // Supabase Auth maneja muchos mensajes de error automáticamente.
      setError('Hubo un error al registrar el usuario: ' + (signupError?.message || 'Error desconocido.'));
      return;
    }

    const user = authData.user; // El objeto user contiene el id_user (UUID)

    // 3. Insertar datos del usuario en la tabla 'users'
    const { error: userInsertError } = await supabase.from('users').insert({
      id_user: user.id, // ID del usuario de Supabase Auth
      nombre: form.name,
      email: form.email,
      telefono: form.phone,
      activo: true, // Por defecto, el usuario está activo
      // creado_en: new Date().toISOString(), // La base de datos puede auto-generar esto con DEFAULT now()
    });

    if (userInsertError) {
      console.error('Error al insertar en la tabla users:', userInsertError);
      setError('No se pudo guardar los datos del usuario en la tabla principal. ' + userInsertError.message);
      // Opcional: Si este error es crítico, considera hacer un rollback o eliminar el usuario de auth si es posible.
      return;
    }

    // 4. Insertar datos adicionales del cliente en la tabla 'clientes'
    const { error: clientInsertError } = await supabase.from('clientes').insert({
      id_user: user.id, // Vinculamos con el ID del usuario de Auth
      nombre: form.name,
      email: form.email,
      telefono: form.phone,
      direccion: form.address,
      ciudad: form.city,
      recibir_recordatorios: form.receiveReminders,
    });

    if (clientInsertError) {
      console.error('Error al insertar en la tabla clientes:', clientInsertError);
      setError('No se pudo agregar el usuario a la tabla de clientes. ' + clientInsertError.message);
      // Esto es más complejo: si falla aquí, el usuario ya existe en `auth.users` y en `users`.
      // Idealmente, se debería eliminar el usuario de `auth.users` y de `users` para mantener la consistencia.
      // Pero eso requeriría privilegios de servicio o una función Edge para ejecutar desde el cliente.
      return;
    }

    // 5. Obtener el ID del rol 'cliente'
    const { data: rolData, error: rolError } = await supabase
      .from('roles')
      .select('id_rol')
      .eq('nombre', 'cliente')
      .single();

    if (rolError || !rolData) {
      console.error('Error al obtener el rol de cliente:', rolError);
      setError('Rol de cliente no encontrado o error al obtenerlo. ' + (rolError?.message || 'Asegúrate de que existe un rol "cliente" en tu tabla "roles".'));
      return;
    }

    // 6. Asignar el rol 'cliente' al nuevo usuario en la tabla 'user_roles'
    const { error: rolInsertError } = await supabase.from('user_roles').insert({
      id_user: user.id,
      id_rol: rolData.id_rol,
    });

    if (rolInsertError) {
      console.error('Error al asignar el rol:', rolInsertError);
      setError('No se pudo asignar el rol al usuario. ' + rolInsertError.message);
      return;
    }

    // Si todo fue exitoso, redirigir al login y mostrar mensaje
    setSuccessMessage('¡Registro exitoso! Por favor, inicia sesión con tu nuevo usuario.');
    // Pequeño retardo para que el usuario vea el mensaje de éxito antes de redirigir
    setTimeout(() => {
      navigate('/login');
    }, 2000); // Redirige después de 2 segundos
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

        {successMessage && (
          <div className="bg-green-200 text-green-800 px-4 py-2 rounded text-sm text-center">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: 'name', placeholder: 'Nombre completo', type: 'text' },
            { name: 'phone', placeholder: 'Teléfono', type: 'tel' },
            { name: 'address', placeholder: 'Dirección', type: 'text' },
            { name: 'city', placeholder: 'Ciudad', type: 'text' },
            { name: 'email', placeholder: 'Correo electrónico (Gmail)', type: 'email' },
            { name: 'password', placeholder: 'Contraseña', type: 'password' },
          ].map((field) => (
            <input
              key={field.name}
              name={field.name}
              type={field.type}
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
