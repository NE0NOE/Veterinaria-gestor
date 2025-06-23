import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom'; // Importar useNavigate aquí

// Importar iconos de Lucide React para las estadísticas
import {
  Users, User, Mail, Phone, CalendarDays, Tag, Loader2, AlertCircle, XCircle, Stethoscope, PawPrint, List
} from 'lucide-react'; // Eliminado BriefcaseMedical

// Definición de tipos para los datos que se mostrarán
// 'Rol' es un tipo auxiliar y no se usa directamente en el componente, pero es útil para entender la estructura.
type Rol = {
  id_rol: number;
  nombre: string;
};

type UsuarioBase = {
  id_user: string;
  nombre: string;
  email: string;
  telefono: string | null;
  creado_en: string;
  rol: string; // Rol principal del usuario
};

type VeterinarioInfo = {
  id_veterinario: number;
  especialidad: string | null;
  totalCitasAsignadas: number;
};

type ClienteInfo = {
  id_cliente_db: number; // ID de la tabla 'clientes'
  totalMascotasRegistradas: number;
};

// Tipo combinado para la visualización en la tabla
type UsuarioDisplay = UsuarioBase & {
  veterinarioInfo?: VeterinarioInfo; // Información específica si es veterinario
  clienteInfo?: ClienteInfo;         // Información específica si es cliente
};

