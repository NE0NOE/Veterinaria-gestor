import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Corrected import path
import { PawPrint } from 'lucide-react'; // Example icon

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Use the login function provided by the context, which now uses the service
  const { loginWithCredentials } = useAuth(); // Use the credential-based login
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    if (!username || !password) {
      setError('Por favor, ingresa usuario y contraseña.');
      return;
    }

    // Use the login function from AuthContext which now calls userService
    const success = loginWithCredentials({ username, password });

    if (success) {
      navigate('/dashboard'); // Redirect to dashboard on successful login
    } else {
      setError('Credenciales inválidas. Por favor, inténtalo de nuevo.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 space-y-6">
        <div className="text-center">
           <PawPrint className="mx-auto h-12 w-12 text-indigo-600" />
          <h2 className="mt-4 text-3xl font-extrabold text-gray-900">
            Iniciar Sesión
          </h2>
           <p className="mt-2 text-sm text-gray-600">
            Accede a Max's Groomer
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="username" className="sr-only">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Optional: Add "Remember me" or "Forgot password" links here */}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Entrar
            </button>
          </div>
        </form>
         {/* Display mock credentials for easy testing */}
         <div className="text-xs text-gray-500 text-center mt-4 p-3 bg-gray-50 rounded border border-gray-200">
            <p className="font-medium mb-1">Credenciales de prueba (usuario / contraseña):</p>
            <ul className="list-disc list-inside">
                <li>owner / password</li>
                <li>vet / password</li>
                <li>employee / password</li>
                <li>client / password</li>
            </ul>
         </div>
      </div>
    </div>
  );
};

export default Login;
