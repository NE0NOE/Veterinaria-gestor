import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Loader2, AlertCircle, CheckCircle, Lock, Dog, XCircle } from 'lucide-react'; // Añadimos XCircle para cerrar mensajes

const ResetPasswordConfirm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Inicialmente true para la verificación de sesión
  const navigate = useNavigate();

  // Función para mostrar mensajes de feedback con temporizador
  const showFeedbackMessage = useCallback((type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setMessage(msg);
      setError(null);
    } else {
      setError(msg);
      setMessage(null);
    }
    // Los mensajes desaparecen después de 5 segundos, excepto el de éxito que redirige
    if (type === 'error') {
      setTimeout(() => {
        setMessage(null);
        setError(null);
      }, 5000);
    }
  }, []);

  useEffect(() => {
    // Cuando la página se carga, Supabase ya procesa el access_token del hash URL
    // y autentica temporalmente al usuario. Verificamos si hay una sesión activa.
    const checkUserSession = async () => {
      setIsLoading(true); // Activar loader mientras se verifica la sesión
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session || !session.user) {
        // Si hay un error al obtener la sesión o no hay sesión válida,
        // significa que el token no se procesó correctamente o expiró.
        showFeedbackMessage('error', 'El enlace de restablecimiento no es válido o ya ha expirado. Por favor, solicita uno nuevo.');
        // Opcional: redirigir a la página de solicitud de restablecimiento si el enlace es inválido
        setTimeout(() => navigate('/reset-password'), 5000); 
      } else {
        // Si hay una sesión válida, el usuario puede proceder a cambiar la contraseña
        setMessage('Listo para cambiar tu contraseña. Ingresa la nueva a continuación.');
      }
      setIsLoading(false); // Desactivar loader después de la verificación
    };

    checkUserSession();

    // Función de limpieza para evitar efectos secundarios
    return () => {
      setError(null);
      setMessage(null);
    };
  }, [navigate, showFeedbackMessage]); // Dependencias para useCallback y navigate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true); // Activa el loader para el envío del formulario

    // Validaciones
    if (!password || !confirmPassword) {
      showFeedbackMessage('error', 'Por favor, ingresa y confirma tu nueva contraseña.');
      setIsLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      showFeedbackMessage('error', '¡Oops! Las contraseñas no coinciden. Por favor, revísalas.');
      setIsLoading(false);
      return;
    }
    if (password.length < 6) { // Requisito mínimo de Supabase (configurable en su dashboard)
      showFeedbackMessage('error', 'La contraseña debe tener al menos 6 caracteres para proteger a tus mascotas... ¡y tus datos!');
      setIsLoading(false);
      return;
    }

    try {
      // Intenta actualizar la contraseña del usuario actualmente autenticado (por el token en la URL)
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        showFeedbackMessage('error', `Error al actualizar la contraseña: ${updateError.message}. ¡No te rindas!`);
        console.error('Error updating password:', updateError);
      } else {
        showFeedbackMessage('success', '¡Contraseña de cachorro actualizada!🐾 Redirigiendo al inicio de sesión para que sigas cuidando de tus peluditos.');
        // Redirige al login después de un breve delay
        setTimeout(() => navigate('/login'), 3500);
      }
    } catch (err: any) {
      showFeedbackMessage('error', `Ocurrió un error inesperado: ${err.message}. Intenta de nuevo.`);
      console.error('Unhandled error during password update:', err);
    } finally {
      setIsLoading(false); // Desactiva el loader del formulario
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 font-inter">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl p-8 space-y-6 text-white border border-blue-800 animate-fade-in">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-blue-400 flex items-center justify-center gap-2">
            <Lock size={30} /> Restablecer Contraseña
          </h2>
          <p className="mt-1 text-sm text-gray-400">Ingresa tu nueva contraseña para proteger tu cuenta.</p>
        </div>

        {/* Mensajes de feedback */}
        {error && (
          <div className="bg-red-800 text-red-100 px-4 py-3 rounded-lg text-sm text-center flex items-center justify-between gap-2 shadow-md animate-bounce-in">
            <AlertCircle size={20} />
            <span className="flex-grow">{error}</span>
            <XCircle size={18} className="cursor-pointer" onClick={() => setError(null)} />
          </div>
        )}
        {message && !error && ( // Mostrar mensaje de éxito solo si no hay error
          <div className="bg-green-800 text-green-100 px-4 py-3 rounded-lg text-sm text-center flex items-center justify-center gap-2 shadow-md animate-bounce-in">
            <CheckCircle size={20} />
            <span className="flex-grow">{message}</span>
            {/* Si el mensaje es de redirección, no necesitamos XCircle */}
            {message.includes('Redirigiendo') ? null : <XCircle size={18} className="cursor-pointer" onClick={() => setMessage(null)} />}
             <Dog size={18} className="ml-2" />
          </div>
        )}

        {/* Loader inicial o formulario */}
        {isLoading ? ( // Mostrar loader mientras se verifica la sesión o se envía el formulario
          <div className="flex items-center justify-center py-6">
            <Loader2 className="animate-spin mr-3 text-blue-400" size={32} />
            <p className="text-xl text-blue-400">
              {error ? 'Procesando error...' : message ? 'Redirigiendo...' : 'Verificando enlace...'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="sr-only">Nueva contraseña</label>
              <input
                type="password"
                id="password"
                placeholder="Nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                required
                minLength={6} // Atributo HTML para validación básica
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">Confirmar nueva contraseña</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="Confirmar nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                required
                minLength={6} // Atributo HTML para validación básica
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-700 hover:bg-indigo-600 text-white py-3 px-4 text-base font-medium rounded-md transition-colors shadow-md flex items-center justify-center"
              disabled={isLoading} // Deshabilitar si se está cargando (verificando enlace o enviando formulario)
            >
              {isLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
              {isLoading ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordConfirm;
