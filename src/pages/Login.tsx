import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { PawPrint, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // Importa el AuthContext actualizado

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Redirigir si ya está autenticado y el rol está definido
  useEffect(() => {
    console.log("Login useEffect: authLoading:", authLoading, "isAuthenticated:", isAuthenticated, "user:", user); // Log para depuración
    if (!authLoading && isAuthenticated && user?.role) {
      console.log("Login useEffect: User already authenticated and role defined, redirecting based on role:", user.role);
      switch (user.role) {
        case 'cliente':
          navigate('/dashboard');
          break;
        case 'admin':
          navigate('/admin-dashboard');
          break;
        case 'veterinario':
          navigate('/veterinario-dashboard');
          break;
        case 'asistente':
          navigate('/asistente-dashboard');
          break;
        default:
          console.warn(`Login useEffect: Rol no reconocido para redirección: ${user.role}`);
          navigate('/'); // O a una página de error/default
          break;
      }
    } else if (!authLoading && isAuthenticated && !user?.role) {
        console.warn("Login useEffect: User is authenticated but role is not defined. Cannot redirect based on role.");
        // Podrías redirigir a una página de "espera de asignación de rol" o mostrar un mensaje aquí.
    } else if (!authLoading && !isAuthenticated) {
        console.log("Login useEffect: Not authenticated, staying on login page.");
    }
  }, [isAuthenticated, user, authLoading, navigate]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError('Por favor, ingresa correo o usuario y contraseña.');
      return;
    }

    let emailToLogin = username; // Asumimos que el username es el email por defecto

    // Si el username no es un email, búscalo en la tabla 'users' para obtener el email
    if (!username.includes('@')) {
      try {
        console.log('Login: Buscando email por nombre de usuario:', username);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('nombre', username)
          .single();

        if (userError || !userData) {
          setError('Usuario no encontrado o error al buscar el email.');
          console.error('Login: Error fetching user email by name:', userError);
          return;
        }
        emailToLogin = userData.email;
        console.log('Login: Email encontrado para el usuario:', emailToLogin);
      } catch (err: any) {
        console.error('Login: Error al buscar email por nombre de usuario:', err.message);
        setError('Error al procesar el usuario. Intenta con tu correo electrónico.');
        return;
      }
    }

    // Intenta iniciar sesión con Supabase Auth
    console.log('Login: Intentando iniciar sesión con email:', emailToLogin);
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: emailToLogin,
      password,
    });

    if (loginError) {
      console.error('Login: Error de login en Supabase:', loginError.message);
      setError('Credenciales inválidas. Verifica tu correo/usuario y contraseña.');
      return;
    }

    console.log('Login: Inicio de sesión de Supabase exitoso. AuthContext se encargará de la redirección.');
    // Si el login es exitoso, el useEffect de AuthProvider detectará el cambio
    // y actualizará el estado global del usuario, lo que a su vez activará
    // la redirección en el useEffect de este componente.
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl p-8 space-y-6 text-white"
      >
        <div className="text-center">
          <PawPrint className="mx-auto h-12 w-12 text-indigo-400" />
          <h2 className="mt-4 text-3xl font-extrabold text-indigo-300">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-gray-400">Bienvenido de nuevo a Max's Groomer</p>
        </div>

        {error && (
          <div className="bg-red-200 text-red-800 px-4 py-2 rounded text-sm text-center">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Correo o usuario"
              required
            />
          </div>

          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
              className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Contraseña"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-indigo-300"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {capsLock && (
            <p className="text-sm text-yellow-400">🔒 Mayúsculas activadas</p>
          )}

          <div className="text-sm text-right">
            <Link to="/reset-password" className="text-indigo-400 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-700 hover:bg-indigo-600 text-white py-3 px-4 text-sm font-medium rounded-md transition-colors"
          >
            Entrar
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-indigo-400 hover:underline font-medium">
            Regístrate
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
