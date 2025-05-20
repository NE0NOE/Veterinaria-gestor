import { useAuth } from '../context/AuthContext';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { PawPrint, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError('Por favor, ingresa correo o usuario y contraseña.');
      return;
    }

    let emailToLogin = '';
    const isEmail = username.includes('@');

    if (isEmail) {
      emailToLogin = username;
    } else {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('nombre', username)
        .single();

      if (userError || !userData) {
        setError('Usuario no encontrado.');
        return;
      }

      emailToLogin = userData.email;
    }

    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
      email: emailToLogin,
      password,
    });

    if (loginError || !authData.user) {
      console.error('Error de login:', loginError?.message);
      setError('Credenciales inválidas.');
      return;
    }

    const userId = authData.user.id;

    const { data: userRoleData, error: userRoleError } = await supabase
      .from('user_roles')
      .select('id_rol')
      .eq('id_user', userId)
      .single();

    if (userRoleError || !userRoleData) {
      setError('Rol no asignado al usuario.');
      return;
    }

    const { data: roleNameData, error: roleNameError } = await supabase
      .from('roles')
      .select('nombre')
      .eq('id_rol', userRoleData.id_rol)
      .single();

    if (roleNameError || !roleNameData) {
      setError('No se pudo obtener el nombre del rol.');
      return;
    }

    const rol = roleNameData.nombre?.toLowerCase().trim();
    console.log('ROL ASIGNADO AL USUARIO:', rol);

    switch (rol) {
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
        setError(`Rol no reconocido: ${rol}`);
        break;
    }
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
