import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient.ts'; // Asegúrate de que esta ruta sea correcta
import { useNavigate } from 'react-router-dom';
import {
  User, UserPlus, Edit, Trash2, Loader2, AlertCircle, CheckCircle,
  Briefcase, Stethoscope, Search, ChevronLeft, ChevronRight, Ban, RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; // Tu AuthContext existente

// Definiciones de Tipos
interface Role {
  id_rol: number;
  nombre: string;
}

interface UserDB {
  id_user: string;
  nombre: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  creado_en: string; // ISO string
}

interface Employee extends UserDB {
  id_rol: number;
  nombre_rol: string;
  especialidad?: string | null; // Opcional, solo para veterinarios
  // Si deseas mostrar citas asignadas/mascotas registradas aquí,
  // ajusta esta interfaz y la lógica de fetchEmployees.
}

const GestionEmpleadosAdmin: React.FC = () => {
  const navigate = useNavigate();
  // Usamos el AuthContext tal cual lo tienes, con sus propios estados de `loading` y `userRole`
  const { userRole, loading: authLoading, session, user } = useAuth(); 

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [componentLoading, setComponentLoading] = useState(true); // Carga interna de este componente
  const [roles, setRoles] = useState<Role[]>([]); // Roles para el select
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Estado del formulario para agregar/editar
  const [formFields, setFormFields] = useState({
    id_user: '', // Solo para edición
    nombre: '',
    email: '',
    telefono: '',
    password: '', // Solo para agregar, o para resetear contraseña en edición
    id_rol: 0, 
    especialidad: '', // Solo para veterinarios
    activo: true, // Solo para edición
  });

  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  // Estados para búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState(''); 

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    }, 5000); // Mensajes desaparecen después de 5 segundos
  }, []);

  const clearMessages = useCallback(() => {
    setSuccess(null);
    setError(null);
  }, []);

  /**
   * Carga los roles disponibles desde la base de datos, excluyendo 'cliente' en el select para el admin.
   */
  const fetchRoles = useCallback(async () => {
    try {
      const { data, error: rolesError } = await supabase
        .from('roles')
        .select('id_rol, nombre')
        .in('nombre', ['admin', 'asistente', 'veterinario']); // Filtrar solo roles de empleados

      if (rolesError) throw rolesError;
      setRoles(data || []);
    } catch (err: any) {
      console.error('Error fetching roles:', err.message);
      showMessage('error', 'Error al cargar los roles disponibles: ' + err.message);
    }
  }, [showMessage]);

  /**
   * Carga la lista de empleados (usuarios con rol que no sea 'cliente')
   * combinando datos de public.users, public.user_roles y public.veterinarios.
   */
  const fetchEmployees = useCallback(async () => {
    setComponentLoading(true); // Activa la carga interna del componente
    clearMessages();
    try {
      // 1. Obtener los roles de empleados (admin, asistente, veterinario)
      const { data: employeeRolesData, error: rolesError } = await supabase
        .from('roles')
        .select('id_rol, nombre')
        .in('nombre', ['admin', 'asistente', 'veterinario']); // Filtrar solo roles de empleados

      if (rolesError) throw rolesError;

      const employeeRoleIds = employeeRolesData.map(role => role.id_rol);
      const roleMap = new Map(employeeRolesData.map(role => [role.id_rol, role.nombre]));

      // 2. Obtener usuarios de public.users que tienen uno de estos roles
      // JOIN con user_roles y roles para obtener el rol_nombre directamente
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id_user,
          nombre,
          email,
          telefono,
          activo,
          creado_en,
          user_roles(id_rol, roles(nombre))
        `)
        .in('user_roles.id_rol', employeeRoleIds); // Filtrar por los IDs de roles de empleado

      if (usersError) throw usersError;

      // 3. Obtener los detalles de veterinarios si aplica
      const { data: vetsData, error: vetsError } = await supabase
        .from('veterinarios')
        .select('id_user, especialidad, id_veterinario'); 
      if (vetsError) console.warn('Error fetching vets data (optional):', vetsError.message);

      const vetMap = new Map(vetsData?.map(vet => [vet.id_user, { especialidad: vet.especialidad, id_veterinario: vet.id_veterinario }]) || []);

      // 4. Combinar todos los datos
      const combinedEmployees: Employee[] = usersData.map(userItem => { // Renombrado user a userItem para evitar conflicto
        const userRoleEntry = Array.isArray(userItem.user_roles) ? userItem.user_roles[0] : userItem.user_roles;
        const id_rol = userRoleEntry?.id_rol || 0;
        const nombre_rol = (userRoleEntry?.roles as { nombre: string })?.nombre || 'Desconocido';

        const employee: Employee = {
          id_user: userItem.id_user,
          nombre: userItem.nombre,
          email: userItem.email,
          telefono: userItem.telefono,
          activo: userItem.activo,
          creado_en: userItem.creado_en,
          id_rol: id_rol,
          nombre_rol: nombre_rol,
        };

        if (nombre_rol.toLowerCase() === 'veterinario') {
          const vetDetails = vetMap.get(userItem.id_user);
          if (vetDetails) {
            employee.especialidad = vetDetails.especialidad;
          }
        }
        return employee;
      });

      setEmployees(combinedEmployees);

    } catch (err: any) {
      console.error('Error fetching employees:', err.message);
      showMessage('error', 'Error al cargar la lista de empleados: ' + err.message);
    } finally {
      setComponentLoading(false); // Desactiva la carga interna del componente
    }
  }, [showMessage, clearMessages]);

  useEffect(() => {
    // Si authLoading es false Y userRole es 'admin', entonces cargamos los empleados
    // Esto se disparará una vez que AuthContext haya resuelto el rol a 'admin'
    if (!authLoading && userRole === 'admin') {
      fetchRoles();
      fetchEmployees();
      // Nota: Si quieres Realtime, descomenta las suscripciones aquí.
      // Actualmente, la actualización es manual con el botón o después de Add/Edit/Delete.
    }

    // Redirigir si AuthContext terminó de cargar (authLoading es false) y el rol NO es admin.
    // Esto es crucial para el comportamiento de tu AuthContext, que podría dar un userRole `undefined`
    // inicialmente pero luego resolverlo. SOLO redirigimos si el rol NO ES 'admin' DESPUÉS de la carga de Auth.
    if (!authLoading && userRole !== 'admin') {
        console.warn(`[GestionEmpleadosAdmin] Acceso Denegado. userRole: ${userRole}. Redirigiendo a /login.`);
        navigate('/login');
    }
  }, [fetchRoles, fetchEmployees, authLoading, userRole, navigate]); // Dependencias

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      setFormFields((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormFields((prev) => ({ ...prev, [name]: value }));
    }

    if (name === 'id_rol') {
      const selectedRole = roles.find(r => r.id_rol === Number(value)); // Convertir a Number
      if (selectedRole?.nombre.toLowerCase() !== 'veterinario') {
        setFormFields((prev) => ({ ...prev, especialidad: '' }));
      }
    }
  };

  const openAddModal = () => {
    setFormFields({
      id_user: '',
      nombre: '',
      email: '',
      telefono: '',
      password: '',
      id_rol: 0,
      especialidad: '',
      activo: true,
    });
    clearMessages();
    setShowAddModal(true);
  };

  const openEditModal = (employee: Employee) => {
    setCurrentEmployee(employee);
    setFormFields({
      id_user: employee.id_user,
      nombre: employee.nombre,
      email: employee.email,
      telefono: employee.telefono || '',
      password: '', // La contraseña no se edita directamente así, solo se puede resetear
      id_rol: employee.id_rol,
      especialidad: employee.especialidad || '',
      activo: employee.activo,
    });
    clearMessages();
    setShowEditModal(true);
  };

  const openDeleteConfirmModal = (employee: Employee) => {
    setCurrentEmployee(employee);
    clearMessages();
    setShowDeleteConfirmModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setComponentLoading(true); // Activa carga durante el envío

    const { nombre, email, telefono, password, id_rol, especialidad } = formFields;

    if (!nombre || !email || !password || id_rol === 0) {
      showMessage('error', 'Por favor, rellena todos los campos obligatorios: Nombre, Email, Contraseña y Rol.');
      setComponentLoading(false);
      return;
    }

    const selectedRoleName = roles.find(r => r.id_rol === id_rol)?.nombre.toLowerCase();

    if (selectedRoleName === 'veterinario' && !especialidad) {
      showMessage('error', 'Si el rol es veterinario, la especialidad es obligatoria.');
      setComponentLoading(false);
      return;
    }

    try {
      if (userRole !== 'admin') { // Doble check de permisos
        throw new Error('No tienes permisos de administrador para realizar esta acción.');
      }

      // Crear usuario en Supabase Auth. El trigger handle_new_user se encargará de las tablas públicas.
      const { data: authData, error: signupError } = await supabase.auth.admin.inviteUserByEmail(email, {
        password: password,
        data: { // Estos metadatos serán leídos por tu trigger `handle_new_user`
          nombre_completo: nombre,
          telefono: telefono,
          role_id: id_rol, 
          especialidad: especialidad, 
        },
      });

      if (signupError) {
        if (signupError.message.includes('User already registered')) {
          showMessage('error', 'El correo electrónico ya está registrado. Por favor, usa otro.');
        } else {
          throw new Error(signupError.message || 'Error al crear usuario en autenticación.');
        }
      } else {
        showMessage('success', 'Empleado agregado exitosamente. Se ha enviado un correo de confirmación (si tu configuración lo requiere).');
        setShowAddModal(false);
        fetchEmployees(); // Forzar la recarga de la tabla después de agregar
      }

    } catch (err: any) {
      console.error('Error adding employee:', err.message);
      showMessage('error', 'No se pudo agregar al empleado: ' + err.message);
    } finally {
      setComponentLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setComponentLoading(true); // Activa carga durante el envío

    const { id_user, nombre, email, telefono, id_rol, especialidad, activo } = formFields;

    if (!currentEmployee) {
      showMessage('error', 'No hay empleado seleccionado para editar.');
      setComponentLoading(false);
      return;
    }

    const selectedRoleName = roles.find(r => r.id_rol === id_rol)?.nombre.toLowerCase();

    if (selectedRoleName === 'veterinario' && !especialidad) {
      showMessage('error', 'Si el rol es veterinario, la especialidad es obligatoria.');
      setComponentLoading(false);
      return;
    }

    try {
      if (userRole !== 'admin') { // Doble check de permisos
        throw new Error('No tienes permisos de administrador para realizar esta acción.');
      }

      // 1. Actualizar public.users
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          nombre: nombre,
          email: email,
          telefono: telefono || null,
          activo: activo,
        })
        .eq('id_user', id_user);
      if (userUpdateError) throw userUpdateError;

      // 2. Actualizar public.user_roles si el rol cambió
      if (id_rol !== currentEmployee.id_rol) {
        const { error: userRoleUpdateError } = await supabase
          .from('user_roles')
          .update({ id_rol: id_rol })
          .eq('id_user', id_user);
        if (userRoleUpdateError) throw userRoleUpdateError;

        // Lógica de transición de perfil específico si el rol cambió
        // Eliminar de tablas de perfil antiguas
        if (currentEmployee.nombre_rol.toLowerCase() === 'veterinario') {
          await supabase.from('veterinarios').delete().eq('id_user', id_user);
        } else if (currentEmployee.nombre_rol.toLowerCase() === 'cliente') {
          await supabase.from('clientes').delete().eq('id_user', id_user);
        }

        // Insertar en tabla de perfil nueva si aplica
        if (selectedRoleName === 'veterinario') {
          await supabase.from('veterinarios').insert({
            id_user: id_user, nombre: nombre, especialidad: especialidad, telefono: telefono || null, email: email
          });
        } else if (selectedRoleName === 'cliente') {
          await supabase.from('clientes').insert({
            id_user: id_user, nombre: nombre, telefono: telefono || null, email: email
          });
        }
      } else if (selectedRoleName === 'veterinario') {
        // Si el rol NO cambió pero sigue siendo veterinario, actualizar solo la especialidad si ha cambiado
        const { error: vetUpdateError } = await supabase
          .from('veterinarios')
          .update({ especialidad: especialidad, nombre: nombre, email: email, telefono: telefono })
          .eq('id_user', id_user);
        if (vetUpdateError) console.warn('Error al actualizar especialidad de veterinario:', vetUpdateError.message);
      }
      
      // 3. Actualizar email en Supabase Auth si cambió (opcional, Admin puede no tener permiso)
      if (email !== currentEmployee.email) {
        const { error: authUpdateError } = await supabase.auth.admin.updateUserById(id_user, { email: email });
        if (authUpdateError) {
          console.warn('Advertencia: Email actualizado en public.users pero no en auth.users:', authUpdateError.message);
          showMessage('error', 'Empleado actualizado, pero no se pudo actualizar el email de autenticación: ' + authUpdateError.message);
        }
      }

      showMessage('success', 'Empleado actualizado exitosamente.');
      setShowEditModal(false);
      fetchEmployees(); // Forzar la recarga de la tabla después de editar
    } catch (err: any) {
      console.error('Error updating employee:', err.message);
      showMessage('error', 'No se pudo actualizar al empleado: ' + err.message);
    } finally {
      setComponentLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentEmployee) return;
    clearMessages();
    setComponentLoading(true); // Activa carga durante el envío

    try {
      if (userRole !== 'admin') { // Doble check de permisos
        throw new Error('No tienes permisos de administrador para realizar esta acción.');
      }

      const userId = currentEmployee.id_user;

      // Eliminar usuario directamente de Supabase Auth. El trigger handle_deleted_user se encargará de las tablas públicas.
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        throw new Error(`Error al eliminar usuario en Auth: ${authDeleteError.message}`);
      }

      showMessage('success', 'Empleado eliminado exitosamente.');
      setShowDeleteConfirmModal(false);
      setCurrentEmployee(null);
      fetchEmployees(); // Forzar la recarga de la tabla después de eliminar
    } catch (err: any) {
      console.error('Error deleting employee:', err.message);
      showMessage('error', 'No se pudo eliminar al empleado: ' + err.message);
    } finally {
      setComponentLoading(false);
    }
  };

  // Filtrado y paginación
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = searchTerm === '' ||
        employee.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.telefono?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === '' ||
        employee.id_rol.toString() === filterRole; // Comparar id_rol como string
      return matchesSearch && matchesRole;
    });
  }, [employees, searchTerm, filterRole]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredEmployees.slice(startIndex, endIndex);
  }, [filteredEmployees, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Loader principal: Muestra el loader si AuthContext está cargando O si este componente está cargando
  // Y si userRole es 'admin' (para evitar loader si no se permite el acceso)
  if (authLoading || (componentLoading && userRole === 'admin')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-950 text-white font-inter">
        <Loader2 className="animate-spin mr-3 text-blue-400" size={36} />
        <p className="text-xl text-blue-400">Cargando gestión de empleados...</p>
      </div>
    );
  }

  // Redirigir o mostrar mensaje de acceso denegado si el usuario NO es admin
  // Esto se activa solo DESPUÉS de que authLoading sea false (AuthContext ya resolvió el rol)
  if (!authLoading && userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-950 text-white text-xl">
        Acceso Denegado. Por favor, inicia sesión con una cuenta de administrador.
        {/* Opcional: window.location.href = '/login' después de un timeout, si el AuthProvider no redirige automáticamente */}
      </div>
    );
  }

  // Renderizar el contenido normal si el usuario es admin y no está en carga interna
  return (
    <div className="p-6 bg-gray-950 text-white min-h-screen font-inter">
      <h2 className="text-3xl font-extrabold text-indigo-400 text-center mb-8 flex items-center justify-center gap-3">
        <User size={28} /> Gestión de Empleados
      </h2>

      {/* Mensajes de feedback */}
      {error && (
        <div className="bg-red-800 text-red-100 p-4 rounded-lg text-center border border-red-600 mb-6 flex items-center justify-between shadow-md animate-fade-in">
          <AlertCircle size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">{error}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setError(null)} />
        </div>
      )}
      {success && (
        <div className="bg-green-800 text-green-100 p-4 rounded-lg text-center border border-green-600 mb-6 flex items-center justify-between shadow-md animate-fade-in">
          <CheckCircle size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">{success}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setSuccess(null)} />
        </div>
      )}

      {/* Controles de búsqueda, filtro y el nuevo botón Actualizar */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800 mb-8 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="relative w-full md:w-1/2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset page on search
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => {
            setFilterRole(e.target.value);
            setCurrentPage(1); // Reset page on filter change
          }}
          className="w-full md:w-1/4 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
        >
          <option value="">Todos los roles</option>
          {roles.map((rol) => (
            <option key={rol.id_rol} value={rol.id_rol}> {/* Value es el ID del rol */}
              {rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}
            </option>
          ))}
        </select>
        <button
          onClick={fetchEmployees} // Añadido el botón de actualizar manual
          className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold flex items-center justify-center transition shadow-md"
          disabled={componentLoading} // Desactivar si ya está cargando internamente
        >
          <RotateCcw size={20} className={`mr-2 ${componentLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
        <button
          onClick={openAddModal}
          className="w-full md:w-auto px-6 py-2.5 bg-green-700 hover:bg-green-600 rounded-lg text-white font-semibold flex items-center justify-center transition shadow-md"
        >
          <UserPlus size={20} className="mr-2" />
          Agregar Empleado
        </button>
      </div>

      {/* Tabla de empleados */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800">
        {paginatedEmployees.length === 0 && !componentLoading ? (
          <p className="text-gray-400 text-center py-8">No hay empleados que coincidan con la búsqueda o filtro.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="min-w-full table-auto divide-y divide-gray-700 text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><User size={14} /> Nombre</div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><Briefcase size={14} /> Rol</div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-1"><Stethoscope size={14} /> Especialidad</div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-700">
                {paginatedEmployees.map((employee) => (
                  <tr key={employee.id_user} className="hover:bg-gray-800 transition-colors duration-200">
                    <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{employee.nombre}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{employee.email}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{employee.telefono || 'N/A'}</td>
                    <td className="px-4 py-3 capitalize text-blue-400 whitespace-nowrap">{employee.nombre_rol}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{employee.especialidad || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {employee.activo ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle size={12} className="mr-1" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <Ban size={12} className="mr-1" /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(employee)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
                          title="Editar Empleado"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => openDeleteConfirmModal(employee)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-200"
                          title="Eliminar Empleado"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Paginación */}
        {filteredEmployees.length > itemsPerPage && (
          <div className="flex justify-center items-center space-x-2 mt-6">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || componentLoading}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-gray-300">Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || componentLoading}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Modal para Agregar Empleado */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md space-y-6 border border-blue-700 transform scale-100 animate-scale-in">
            <h3 className="text-2xl font-bold text-blue-400 text-center flex items-center justify-center gap-2">
              <UserPlus size={24} /> Agregar Nuevo Empleado
            </h3>
            {error && <p className="bg-red-700 text-red-100 p-3 rounded text-sm mb-4">{error}</p>}
            {success && <p className="bg-green-700 text-green-100 p-3 rounded text-sm mb-4">{success}</p>}
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <input
                name="nombre"
                placeholder="Nombre completo"
                value={formFields.nombre}
                onChange={handleFormChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                required
              />
              <input
                name="email"
                type="email"
                placeholder="Correo electrónico"
                value={formFields.email}
                onChange={handleFormChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                required
              />
              <input
                name="telefono"
                placeholder="Teléfono (opcional)"
                value={formFields.telefono}
                onChange={handleFormChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              <input
                name="password"
                type="password"
                placeholder="Contraseña inicial"
                value={formFields.password}
                onChange={handleFormChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                required
              />
              <select
                name="id_rol"
                value={formFields.id_rol}
                onChange={handleFormChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
                required
              >
                <option value={0}>Selecciona el rol</option>
                {roles.map((rol) => (
                  <option key={rol.id_rol} value={rol.id_rol}>
                    {rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}
                  </option>
                ))}
              </select>
              {roles.find(r => r.id_rol === formFields.id_rol)?.nombre.toLowerCase() === 'veterinario' && (
                <input
                  name="especialidad"
                  placeholder="Especialidad del veterinario"
                  value={formFields.especialidad}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                />
              )}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-md"
                  disabled={componentLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-semibold transition shadow-md flex items-center justify-center"
                  disabled={componentLoading}
                >
                  {componentLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : <UserPlus size={20} className="mr-2" />}
                  {componentLoading ? 'Creando...' : 'Crear Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal para Editar Empleado */}
      {showEditModal && currentEmployee && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md space-y-6 border border-blue-700 transform scale-100 animate-scale-in">
            <h3 className="text-2xl font-bold text-blue-400 text-center flex items-center justify-center gap-2">
              <Edit size={24} /> Editar Empleado
            </h3>
            {error && <p className="bg-red-700 text-red-100 p-3 rounded text-sm mb-4">{error}</p>}
            {success && <p className="bg-green-700 text-green-100 p-3 rounded text-sm mb-4">{success}</p>}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <input
                name="nombre"
                placeholder="Nombre completo"
                value={formFields.nombre}
                onChange={handleFormChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                required
              />
              <input
                name="email"
                type="email"
                placeholder="Correo electrónico"
                value={formFields.email}
                onChange={handleFormChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                required
              />
              <input
                name="telefono"
                placeholder="Teléfono (opcional)"
                value={formFields.telefono}
                onChange={handleFormChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              <select
                name="id_rol"
                value={formFields.id_rol}
                onChange={handleFormChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 transition"
                required
              >
                <option value={0}>Selecciona el rol</option>
                {roles.map((rol) => (
                  <option key={rol.id_rol} value={rol.id_rol}>
                    {rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}
                  </option>
                ))}
              </select>
              {roles.find(r => r.id_rol === formFields.id_rol)?.nombre.toLowerCase() === 'veterinario' && (
                <input
                  name="especialidad"
                  placeholder="Especialidad del veterinario"
                  value={formFields.especialidad}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                />
              )}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activo"
                  name="activo"
                  checked={formFields.activo}
                  onChange={handleFormChange}
                  className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="activo" className="text-gray-300">Usuario Activo</label>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-md"
                  disabled={componentLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-semibold transition shadow-md flex items-center justify-center"
                  disabled={componentLoading}
                >
                  {componentLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Edit size={20} className="mr-2" />}
                  {componentLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Confirmación de Eliminación */}
      {showDeleteConfirmModal && currentEmployee && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md space-y-6 border border-red-700 transform scale-100 animate-scale-in">
            <h3 className="text-2xl font-bold text-red-400 text-center flex items-center justify-center gap-2">
              <Trash2 size={24} /> Confirmar Eliminación
            </h3>
            <p className="text-gray-300 text-center">
              ¿Estás seguro de que quieres eliminar al empleado <span
                className="font-semibold text-white">{currentEmployee.nombre}</span>
              ({currentEmployee.nombre_rol})?
            </p>
            <p className="text-sm text-gray-400 text-center">
              Esta acción eliminará permanentemente al usuario de todos los
              registros del sistema, incluyendo la autenticación.
            </p>
            {error && <p className="bg-red-700 text-red-100 p-3 rounded text-sm mb-4">{error}</p>}
            {success && <p className="bg-green-700 text-green-100 p-3 rounded text-sm mb-4">{success}</p>}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-md"
                disabled={componentLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-6 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg font-semibold transition shadow-md flex items-center justify-center"
                disabled={componentLoading}
              >
                {componentLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Trash2 size={20} className="mr-2" />}
                {componentLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionEmpleadosAdmin;
