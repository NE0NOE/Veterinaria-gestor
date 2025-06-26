import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient.ts';
import { UserPlus, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Definiciones de tipos (basadas en tu estructura de DB)
interface Role {
  id_rol: number;
  nombre: string;
}

const AgregarUsuario: React.FC = () => { // <--- Nombre del componente: AgregarUsuario
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState(0); // Para el rol seleccionado
  const [especialidad, setEspecialidad] = useState(''); // Solo para veterinarios
  const [roles, setRoles] = useState<Role[]>([]); // Lista de roles disponibles
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Para la carga inicial de roles
  const [isSubmitting, setIsSubmitting] = useState(false); // Para el envío del formulario
  const navigate = useNavigate();

  // Función para mostrar mensajes de feedback
  const showMessage = useCallback((type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccess(message);
      setError(null);
    } else {
      setError(message);
      setSuccess(null);
    }
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 5000); // Los mensajes desaparecen después de 5 segundos
  }, []);

  // Cargar roles disponibles al montar el componente
  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: rolesError } = await supabase
        .from('roles')
        .select('id_rol, nombre')
        .in('nombre', ['admin', 'asistente', 'veterinario']); // Roles de empleado, NO 'cliente'

      if (rolesError) throw rolesError;
      setRoles(data || []);
    } catch (err: any) {
      console.error('Error fetching roles:', err.message);
      showMessage('error', 'Error al cargar los roles disponibles. Intenta recargar la página.');
    } finally {
      setIsLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Manejador del envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    if (!nombre || !email || !password || selectedRoleId === 0) {
      showMessage('error', 'Por favor, rellena todos los campos obligatorios.');
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) { // Validación de contraseña mínima
        showMessage('error', 'La contraseña debe tener al menos 6 caracteres.');
        setIsSubmitting(false);
        return;
    }

    const selectedRoleName = roles.find(r => r.id_rol === selectedRoleId)?.nombre.toLowerCase();

    if (selectedRoleName === 'veterinario' && !especialidad) {
      showMessage('error', 'Para el rol de veterinario, la especialidad es obligatoria.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Uso de supabase.auth.admin.inviteUserByEmail para crear el usuario
      // Tus triggers de Supabase (handle_new_user) son CLAVE aquí para crear
      // las entradas en public.users y public.user_roles/veterinarios.
      const { data: authData, error: signupError } = await supabase.auth.admin.inviteUserByEmail(email, {
        password: password,
        data: { // Estos metadatos serán leídos por tus triggers en Supabase
          nombre_completo: nombre,
          telefono: telefono || null,
          especialidad: selectedRoleName === 'veterinario' ? especialidad : null,
          role_id: selectedRoleId,
        },
      });

      if (signupError) {
        if (signupError.message.includes('User already registered')) {
          showMessage('error', 'El correo electrónico ya está registrado. Por favor, usa otro.');
        } else {
          throw new Error(signupError.message || 'Error al crear la cuenta de empleado.');
        }
      } else {
        showMessage('success', '¡Empleado agregado exitosamente! Se ha enviado un correo de invitación (si tu configuración lo requiere).');
        // Limpiar formulario
        setNombre('');
        setEmail('');
        setTelefono('');
        setPassword('');
        setSelectedRoleId(0);
        setEspecialidad('');
        // Opcional: Redirigir al admin a la lista de empleados o a otro lugar
        // setTimeout(() => navigate('/admin-dashboard/gestion-empleados'), 3000); 
      }
    } catch (err: any) {
      console.error('Error adding employee:', err.message);
      showMessage('error', 'No se pudo agregar al empleado: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white font-inter">
        <Loader2 className="animate-spin mr-3 text-blue-400" size={36} />
        <p className="text-xl text-blue-400">Cargando roles de empleados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 font-inter">
      <div className="w-full max-w-lg bg-gray-900 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-white border border-blue-800 animate-fade-in">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-400 flex items-center justify-center gap-2">
            <UserPlus size={28} /> Registrar Nuevo Empleado
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Crea una cuenta para el nuevo miembro de tu equipo, ¡listo para cuidar a nuestros amigos peludos!
          </p>
        </div>

        {/* Mensajes de feedback */}
        {error && (
          <div className="bg-red-800 text-red-100 px-4 py-3 rounded-lg text-sm text-center flex items-center justify-center gap-2 shadow-md animate-bounce-in">
            <AlertCircle size={20} /> {error}
          </div>
        )}
        {success && (
          <div className="bg-green-800 text-green-100 px-4 py-3 rounded-lg text-sm text-center flex items-center justify-center gap-2 shadow-md animate-bounce-in">
            <CheckCircle size={20} /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-400"
            required
          />
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-400"
            required
          />
          <input
            type="tel" // Usar 'tel' para teléfonos
            placeholder="Teléfono (opcional)"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-400"
          />
          <input
            type="password"
            placeholder="Contraseña inicial (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-400"
            required
            minLength={6}
          />
          
          <select
            value={selectedRoleId}
            onChange={(e) => {
              setSelectedRoleId(Number(e.target.value));
              // Si el rol no es veterinario, limpiar especialidad
              const roleName = roles.find(r => r.id_rol === Number(e.target.value))?.nombre.toLowerCase();
              if (roleName !== 'veterinario') {
                setEspecialidad('');
              }
            }}
            className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
          >
            <option value={0} disabled>Selecciona el rol del empleado</option>
            {roles.map((rol) => (
              <option key={rol.id_rol} value={rol.id_rol}>
                {rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}
              </option>
            ))}
          </select>

          {/* Campo de especialidad solo si el rol es veterinario */}
          {roles.find(r => r.id_rol === selectedRoleId)?.nombre.toLowerCase() === 'veterinario' && (
            <input
              type="text"
              placeholder="Especialidad (ej: Dermatología, Cirugía)"
              value={especialidad}
              onChange={(e) => setEspecialidad(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-400"
              required
            />
          )}

          <button
            type="submit"
            className="w-full bg-indigo-700 hover:bg-indigo-600 text-white py-3 px-4 text-base font-medium rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
            {isSubmitting ? 'Registrando Empleado...' : 'Registrar Empleado'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AgregarUsuario; // <--- Exportamos con el nombre AgregarUsuario