const VerUsuarios = () => {
  const navigate = useNavigate(); // Asegurarse de que useNavigate se inicialice aquí
  const [usuarios, setUsuarios] = useState<UsuarioDisplay[]>([]);
  const [filtroRol, setFiltroRol] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioDisplay | null>(null);

  // Función para obtener todos los datos necesarios y consolidarlos
  const fetchAllUserData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Obtener todos los usuarios
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id_user, nombre, email, telefono, creado_en');
      if (usersError) throw usersError;

      // 2. Obtener roles de usuario
      // Se ajusta la selección para obtener el nombre del rol a través de la relación.
      // Supabase suele devolver la relación como un array si no es estrictamente single.
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select(`
          id_user,
          roles (nombre)
        `);
      if (userRolesError) throw userRolesError;

      const rolesMap = new Map<string, string>(); // Map<id_user, role_name>
      userRolesData?.forEach((ur: { id_user: string; roles: { nombre: string }[] | { nombre: string } | null }) => {
        // Acceder al nombre del rol de forma segura, asumiendo que 'roles' puede ser un array o un objeto
        let roleName: string | null = null;
        if (Array.isArray(ur.roles) && ur.roles.length > 0) {
          roleName = ur.roles[0].nombre; // Si es un array, toma el primer elemento
        } else if (ur.roles && typeof ur.roles === 'object' && 'nombre' in ur.roles) {
          roleName = (ur.roles as { nombre: string }).nombre; // Si es un objeto directamente
        }
        rolesMap.set(ur.id_user, roleName || 'Sin rol');
      });

      // 3. Obtener información de veterinarios
      const { data: veterinariosData, error: veterinariosError } = await supabase
        .from('veterinarios')
        .select('id_veterinario, id_user, especialidad');
      if (veterinariosError) throw veterinariosError;
      const veterinariosMap = new Map<string, Pick<VeterinarioInfo, 'id_veterinario' | 'especialidad'>>(); // Map<id_user, {id_vet, specialty}>
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
      const clientesMap = new Map<string, Pick<ClienteInfo, 'id_cliente_db'>>(); // Map<id_user, {id_client_db}>
      clientesData?.forEach(c => {
        if (c.id_user) {
          clientesMap.set(c.id_user, { id_cliente_db: c.id_cliente });
        }
      });

      // 5. Contar citas por veterinario
      const { data: citasData, error: citasError } = await supabase
        .from('citas')
        .select('id_veterinario');
      if (citasError) throw citasError;

      const citasPorVeterinario = new Map<number, number>(); // Map<id_veterinario, count>
      citasData?.forEach(cita => {
        if (cita.id_veterinario) {
          citasPorVeterinario.set(cita.id_veterinario, (citasPorVeterinario.get(cita.id_veterinario) || 0) + 1);
        }
      });

      // 6. Contar mascotas por cliente
      const { data: mascotasData, error: mascotasError } = await supabase
        .from('mascotas')
        .select('id_cliente');
      if (mascotasError) throw mascotasError;

      const mascotasPorCliente = new Map<number, number>(); // Map<id_cliente_db, count>
      mascotasData?.forEach(mascota => { // Corregido 'mascotas' a 'mascota'
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

    } catch (err: any) {
      console.error('Error al cargar usuarios:', err.message);
      setError('Error al cargar la lista de usuarios: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllUserData();

    // Suscripciones en tiempo real
    const usersChannel = supabase
      .channel('users_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchAllUserData())
      .subscribe();

    const userRolesChannel = supabase
      .channel('user_roles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => fetchAllUserData())
      .subscribe();
    
    const rolesChannel = supabase
      .channel('roles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, () => fetchAllUserData())
      .subscribe();

    const veterinariosChannel = supabase
      .channel('veterinarios_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'veterinarios' }, () => fetchAllUserData())
      .subscribe();
    
    const clientesChannel = supabase
      .channel('clientes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => fetchAllUserData())
      .subscribe();
    
    const citasChannel = supabase
      .channel('citas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, () => fetchAllUserData())
      .subscribe();

    const mascotasChannel = supabase
      .channel('mascotas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mascotas' }, () => fetchAllUserData())
      .subscribe();


    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(userRolesChannel);
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(veterinariosChannel);
      supabase.removeChannel(clientesChannel);
      supabase.removeChannel(citasChannel);
      supabase.removeChannel(mascotasChannel);
      console.log('Unsubscribed from all user-related channels.');
    };
  }, [fetchAllUserData]); // Dependencia del callback para la limpieza

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-950 text-white">
        <Loader2 className="animate-spin mr-3 text-blue-400" size={36} />
        <p className="text-xl text-blue-400">Cargando usuarios y roles...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-950 text-white min-h-screen font-inter">
      <h2 className="text-3xl font-extrabold text-blue-400 mb-8 flex items-center gap-3">
        <Users size={28} /> Gestión de Usuarios del Sistema
      </h2>

      {/* Mensajes de feedback */}
      {error && (
        <div className="bg-red-800 text-red-100 p-4 rounded-lg text-center border border-red-600 mb-6 flex items-center justify-between shadow-md animate-fade-in">
          <AlertCircle size={24} className="flex-shrink-0 mr-3" />
          <span className="flex-grow">{error}</span>
          <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setError(null)} />
        </div>
      )}

      {/* Filtro por Rol */}
      <div className="mb-6 flex items-center gap-4 bg-gray-900 p-4 rounded-lg shadow-lg border border-blue-800">
        <label htmlFor="filtroRol" className="text-lg font-medium text-gray-300">Filtrar por Rol:</label>
        <select
          id="filtroRol"
          className="bg-gray-800 text-white border border-gray-600 px-4 py-2 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="admin">Administradores</option>
          <option value="veterinario">Veterinarios</option>
          <option value="asistente">Asistentes</option>
          <option value="cliente">Clientes</option>
        </select>
        <button
          onClick={() => navigate('/admin-dashboard/agregar-usuario')}
          className="ml-auto px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition shadow-md flex items-center gap-2"
          title="Agregar Nuevo Usuario"
        >
          <User size={20} /> Agregar Usuario
        </button>
      </div>

      {/* TABLA DE USUARIOS */}
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
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => openUserDetailsModal(user)}
                        className="text-indigo-400 hover:text-indigo-600 p-2 rounded-md transition-colors"
                        title="Ver Detalles"
                      >
                        <List size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalles del Usuario */}
      {showUserDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg space-y-6 border border-blue-700 transform scale-100 animate-scale-in">
            <h3 className="text-2xl font-bold text-blue-400 text-center flex items-center justify-center gap-2">
              <User size={24} /> Detalles de {selectedUser.nombre}
            </h3>
            <div className="text-gray-300 space-y-3">
              <p><span className="font-semibold text-white">Email:</span> {selectedUser.email}</p>
              <p><span className="font-semibold text-white">Teléfono:</span> {selectedUser.telefono || 'N/A'}</p>
              <p><span className="font-semibold text-white">Rol:</span> <span className="capitalize">{selectedUser.rol}</span></p>
              <p><span className="font-semibold text-white">Fecha de Creación:</span> {new Date(selectedUser.creado_en).toLocaleDateString('es-ES')}</p>

              {selectedUser.rol.toLowerCase() === 'veterinario' && selectedUser.veterinarioInfo && (
                <div className="bg-gray-700 p-4 rounded-md border border-gray-600 mt-4 space-y-2">
                  <h4 className="text-lg font-bold text-indigo-300 flex items-center gap-2"><Stethoscope size={18} /> Información de Veterinario:</h4>
                  <p><span className="font-semibold text-white">ID Veterinario:</span> {selectedUser.veterinarioInfo.id_veterinario}</p>
                  <p><span className="font-semibold text-white">Especialidad:</span> {selectedUser.veterinarioInfo.especialidad || 'No especificado'}</p>
                  <p><span className="font-semibold text-white">Citas Asignadas:</span> {selectedUser.veterinarioInfo.totalCitasAsignadas}</p>
                </div>
              )}

              {selectedUser.rol.toLowerCase() === 'cliente' && selectedUser.clienteInfo && (
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
    </div>
  );
};

export default VerUsuarios;
