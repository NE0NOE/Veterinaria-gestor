import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  User, UserPlus, Edit, Trash2, Loader2, AlertCircle, CheckCircle, XCircle,
  Briefcase, Stethoscope, Search, ChevronLeft, ChevronRight, Ban, Eye
} from 'lucide-react';

// --- Definiciones de Tipos ---

// Tipo para un usuario en la tabla 'public.users'
interface UserDB {
  id_user: string;
  nombre: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  creado_en: string; // ISO string
}

// Tipo para un rol en la tabla 'public.roles'
interface Role {
  id_rol: number;
  nombre: string;
}

// Tipo para la tabla pivote 'public.user_roles'
interface UserRole {
  id_user: string;
  id_rol: number;
}

// Tipo para un veterinario en la tabla 'public.veterinarios'
interface Veterinario {
  id_veterinario: number; // PK de la tabla veterinarios, no es el id_user
  id_user: string; // FK al id_user de auth.users y public.users
  nombre: string;
  especialidad: string | null;
  telefono: string | null;
  email: string | null;
}

// Tipo combinado para mostrar en la tabla de empleados
interface Employee extends UserDB {
  id_rol: number;
  nombre_rol: string;
  especialidad?: string | null; // Opcional, solo para veterinarios
}

const GestionEmpleadosAdmin: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
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
    id_rol: '',
    especialidad: '', // Solo para veterinarios
    activo: true, // Solo para edición
  });

  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  // Estados para búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /**
   * Muestra un mensaje de éxito que desaparece después de un tiempo.
   * @param message El mensaje de éxito a mostrar.
   */
  const showSuccess = useCallback((message: string) => {
    setSuccess(message);
    setError(null);
    setTimeout(() => setSuccess(null), 5000);
  }, []);

  /**
   * Muestra un mensaje de error que desaparece después de un tiempo.
   * @param message El mensaje de error a mostrar.
   */
  const showError = useCallback((message: string) => {
    setError(message);
    setSuccess(null);
    setTimeout(() => setError(null), 8000);
  }, []);

  /**
   * Limpia los mensajes de éxito y error.
   */
  const clearMessages = useCallback(() => {
    setSuccess(null);
    setError(null);
  }, []);

  /**
   * Carga los roles disponibles desde la base de datos, excluyendo 'cliente'.
   */
  const fetchRoles = useCallback(async () => {
    const { data, error: rolesError } = await supabase
      .from('roles')
      .select('id_rol, nombre')
      .neq('nombre', 'cliente'); // Excluir el rol 'cliente'

    if (rolesError) {
      console.error('Error fetching roles:', rolesError.message);
      showError('Error al cargar los roles disponibles.');
    } else {
      setRoles(data || []);
    }
  }, [showError]);

  /**
   * Carga la lista de empleados (usuarios con rol que no sea 'cliente')
   * combinando datos de auth.users, public.users, public.user_roles y public.veterinarios.
   */
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    clearMessages();
    try {
      // 1. Obtener los roles de empleados (admin, asistente, veterinario)
      const { data: employeeRolesData, error: rolesError } = await supabase
        .from('roles')
        .select('id_rol, nombre')
        .in('nombre', ['administrador', 'asistente', 'veterinario']); // Filtrar solo roles de empleados

      if (rolesError) throw rolesError;
      const employeeRoleIds = employeeRolesData.map(role => role.id_rol);
      const roleMap = new Map(employeeRolesData.map(role => [role.id_rol, role.nombre]));

      // 2. Obtener usuarios de public.users que tienen uno de estos roles
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select('id_user, id_rol')
        .in('id_rol', employeeRoleIds); // Filtrar por los IDs de roles de empleado

      if (userRolesError) throw userRolesError;
      const employeeUserIds = userRolesData.map(ur => ur.id_user);
      const userRoleMap = new Map(userRolesData.map(ur => [ur.id_user, ur.id_rol]));

      // 3. Obtener los detalles de esos usuarios de public.users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id_user', employeeUserIds); // Filtrar por los IDs de usuario con rol de empleado

      if (usersError) throw usersError;

      // 4. Obtener los detalles de veterinarios si aplica
      const { data: vetsData, error: vetsError } = await supabase
        .from('veterinarios')
        .select('id_user, especialidad');

      if (vetsError) throw vetsError;
      const vetMap = new Map(vetsData.map(vet => [vet.id_user, vet.especialidad]));

      // 5. Combinar todos los datos
      const combinedEmployees: Employee[] = usersData.map(user => {
        const id_rol = userRoleMap.get(user.id_user) || 0; // Fallback a 0 si no se encuentra (debería existir)
        const nombre_rol = roleMap.get(id_rol) || 'Desconocido';
        const especialidad = (nombre_rol === 'veterinario') ? vetMap.get(user.id_user) : null;

        return {
          ...user,
          id_rol,
          nombre_rol,
          especialidad,
        };
      });

      setEmployees(combinedEmployees);

    } catch (err: any) {
      console.error('Error fetching employees:', err.message);
      showError('Error al cargar la lista de empleados: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [showError, clearMessages]);

  useEffect(() => {
    fetchRoles();
    fetchEmployees();

    // Configurar suscripciones en tiempo real
    const usersChannel = supabase
      .channel('public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        console.log('Realtime change in public.users');
        fetchEmployees();
      })
      .subscribe();

    const userRolesChannel = supabase
      .channel('public:user_roles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        console.log('Realtime change in public.user_roles');
        fetchEmployees();
      })
      .subscribe();

    const veterinariosChannel = supabase
      .channel('public:veterinarios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'veterinarios' }, () => {
        console.log('Realtime change in public.veterinarios');
        fetchEmployees();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(userRolesChannel);
      supabase.removeChannel(veterinariosChannel);
      console.log('Unsubscribed from employee management channels.');
    };
  }, [fetchRoles, fetchEmployees]); // Dependencias para re-suscribirse si cambian las funciones

  /**
   * Maneja los cambios en los campos del formulario.
   */
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormFields((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormFields((prev) => ({ ...prev, [name]: value }));
    }
    // Actualizar especialidad si el rol cambia a/de veterinario
    if (name === 'id_rol') {
      const selectedRole = roles.find(r => r.id_rol.toString() === value);
      if (selectedRole?.nombre.toLowerCase() !== 'veterinario') {
        setFormFields((prev) => ({ ...prev, especialidad: '' }));
      }
    }
  };

  /**
   * Abre el modal de agregar usuario y resetea el formulario.
   */
  const openAddModal = () => {
    setFormFields({
      id_user: '',
      nombre: '',
      email: '',
      telefono: '',
      password: '',
      id_rol: '',
      especialidad: '',
      activo: true,
    });
    clearMessages();
    setShowAddModal(true);
  };

  /**
   * Abre el modal de edición con los datos del empleado seleccionado.
   * @param employee El empleado a editar.
   */
  const openEditModal = (employee: Employee) => {
    setCurrentEmployee(employee);
    setFormFields({
      id_user: employee.id_user,
      nombre: employee.nombre,
      email: employee.email,
      telefono: employee.telefono || '',
      password: '', // La contraseña no se edita directamente así, solo se puede resetear
      id_rol: employee.id_rol.toString(),
      especialidad: employee.especialidad || '',
      activo: employee.activo,
    });
    clearMessages();
    setShowEditModal(true);
  };

  /**
   * Abre el modal de confirmación de eliminación.
   * @param employee El empleado a eliminar.
   */
  const openDeleteConfirmModal = (employee: Employee) => {
    setCurrentEmployee(employee);
    clearMessages();
    setShowDeleteConfirmModal(true);
  };

  /**
   * Maneja el envío del formulario para agregar un nuevo empleado.
   */
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    const { nombre, email, telefono, password, id_rol, especialidad } = formFields;

    if (!nombre || !email || !password || !id_rol) {
      showError('Por favor, rellena todos los campos obligatorios: Nombre, Email, Contraseña y Rol.');
      setLoading(false);
      return;
    }

    const selectedRoleName = roles.find(r => r.id_rol.toString() === id_rol)?.nombre.toLowerCase();
    if (selectedRoleName === 'veterinario' && !especialidad) {
      showError('Si el rol es veterinario, la especialidad es obligatoria.');
      setLoading(false);
      return;
    }

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: signupError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Opcional: true para confirmar automáticamente el email para empleados
        user_metadata: {
          nombre: nombre,
          telefono: telefono,
          rol_id: id_rol,
          rol_nombre: selectedRoleName
        }
      });

      if (signupError || !authData?.user) {
        throw new Error(signupError?.message || 'Error al crear usuario en autenticación.');
      }

      const userId = authData.user.id;

      // 2. Insertar en public.users
      const { error: userInsertError } = await supabase
        .from('users')
        .insert({
          id_user: userId,
          nombre: nombre,
          email: email,
          telefono: telefono || null,
          activo: true, // Por defecto activo
          creado_en: new Date().toISOString(),
        });

      if (userInsertError) {
        // Si falla la inserción en public.users, intentar revertir el usuario de auth
        await supabase.auth.admin.deleteUser(userId);
        throw new Error(userInsertError.message || 'Error al guardar detalles del usuario. Usuario de auth revertido.');
      }

      // 3. Insertar en public.user_roles
      const { error: userRoleInsertError } = await supabase
        .from('user_roles')
        .insert({
          id_user: userId,
          id_rol: parseInt(id_rol),
        });

      if (userRoleInsertError) {
        // Aquí la reversión es más compleja, idealmente usar transacciones si Supabase las soporta nativamente o una función Edge
        console.error('Error al asignar rol, limpiando datos parciales...');
        await supabase.from('users').delete().eq('id_user', userId); // Limpiar de public.users
        await supabase.auth.admin.deleteUser(userId); // Limpiar de auth.users
        throw new Error(userRoleInsertError.message || 'Error al asignar el rol. Datos parciales revertidos.');
      }

      // 4. Si el rol es veterinario, insertar en public.veterinarios
      if (selectedRoleName === 'veterinario') {
        const { error: vetInsertError } = await supabase
          .from('veterinarios')
          .insert({
            id_user: userId,
            nombre: nombre,
            especialidad: especialidad,
            telefono: telefono || null,
            email: email,
          });

        if (vetInsertError) {
          // Si falla aquí, los datos en users y user_roles ya están, esto requeriría un manejo específico
          console.warn('Advertencia: Error al insertar en veterinarios. El usuario se creó y se le asignó un rol, pero falta el detalle de veterinario.');
          showError('Empleado creado, pero hubo un error al añadir los detalles de veterinario: ' + vetInsertError.message);
          setLoading(false); // No salimos del todo, es un error parcial
          return; // Retornamos aquí para evitar el success message general.
        }
      }

      showSuccess('Empleado agregado exitosamente.');
      setShowAddModal(false);
      fetchEmployees(); // Recargar la lista
    } catch (err: any) {
      console.error('Error adding employee:', err.message);
      showError('No se pudo agregar al empleado: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el envío del formulario para editar un empleado existente.
   */
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    const { id_user, nombre, email, telefono, id_rol, especialidad, activo } = formFields;
    if (!currentEmployee) {
      showError('No hay empleado seleccionado para editar.');
      setLoading(false);
      return;
    }

    const selectedRoleName = roles.find(r => r.id_rol.toString() === id_rol)?.nombre.toLowerCase();
    if (selectedRoleName === 'veterinario' && !especialidad) {
      showError('Si el rol es veterinario, la especialidad es obligatoria.');
      setLoading(false);
      return;
    }

    try {
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
      if (parseInt(id_rol) !== currentEmployee.id_rol) {
        const { error: userRoleUpdateError } = await supabase
          .from('user_roles')
          .update({ id_rol: parseInt(id_rol) })
          .eq('id_user', id_user);
        if (userRoleUpdateError) throw userRoleUpdateError;
      }

      // 3. Gestionar tabla public.veterinarios
      if (selectedRoleName === 'veterinario') {
        // Insertar o actualizar en veterinarios
        const { data: existingVet, error: fetchVetError } = await supabase
          .from('veterinarios')
          .select('id_veterinario')
          .eq('id_user', id_user)
          .single();

        if (fetchVetError && fetchVetError.code !== 'PGRST116') { // PGRST116 means "no rows found"
            throw fetchVetError;
        }

        if (existingVet) {
          // Actualizar veterinario existente
          const { error: vetUpdateError } = await supabase
            .from('veterinarios')
            .update({ nombre: nombre, especialidad: especialidad, telefono: telefono || null, email: email })
            .eq('id_user', id_user);
          if (vetUpdateError) throw vetUpdateError;
        } else {
          // Insertar nuevo veterinario
          const { error: vetInsertError } = await supabase
            .from('veterinarios')
            .insert({ id_user: id_user, nombre: nombre, especialidad: especialidad, telefono: telefono || null, email: email });
          if (vetInsertError) throw vetInsertError;
        }
      } else if (currentEmployee.nombre_rol.toLowerCase() === 'veterinario') {
        // Si el rol anterior era veterinario y ahora no lo es, eliminar de la tabla veterinarios
        const { error: vetDeleteError } = await supabase
          .from('veterinarios')
          .delete()
          .eq('id_user', id_user);
        if (vetDeleteError) throw vetDeleteError;
      }
      
      // 4. Actualizar email en Supabase Auth si cambió
      if (email !== currentEmployee.email) {
        const { error: authUpdateError } = await supabase.auth.admin.updateUserById(id_user, { email: email });
        if (authUpdateError) {
          console.warn('Advertencia: Email actualizado en public.users pero no en auth.users:', authUpdateError.message);
          showError('Empleado actualizado, pero no se pudo actualizar el email de autenticación: ' + authUpdateError.message);
        }
      }

      showSuccess('Empleado actualizado exitosamente.');
      setShowEditModal(false);
      fetchEmployees(); // Recargar la lista
    } catch (err: any) {
      console.error('Error updating employee:', err.message);
      showError('No se pudo actualizar al empleado: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja la eliminación de un empleado.
   */
  const handleDeleteConfirm = async () => {
    if (!currentEmployee) return;
    clearMessages();
    setLoading(true);

    try {
      const userId = currentEmployee.id_user;

      // 1. Eliminar de tablas relacionadas que tienen FK a id_user
      // (asumiendo que id_user es la FK y no la PK en estas tablas)
      // OJO: Si hay FKs en cascada en la BD, algunas de estas eliminaciones pueden ser automáticas.
      // Es buena práctica eliminarlas explícitamente si no hay cascada o si se quiere controlar el orden.
      // Revisar el schema:
      // public.clientes.id_user -> uuid
      // public.veterinarios.id_user -> uuid
      // public.user_roles.id_user -> uuid

      // Eliminar de public.user_roles (necesario antes de users, si no hay cascade)
      const { error: userRoleDeleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('id_user', userId);
      if (userRoleDeleteError) throw userRoleDeleteError;

      // Eliminar de public.veterinarios si existe (si el rol era veterinario)
      if (currentEmployee.nombre_rol.toLowerCase() === 'veterinario') {
        const { error: vetDeleteError } = await supabase
          .from('veterinarios')
          .delete()
          .eq('id_user', userId);
        if (vetDeleteError) throw vetDeleteError;
      }
      
      // Eliminar de public.users
      const { error: userDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id_user', userId);
      if (userDeleteError) throw userDeleteError;

      // 4. Eliminar de auth.users (¡esta es la más importante para Supabase Auth!)
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        // Considerar aquí qué hacer si la eliminación de Auth falla pero las tablas públicas ya se eliminaron.
        // Puede requerir intervención manual en Auth Dashboard.
        console.error('Error al eliminar usuario de Supabase Auth:', authDeleteError.message);
        throw new Error('Error al eliminar el usuario de autenticación. Es posible que deba eliminarse manualmente en el panel de Supabase.');
      }

      showSuccess('Empleado eliminado exitosamente.');
      setShowDeleteConfirmModal(false);
      setCurrentEmployee(null);
      fetchEmployees(); // Recargar la lista
    } catch (err: any) {
      console.error('Error deleting employee:', err.message);
      showError('No se pudo eliminar al empleado: ' + err.message);
    } finally {
      setLoading(false);
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
        employee.id_rol.toString() === filterRole;

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

  if (loading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-950 text-white font-inter">
        <Loader2 className="animate-spin mr-3 text-blue-400" size={36} />
        <p className="text-xl text-blue-400">Cargando gestión de empleados...</p>
      </div>
    );
  }

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

      {/* Controles de búsqueda y filtro */}
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
            <option key={rol.id_rol} value={rol.id_rol}>
              {rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}
            </option>
          ))}
        </select>
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
        {paginatedEmployees.length === 0 && !loading ? (
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
              disabled={currentPage === 1 || loading}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-gray-300">Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
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
                <option value="">Selecciona el rol</option>
                {roles.map((rol) => (
                  <option key={rol.id_rol} value={rol.id_rol}>
                    {rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}
                  </option>
                ))}
              </select>
              {roles.find(r => r.id_rol.toString() === formFields.id_rol)?.nombre.toLowerCase() === 'veterinario' && (
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
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-semibold transition shadow-md flex items-center justify-center"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <UserPlus size={20} className="mr-2" />}
                  {loading ? 'Creando...' : 'Crear Empleado'}
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
                <option value="">Selecciona el rol</option>
                {roles.map((rol) => (
                  <option key={rol.id_rol} value={rol.id_rol}>
                    {rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}
                  </option>
                ))}
              </select>
              {roles.find(r => r.id_rol.toString() === formFields.id_rol)?.nombre.toLowerCase() === 'veterinario' && (
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
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-semibold transition shadow-md flex items-center justify-center"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Edit size={20} className="mr-2" />}
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
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
              ¿Estás seguro de que quieres eliminar al empleado <span className="font-semibold text-white">{currentEmployee.nombre}</span> ({currentEmployee.nombre_rol})?
            </p>
            <p className="text-sm text-gray-400 text-center">
              Esta acción eliminará permanentemente al usuario de todos los registros del sistema, incluyendo la autenticación.
            </p>
            {error && <p className="bg-red-700 text-red-100 p-3 rounded text-sm mb-4">{error}</p>}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition shadow-md"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-6 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg font-semibold transition shadow-md flex items-center justify-center"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Trash2 size={20} className="mr-2" />}
                {loading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionEmpleadosAdmin;
