import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const ResetPasswordConfirm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!password) {
      setError('Por favor, ingresa una nueva contraseña.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError('Error al actualizar la contraseña.');
    } else {
      setMessage('¡Contraseña actualizada! Redirigiendo...');
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  useEffect(() => {
    const hash = window.location.hash;
    const token = new URLSearchParams(hash.substring(1)).get('access_token');
    if (!token) setError('El enlace de recuperación no es válido o ha expirado.');
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl p-8 space-y-6 text-white">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-indigo-400">Restablecer Contraseña</h2>
          <p className="mt-1 text-sm text-gray-400">Ingresa tu nueva contraseña</p>
        </div>

        {error && (
          <div className="bg-red-200 text-red-800 px-4 py-2 rounded text-sm text-center">{error}</div>
        )}
        {message && (
          <div className="bg-green-200 text-green-800 px-4 py-2 rounded text-sm text-center">{message}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
            required
          />
          <button
            type="submit"
            className="w-full bg-indigo-700 hover:bg-indigo-600 text-white py-3 px-4 text-sm font-medium rounded-md transition-colors"
          >
            Cambiar contraseña
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordConfirm;
