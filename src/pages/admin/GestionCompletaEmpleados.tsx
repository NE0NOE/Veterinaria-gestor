import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient.ts';
import { useNavigate } from 'react-router-dom';
import {
    Users, User, Loader2, Briefcase, Stethoscope, CheckCircle, Ban,
    XCircle, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; // Tu AuthContext existente

//--- Definiciones de Tipos
interface Rol {
    id_rol: number;
    nombre: string;
}

// Tipo de usuario que se obtiene de la base de datos (con join a user_roles y roles)
type UserDBRaw = {
    id_user: string;
    nombre: string;
    email: string;
    telefono: string | null;
    activo: boolean;
    creado_en: string;
    user_roles: { id_rol: number; roles: { nombre: string } | null } | Array<{
        id_rol: number; roles: { nombre: string } | null
    }>;
};

// Tipo de información de veterinario
type VeterinarioDB = {
    id_user: string;
    especialidad: string | null;
};

// Tipo que usamos para mostrar en la tabla (consolidado)
interface UsuarioDisplay {
    id_user: string;
    nombre: string;
    email: string;
    telefono: string | null;
    activo: boolean;
    creado_en: string;
    rol: string; // Nombre del rol
    id_rol: number; // ID del rol
    especialidad?: string | null; // Solo para veterinarios
}

const GestionCompletaEmpleados: React.FC = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth(); // Usamos 'user' (que contiene el rol si está autenticado) y 'loading' de tu AuthContext

    const [usuarios, setUsuarios] = useState<UsuarioDisplay[]>([]);
    const [roles, setRoles] = useState<Rol[]>([]); // Lista de roles para el select
    const [isComponentLoading, setIsComponentLoading] = useState(true); // Controla la carga de la tabla principal (data fetching)
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // Función para mostrar mensajes de feedback
    const showFeedbackMessage = useCallback((type: 'success' | 'error', msg: string) => {
        if (type === 'success') {
            setMessage(msg);
            setError(null);
        } else {
            setError(msg);
            setMessage(null);
        }
        setTimeout(() => {
            setMessage(null);
            setError(null);
        }, 5000); // Los mensajes desaparecen después de 5 segundos
    }, []);

    // Carga todos los roles disponibles de la tabla 'roles'
    const fetchRoles = useCallback(async () => {
        try {
            const { data, error: rolesError } = await supabase.from('roles').select('id_rol, nombre');
            if (rolesError) throw rolesError;
            setRoles(data || []);
            console.log("Roles cargados:", data);
        } catch (err: any) {
            console.error('Error fetching roles:', err.message);
        }
    }, []);

    // Carga todos los datos de usuarios (empleados) incluyendo su rol y especialidad
    const fetchAllUsersData = useCallback(async () => {
        setIsComponentLoading(true); // Activar el loader del componente para la carga de datos
        setError(null); // Limpiar errores previos
        setMessage(null); // Limpiar mensajes previos
        try {
            // 1. Obtener usuarios y sus roles
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select(
                    `
                    id_user,
                    nombre,
                    email,
                    telefono,
                    activo,
                    creado_en,
                    user_roles(id_rol, roles (nombre))
                    `
                ) as { data: UserDBRaw[] | null; error: any };

            if (usersError) throw usersError;

            // 2. Obtener información adicional para veterinarios
            const { data: veterinariosData, error: vetsError } = await supabase
                .from('veterinarios')
                .select('id_user, especialidad') as { data: VeterinarioDB[] | null; error: any };

            if (vetsError) console.warn('Error fetching veterinarians data:', vetsError.message);

            const veterinariosMap = new Map<string, string | null>();
            veterinariosData?.forEach(v => {
                if (v.id_user) {
                    veterinariosMap.set(v.id_user, v.especialidad);
                }
            });

            // 3. Consolidar datos
            const consolidatedUsers: UsuarioDisplay[] = (usersData || [])
                .map(userItem => {
                    const userRoleEntry = Array.isArray(userItem.user_roles) ?
                        userItem.user_roles[0] : userItem.user_roles;
                    const roleName = userRoleEntry?.roles?.nombre || 'Sin rol';
                    const roleId = userRoleEntry?.id_rol || 0;

                    const displayUser: UsuarioDisplay = {
                        id_user: userItem.id_user,
                        nombre: userItem.nombre,
                        email: userItem.email,
                        telefono: userItem.telefono,
                        activo: userItem.activo,
                        creado_en: userItem.creado_en,
                        rol: roleName,
                        id_rol: roleId,
                        especialidad: null,
                    };

                    if (roleName.toLowerCase() === 'veterinario') {
                        displayUser.especialidad = veterinariosMap.get(userItem.id_user) || 'N/A';
                    }
                    return displayUser;
                })
                .filter(u => ['admin', 'asistente', 'veterinario'].includes(u.rol.toLowerCase())); // Filtrar por roles de empleados

            setUsuarios(consolidatedUsers);
            showFeedbackMessage('success', 'Lista de empleados actualizada.');
        } catch (err: any) {
            console.error('Failed to fetch all users data:', err.message);
            showFeedbackMessage('error', 'No se pudo cargar la lista de empleados: ' + err.message);
        } finally {
            setIsComponentLoading(false); // Desactiva el loader del componente al finalizar
        }
    }, [showFeedbackMessage]);

    // Efecto para la carga inicial de datos.
    useEffect(() => {
        console.log("GestionCompletaEmpleados useEffect Estado de Auth:", { authLoading, user });
        // Si AuthContext terminó de cargar (authLoading es false) Y tenemos un objeto 'user'
        // Y el rol del usuario es 'admin', entonces procedemos a cargar los datos de la tabla.
        if (!authLoading && user && user.role === 'admin') {
            fetchRoles();
            fetchAllUsersData();
        } else if (!authLoading && user && user.role !== 'admin') {
            // Si el AuthContext terminó de cargar y el usuario NO es admin,
            // no hay datos para cargar en esta sección y el componente no debe mostrar loader por sí mismo.
            setIsComponentLoading(false);
            // El ProtectedRoute se encargará de redirigir o mostrar "Acceso Denegado".
        } else if (!authLoading && !user) {
            // Si AuthContext terminó de cargar y NO hay usuario logueado (user es null),
            // este componente no tiene nada que cargar y debe deshabilitar su loader.
            setIsComponentLoading(false);
            // ProtectedRoute manejará la redirección a login.
        }
        // Si authLoading es true, el componente se mantendrá en su estado de carga principal.
    }, [authLoading, user, fetchRoles, fetchAllUsersData]);

    // Lógica de Búsqueda y Paginación (ahora solo para visualización, sin controles de input)
    const filteredAndSearchedEmployees = useMemo(() => {
        return usuarios.filter(employee => {
            // Dado que no hay searchTerm ni filterRole inputs, siempre se muestra todo
            return true;
        });
    }, [usuarios]);

    // Paginación (mantener la paginación para visualizar subsets grandes de datos, pero sin controles de navegación explícitos)
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredAndSearchedEmployees.length / itemsPerPage);
    const [currentPage, setCurrentPage] = useState(1); // Mantener el estado de la página para la visualización inicial

    const paginatedEmployees = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredAndSearchedEmployees.slice(startIndex, endIndex);
    }, [filteredAndSearchedEmployees, currentPage, itemsPerPage]);

    // Renderizado principal (Loaders y Acceso Denegado)
    if (authLoading || (!user || user.role !== 'admin') || isComponentLoading) {
        if (authLoading || isComponentLoading) { // Loader mientras AuthContext o el componente carga datos
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white font-inter">
                    <Loader2 className="animate-spin mr-3 text-blue-400" size={36} />
                    <p className="text-xl text-blue-400">Cargando gestión de empleados...</p>
                </div>
            );
        } else if (!user || user.role !== 'admin') { // Acceso Denegado si no es admin después de cargar
            return (
                <div className="flex items-center justify-center min-h-[60vh] bg-gray-950 text-white text-xl">
                    Acceso Denegado. No tienes permisos de administrador para ver esta sección.
                </div>
            );
        }
    }

    // Renderizado del Contenido de Gestión de Empleados (Tabla Completa para Visualización)
    return (
        <div className="p-6 bg-gray-950 text-white min-h-screen font-inter">
            <h2 className="text-3xl font-extrabold text-blue-400 text-center mb-8 flex items-center justify-center gap-3">
                <Users size={28} /> Visualización de Empleados
            </h2>

            {/* Mensajes de Feedback (éxito/error) - Aunque no hay acciones, podrían venir de la carga inicial */}
            {error && (
                <div className="bg-red-800 text-red-100 p-4 rounded-lg text-center border border-red-600 mb-6 flex items-center justify-between shadow-md animate-fade-in">
                    <AlertCircle size={24} className="flex-shrink-0 mr-3" />
                    <span className="flex-grow">{error}</span>
                    <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setError(null)} />
                </div>
            )}
            {message && (
                <div className="bg-green-800 text-green-100 p-4 rounded-lg text-center border border-green-600 mb-6 flex items-center justify-between shadow-md animate-fade-in">
                    <CheckCircle size={24} className="flex-shrink-0 mr-3" />
                    <span className="flex-grow">{message}</span>
                    <XCircle size={20} className="cursor-pointer ml-3" onClick={() => setMessage(null)} />
                </div>
            )}

            {/* No hay controles de búsqueda, filtrado ni botones de acción */}
            <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800">
                {paginatedEmployees.length === 0 && !isComponentLoading ? (
                    <p className="text-gray-400 text-center py-8">No hay empleados para mostrar.</p>
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
                                    {/* No hay columna de Acciones */}
                                </tr>
                            </thead>
                            <tbody className="bg-gray-900 divide-y divide-gray-700">
                                {paginatedEmployees.map((employee) => (
                                    <tr key={employee.id_user} className="hover:bg-gray-800 transition-colors duration-200">
                                        <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{employee.nombre}</td>
                                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{employee.email}</td>
                                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{employee.telefono || 'N/A'}</td>
                                        <td className="px-4 py-3 capitalize text-blue-400 whitespace-nowrap">{employee.rol}</td>
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
                                        {/* No hay celda de Acciones */}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Paginación - Se mantienen los indicadores pero se remueven los botones de control */}
                {filteredAndSearchedEmployees.length > itemsPerPage && (
                    <div className="flex justify-center items-center space-x-2 mt-6">
                        {/* Removidos los botones de paginación para "solo visualización" */}
                        <span className="text-gray-300">Página {currentPage} de {totalPages}</span>
                        {/* Removidos los botones de paginación para "solo visualización" */}
                    </div>
                )}
            </div>

            {/* Modales de Agregar/Editar y Confirmación de Eliminación han sido eliminados */}
        </div>
    );
};

export default GestionCompletaEmpleados;
