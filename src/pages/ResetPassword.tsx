import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient'; // Asegúrate de que la ruta sea correcta

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    // Define la URL completa a la que Supabase debe redirigir después de que el usuario haga clic en el enlace del correo.
    // ¡Asegúrate de que 'https://max-g-five.vercel.app/' es tu dominio base en Vercel!
const redirectToUrl = 'https://max-g-five.vercel.app/reset-password-confirm';


    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectToUrl,
    });

    if (resetError) {
      // Muestra el mensaje de error específico de Supabase para depuración y mejor UX
      setError('Hubo un error al enviar el correo de recuperación: ' + resetError.message);
    } else {
      setMessage('Se ha enviado un correo para restablecer tu contraseña. Por favor, revisa tu bandeja de entrada.');
      // Opcional: Podrías no redirigir automáticamente para que el usuario lea el mensaje
      // y luego haga clic en "Regresar al Login". Por ahora, mantendremos la redirección con un pequeño delay.
      setTimeout(() => navigate('/login'), 3000); 
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-gray-900 text-white rounded-xl shadow-2xl p-8 space-y-6"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold text-indigo-400">Recuperar Contraseña</h2>
          <p className="mt-2 text-sm text-gray-300">
            Ingresa tu correo para restablecer tu contraseña
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded text-sm text-center">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded text-sm text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-600 bg-gray-800 rounded-md text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
          />

          <button
            type="submit"
            className="w-full py-3 px-4 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
          >
            Enviar correo de recuperación
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          <span
            onClick={() => navigate('/login')}
            className="text-indigo-400 font-medium cursor-pointer hover:underline"
          >
            Regresar al Login
          </span>
        </p>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
