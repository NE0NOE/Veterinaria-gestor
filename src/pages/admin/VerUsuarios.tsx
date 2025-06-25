import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient.ts'; // Asegúrate de que esta ruta sea correcta
import { useNavigate } from 'react-router-dom';
import {
  Users, User, Mail, Phone, CalendarDays, Tag, Loader2, AlertCircle,
  XCircle, Stethoscope, PawPrint, List, PlusCircle, Pencil, Trash2, Save, RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Definición de tipos basada en tu esquema de BD
interface Rol {
  id_rol: number;
  nombre: string;
}

type UsuarioBase = {
  id_user: string;
  nombre: string;
  email: string;
  telefono: string | null;
  creado_en: string;
  rol: string; // Nombre del rol
};

type VeterinarioInfo = {
  id_veterinario: number;
  especialidad: string | null;
  totalCitasAsignadas: number;
};

type ClienteInfo = {
  id_cliente_db: number;
  totalMascotasRegistradas: number;
};

// Tipo combinado para la visualización en la tabla
type UsuarioDisplay = UsuarioBase & {
  veterinarioInfo?: VeterinarioInfo;
  clienteInfo?: ClienteInfo;
};

// Estado inicial para el formulario de agregar/editar
const initialFormState = {
  nombre: '',
  email: '',
  password: '', // Solo se usa para agregar nuevos usuarios
  telefono: '',
  rolId: 0,
  especialidad: '',
};

const VerUsuarios: React.FC = () => {
  const navigate = useNavigate();
  const { session, userRole, isLoading: authLoading } = useAuth(); // session para el token, userRole para permisos

  const [usuarios, setUsuarios] = useState<UsuarioDisplay[]>([]);
  const [filtroRol, setFiltroRol] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Carga del componente
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioDisplay | null>(null);

  // Estados para el modal de agregar/editar usuario
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [currentFormMode, setCurrentFormMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState(initialFormState);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false); // Carga para el envío del formulario

  // Función para obtener todos los datos necesarios y consolidarlos
  const fetchAllUserData = useCallback(async () => {
    setIsLoading(true); // Activa la carga global del componente
    setError(null);
    try {
      // 1. Obtener todos los usuarios de public.users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id_user, nombre, email, telefono, creado_en');
      if (usersError) throw usersError;

      // 2. Obtener roles de usuario
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select(`
          id_user,
          roles(nombre)
        `);
      if (userRolesError) throw userRolesError;

      const rolesMap = new Map<string, string>(); // Map<id_user, role_name>
      userRolesData?.forEach((ur: { id_user: string; roles: { nombre: string } | null }) => {
        rolesMap.set(ur.id_user, ur.roles?.nombre || 'Sin rol');
      });

      // 3. Obtener información de veterinarios
      const { data: veterinariosData, error: veterinariosError } = await supabase
        .from('veterinarios')
        .select('id_veterinario, id_user, especialidad');
      if (veterinariosError) throw veterinariosError;

      const veterinariosMap = new Map<string, Pick<VeterinarioInfo, 'id_veterinario' | 'especialidad'>>();
      veterinariosData?.forEach(v => {
        if (v.id_user) {
          veterinariosMap.set(v.id_user, { id_veterinario: v.id_veterinario, especialidad: v.especialidad });
        }
      });

      // 4. Obtener información de clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('id_cliente, id_user');
      if (clientesError) throw clientesError;

      const clientesMap = new Map<string, Pick<ClienteInfo, 'id_cliente_db'>>();
      clientesData?.forEach(c => {
        if (c.id_user) {
          clientesMap.set(c.id_user, { id_cliente_db: c.id_cliente });
        }
      });

      // 5. Contar citas por veterinario (solo si es necesario para el dashboard de admin)
      const { data: citasData, error: citasError } = await supabase
        .from('citas')
        .select('id_veterinario');
      if (citasError) { console.warn('Error fetching citas for vet count:', citasError.message); }
      
      const citasPorVeterinario = new Map<number, number>();
      citasData?.forEach(cita => {
        if (cita.id_veterinario) {
          citasPorVeterinario.set(cita.id_veterinario, (citasPorVeterinario.get(cita.id_veterinario) || 0) + 1);
        }
      });

      // 6. Contar mascotas por cliente (solo si es necesario para el dashboard de admin)
      const { data: mascotasData, error: mascotasError } = await supabase
        .from('mascotas')
        .select('id_cliente');
      if (mascotasError) { console.warn('Error fetching mascotas for client count:', mascotasError.message); }

      const mascotasPorCliente = new Map<number, number>();
      mascotasData?.forEach(mascota => {
        if (mascota.id_cliente) {
          mascotasPorCliente.set(mascota.id_cliente, (mascotasPorCliente.get(mascota.id_cliente) || 0) + 1);
        }
      });

      // 7. Consolidar todos los datos
      const usuariosConsolidados: UsuarioDisplay[] = usersData.map(user => {
        const rol = rolesMap.get(user.id_user) || 'Sin rol';
        const displayUser: UsuarioDisplay = {
          id_user: user.id_user,
          nombre: user.nombre,
          email: user.email,
          telefono: user.telefono,
          creado_en: user.creado_en,
          rol: rol,
        };

        if (rol.toLowerCase() === 'veterinario') {
          const vetData = veterinariosMap.get(user.id_user);
          if (vetData) {
            displayUser.veterinarioInfo = {
              id_veterinario: vetData.id_veterinario,
              especialidad: vetData.especialidad,
              totalCitasAsignadas: citasPorVeterinario.get(vetData.id_veterinario) || 0,
            };
          }
        } else if (rol.toLowerCase() === 'cliente') {
          const clientData = clientesMap.get(user.id_user);
          if (clientData) {
            displayUser.clienteInfo = {
              id_cliente_db: clientData.id_cliente_db,
              totalMascotasRegistradas: mascotasPorCliente.get(clientData.id_cliente_db) || 0,
            };
          }
        }
        return displayUser;
      });

      setUsuarios(usuariosConsolidados);

      // Cargar roles para el formulario de agregar/editar
      const { data: rolesList, error: rolesListError } = await supabase
        .from('roles')
        .select('*');
      if (rolesListError) throw rolesListError;
      setRoles(rolesList);

    } catch (err: any) {
      console.error('Error al cargar usuarios:', err.message);
      setError('Error al cargar la lista de usuarios: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchAllUserData();
    }
  }, [fetchAllUserData, authLoading]);

  const usuariosFiltrados = filtroRol
    ? usuarios.filter(u => u.rol.toLowerCase() === filtroRol.toLowerCase())
    : usuarios;

  const openUserDetailsModal = (user: UsuarioDisplay) => {
    setSelectedUser(user);
    setShowUserDetailsModal(true);
  };

  const closeUserDetailsModal = () => {
    setSelectedUser(null);
    setShowUserDetailsModal(false);
  };

  // --- Handlers para el Modal de Agregar/Editar ---
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'rolId' ? Number(value) : value,
    }));
  };

  const openAddModal = () => {
    setCurrentFormMode('add');
    setForm(initialFormState);
    setError(null);
    setMessage(null);
    setShowAddEditModal(true);
  };

  const openEditModal = (user: UsuarioDisplay) => {
    setCurrentFormMode('edit');
    setSelectedUser(user);
    const userRol = roles.find(r => r.nombre === user.rol);
    setForm({
      nombre: user.nombre,
      email: user.email,
      password: '',
      telefono: user.telefono || '',
      rolId: userRol ? userRol.id_rol : 0,
      especialidad: user.veterinarioInfo?.especialidad || '',
    });
    setError(null);
    setMessage(null);
    setShowAddEditModal(true);
  };

  const closeAddEditModal = () => {
    setShowAddEditModal(false);
    setForm(initialFormState);
    setSelectedUser(null);
    setError(null);
    setMessage(null);
  };

  const handleSubmitAddEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const selectedRol = roles.find(r => r.id_rol === form.rolId);
    if (!selectedRol) {
      setError('Por favor, selecciona un rol válido.');
      setIsSubmitting(false);
      return;
    }

    if (!form.nombre || !form.email || !form.telefono || form.rolId === 0) {
      setError('Por favor, completa todos los campos obligatorios: Nombre, Email, Teléfono, Rol.');
      setIsSubmitting(false);
      return;
    }

    if (currentFormMode === 'add' && !form.password) {
      setError('La contraseña es obligatoria para nuevos usuarios.');
      setIsSubmitting(false);
      return;
    }

    if (selectedRol.nombre.toLowerCase() === 'veterinario' && !form.especialidad) {
      setError('Por favor, ingresa la especialidad para el veterinario.');
      setIsSubmitting(false);
      return;
    }

    try {
        if (userRole !== 'admin') {
            throw new Error('No tienes permisos de administrador para realizar esta acción.');
        }

        if (currentFormMode === 'add') {
            // Invitar/Crear usuario directamente via Supabase Auth Admin
            // Los metadatos serán usados por el trigger handle_new_user
            const { data: authSignUpData, error: authSignUpError } = await supabase.auth.admin.inviteUserByEmail(form.email, {
                data: {
                    nombre_completo: form.nombre,
                    telefono: form.telefono,
                    role_id: form.rolId, // Se envía el role_id para que el trigger lo use
                    especialidad: form.especialidad // Se envía la especialidad si es veterinario
                },
                password: form.password // Se puede establecer una contraseña inicial
            });

            if (authSignUpError) {
                // Comprobar si el error es por usuario ya existente
                if (authSignUpError.message.includes('User already registered')) {
                  setError('El correo electrónico ya está registrado.');
                } else {
                  throw new Error(`Error al invitar/crear usuario en Auth: ${authSignUpError.message}`);
                }
            } else {
                setMessage('Usuario invitado/creado exitosamente. Se ha enviado un correo de confirmación (si la configuración lo requiere).');
            }
            
        } else { // 'edit' mode
            if (!selectedUser?.id_user) {
                throw new Error('User ID missing for edit operation.');
            }

            // 1. Actualizar public.users
            const { error: updateUserError } = await supabase
                .from('users')
                .update({ nombre: form.nombre, email: form.email, telefono: form.telefono })
                .eq('id_user', selectedUser.id_user);

            if (updateUserError) {
                throw new Error(`Error al actualizar el perfil de usuario: ${updateUserError.message}`);
            }

            // 2. Actualizar public.user_roles si el rol cambió
            const oldUserRole = roles.find(r => r.nombre === selectedUser.rol);
            if (oldUserRole?.id_rol !== form.rolId) {
                const { error: updateUserRoleError } = await supabase
                    .from('user_roles')
                    .update({ id_rol: form.rolId })
                    .eq('id_user', selectedUser.id_user);

                if (updateUserRoleError) {
                    throw new Error(`Error al actualizar el rol del usuario: ${updateUserRoleError.message}`);
                }

                // Lógica de transición de perfil (borrar viejo, crear nuevo si aplica)
                if (oldUserRole?.nombre.toLowerCase() === 'veterinario') {
                    await supabase.from('veterinarios').delete().eq('id_user', selectedUser.id_user);
                } else if (oldUserRole?.nombre.toLowerCase() === 'cliente') {
                    await supabase.from('clientes').delete().eq('id_user', selectedUser.id_user);
                }

                if (selectedRol.nombre.toLowerCase() === 'veterinario') {
                    await supabase.from('veterinarios').insert({
                        id_user: selectedUser.id_user,
                        nombre: form.nombre,
                        email: form.email,
                        telefono: form.telefono,
                        especialidad: form.especialidad
                    });
                } else if (selectedRol.nombre.toLowerCase() === 'cliente') {
                    await supabase.from('clientes').insert({
                        id_user: selectedUser.id_user,
                        nombre: form.nombre,
                        email: form.email,
                        telefono: form.telefono
                    });
                } else {
                    // Si el nuevo rol no es veterinario ni cliente, asegúrate de que no tenga un perfil antiguo
                    await supabase.from('veterinarios').delete().eq('id_user', selectedUser.id_user);
                    await supabase.from('clientes').delete().eq('id_user', selectedUser.id_user);
                }
            } else if (selectedRol.nombre.toLowerCase() === 'veterinario' && selectedUser.veterinarioInfo?.especialidad !== form.especialidad) {
                // Si el rol es veterinario y la especialidad cambió (sin cambiar el rol)
                await supabase.from('veterinarios').update({ especialidad: form.especialidad }).eq('id_user', selectedUser.id_user);
            }
            setMessage('Usuario actualizado exitosamente.');
        }
        
        closeAddEditModal();
        fetchAllUserData(); // Recargar datos para ver los cambios
    } catch (err: any) {
        setError(err.message || 'Error desconocido al procesar la solicitud.');
        console.error('Frontend Error:', err);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userIdToDelete: string, userName: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar a ${userName} de forma permanente? Esta acción es irreversible.`)) {
      return;
    }
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (userRole !== 'admin') {
          throw new Error('No tienes permisos de administrador para realizar esta acción.');
      }

      // Eliminar usuario directamente de Supabase Auth
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userIdToDelete);

      if (deleteUserError) {
        throw new Error(`Error al eliminar usuario en Auth: ${deleteUserError.message}`);
      }
      // El trigger handle_deleted_user se encargará de limpiar las tablas públicas

      setMessage(`Usuario ${userName} eliminado exitosamente.`);
      fetchAllUserData(); // Recargar datos
    } catch (err: any) {
      setError(err.message || 'Error desconocido al eliminar el usuario.');
      console.error('Frontend Error (Delete):', err);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-950 text-white">
        <Loader2 className="animate-spin mr-3 text-blue-400" size={36} />
        <p className="text-xl text-blue-400">Cargando usuarios y roles...</p>
      </div>
    );
  }

  if (userRole !== 'admin') {
    navigate('/login'); // Redirigir a login si no es admin
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-950 text-white text-xl">
        Acceso Denegado. Redirigiendo...
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-950 text-white min-h-screen font-inter">
      <h2 className="text-3xl font-extrabold text-blue-400 mb-8 flex items-center gap-3">
        <Users size={28} /> Gestión de Usuarios del Sistema
      </h2>

      {error && (
        <div className="bg-red-800 text-red-100 p-4 rounded-lg text-center border border-red-600 mb-6 flex items-center justify-between shadow-md animate-fade-in">
          <AlertCircle size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">{error}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setError(null)} />
        </div>
      )}
      {message && (
        <div className="bg-green-800 text-green-100 p-4 rounded-lg text-center border border-green-600 mb-6 flex items-center justify-between shadow-md animate-fade-in">
          <CheckCircle2 size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">{message}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setMessage(null)} />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-4 bg-gray-900 p-4 rounded-lg shadow-lg border border-blue-800">
        <label htmlFor="filtroRol" className="text-lg font-medium text-gray-300">Filtrar por Rol:</label>
        <select
          id="filtroRol"
          className="bg-gray-800 text-white border border-gray-600 px-4 py-2 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
        >
          <option value="">Todos</option>
          {roles.map(rol => (
            <option key={rol.id_rol} value={rol.nombre.toLowerCase()}>{rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}</option>
          ))}
        </select>
        <button
          onClick={fetchAllUserData}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-md flex items-center gap-2"
          title="Actualizar Lista de Usuarios"
          disabled={isLoading}
        >
          <RotateCcw size={20} className={isLoading ? 'animate-spin' : ''} /> Actualizar
        </button>
        <button
          onClick={openAddModal}
          className="ml-auto px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition shadow-md flex items-center gap-2"
          title="Agregar Nuevo Usuario"
        >
          <User size={20} /> Agregar Usuario
        </button>
      </div>

      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800">
        <h3 className="text-2xl font-bold text-blue-400 mb-5 flex items-center gap-2">
          <List size={22} /> Listado Detallado
        </h3>
        {usuariosFiltrados.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No hay usuarios registrados con este filtro.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="min-w-full table-auto divide-y divide-gray-700 text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><User size={14} />Nombre</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><Mail size={14} />Correo</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><Phone size={14} />Teléfono</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><Tag size={14} />Rol</div>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><CalendarDays size={14} />Creado El</div>
                  </th>
                  <th className="px-4 py-3 text-right text-gray-300 font-semibold text-xs uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-700">
                {usuariosFiltrados.map((user) => (
                  <tr key={user.id_user} className="hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{user.nombre}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{user.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{user.telefono || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize
                        ${user.rol.toLowerCase() === 'admin' ? 'bg-purple-600 text-purple-100' :
                          user.rol.toLowerCase() === 'veterinario' ? 'bg-blue-600 text-blue-100' :
                            user.rol.toLowerCase() === 'asistente' ? 'bg-teal-600 text-teal-100' :
                              user.rol.toLowerCase() === 'cliente' ? 'bg-green-600 text-green-100' :
                                'bg-gray-600 text-gray-200'
                        }`}>
                        {user.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(user.creado_en).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => openUserDetailsModal(user)}
                        className="text-indigo-400 hover:text-indigo-600 p-2 rounded-md transition-colors"
                        title="Ver Detalles"
                      >
                        <List size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-400 hover:text-blue-600 p-2 rounded-md transition-colors"
                        title="Editar Usuario"
                      >
                        <Pencil size={16} />
                      </button>
                      {session?.user?.id !== user.id_user && (
                        <button
                          onClick={() => handleDeleteUser(user.id_user, user.nombre)}
                          className="text-red-400 hover:text-red-600 p-2 rounded-md transition-colors"
                          title="Eliminar Usuario"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalles del Usuario (reutilizado de tu diseño existente) */}
      {showUserDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg space-y-6 border border-blue-700 transform scale-100 animate-scale-in">
            <button
              onClick={closeUserDetailsModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              title="Cerrar"
            >
              <XCircle size={24} />
            </button>
            <h3 className="text-2xl font-bold text-blue-400 text-center flex items-center justify-center gap-2">
              <User size={24} /> Detalles de {selectedUser.nombre}
            </h3>
            <div className="text-gray-300 space-y-3">
              <p><span className="font-semibold text-white">Email:</span> {selectedUser.email}</p>
              <p><span className="font-semibold text-white">Teléfono:</span> {selectedUser.telefono || 'N/A'}</p>
              <p><span className="font-semibold text-white">Rol:</span> <span className="capitalize">{selectedUser.rol}</span></p>
              <p><span className="font-semibold text-white">Fecha de Creación:</span> {new Date(selectedUser.creado_en).toLocaleDateString('es-ES')}</p>

              {selectedUser.rol.toLowerCase() === 'veterinario' &&
                selectedUser.veterinarioInfo && (
                  <div className="bg-gray-700 p-4 rounded-md border border-gray-600 mt-4 space-y-2">
                    <h4 className="text-lg font-bold text-indigo-300 flex items-center gap-2"><Stethoscope size={18} /> Información de Veterinario:</h4>
                    <p><span className="font-semibold text-white">ID Veterinario:</span> {selectedUser.veterinarioInfo.id_veterinario}</p>
                    <p><span className="font-semibold text-white">Especialidad:</span> {selectedUser.veterinarioInfo.especialidad || 'No especificado'}</p>
                    <p><span className="font-semibold text-white">Citas Asignadas:</span> {selectedUser.veterinarioInfo.totalCitasAsignadas}</p>
                  </div>
                )}
              {selectedUser.rol.toLowerCase() === 'cliente' &&
                selectedUser.clienteInfo && (
                  <div className="bg-gray-700 p-4 rounded-md border border-gray-600 mt-4 space-y-2">
                    <h4 className="text-lg font-bold text-indigo-300 flex items-center gap-2"><PawPrint size={18} /> Información de Cliente:</h4>
                    <p><span className="font-semibold text-white">ID Cliente (DB):</span> {selectedUser.clienteInfo.id_cliente_db}</p>
                    <p><span className="font-semibold text-white">Mascotas Registradas:</span> {selectedUser.clienteInfo.totalMascotasRegistradas}</p>
                  </div>
                )}
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={closeUserDetailsModal}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agregar/Editar Usuario - Ahora dentro de VerUsuarios */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md space-y-6 border border-blue-700 transform scale-100 animate-scale-in">
            <button
              onClick={closeAddEditModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              title="Cerrar"
            >
              <XCircle size={24} />
            </button>
            <h3 className="text-2xl font-bold text-blue-400 text-center flex items-center justify-center gap-2">
              {currentFormMode === 'add' ? <PlusCircle size={24} /> : <Pencil size={24} />}
              {currentFormMode === 'add' ? 'Agregar Nuevo Usuario' : `Editar Usuario: ${selectedUser?.nombre}`}
            </h3>

            {error && (
              <div className="bg-red-800 text-red-100 p-3 rounded text-center border border-red-600 flex items-center justify-between">
                <span>{error}</span>
                <XCircle size={18} className="cursor-pointer" onClick={() => setError(null)} />
              </div>
            )}
            {message && (
              <div className="bg-green-800 text-green-100 p-3 rounded text-center border border-green-600 flex items-center justify-between">
                <span>{message}</span>
                <XCircle size={18} className="cursor-pointer" onClick={() => setMessage(null)} />
              </div>
            )}

            <form onSubmit={handleSubmitAddEdit} className="space-y-4">
              <div>
                <label htmlFor="nombre" className="block text-gray-300 text-sm font-bold mb-1">Nombre Completo</label>
                <input type="text" name="nombre" id="nombre" value={form.nombre} onChange={handleFormChange} required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting} />
              </div>
              <div>
                <label htmlFor="email" className="block text-gray-300 text-sm font-bold mb-1">Correo Electrónico</label>
                <input type="email" name="email" id="email" value={form.email} onChange={handleFormChange} required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isSubmitting || currentFormMode === 'edit'} // Email no editable en modo edición aquí para simplificar
                />
              </div>
              {currentFormMode === 'add' && (
                <div>
                  <label htmlFor="password" className="block text-gray-300 text-sm font-bold mb-1">Contraseña</label>
                  <input type="password" name="password" id="password" value={form.password} onChange={handleFormChange} required={currentFormMode === 'add'}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={isSubmitting} />
                </div>
              )}
              <div>
                <label htmlFor="telefono" className="block text-gray-300 text-sm font-bold mb-1">Teléfono</label>
                <input type="tel" name="telefono" id="telefono" value={form.telefono} onChange={handleFormChange} required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-indigo-500 focus:border-blue-500"
                    disabled={isSubmitting} />
              </div>
              <div>
                <label htmlFor="rolId" className="block text-gray-300 text-sm font-bold mb-1">Rol</label>
                <select name="rolId" id="rolId" value={form.rolId} onChange={handleFormChange} required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                >
                  <option value={0}>Selecciona un rol</option>
                  {roles.filter(r => r.nombre.toLowerCase() !== 'cliente').map(rol => ( // El admin agrega veterinarios/asistentes/otros admins, no clientes (clientes se registran solos)
                    <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}</option>
                  ))}
                </select>
              </div>
              {form.rolId === roles.find(r => r.nombre.toLowerCase() === 'veterinario')?.id_rol && (
                <div>
                  <label htmlFor="especialidad" className="block text-gray-300 text-sm font-bold mb-1">Especialidad (Veterinario)</label>
                  <input type="text" name="especialidad" id="especialidad" value={form.especialidad} onChange={handleFormChange} required={form.rolId === roles.find(r => r.nombre.toLowerCase() === 'veterinario')?.id_rol}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={isSubmitting} />
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {isSubmitting ? 'Guardando...' : (currentFormMode === 'add' ? 'Agregar Usuario' : 'Guardar Cambios')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerUsuarios;
