// src/config/permissions.ts

// Define los tipos de permisos que tu aplicación manejará.
// En este caso, los permisos corresponden directamente a los roles.
export type Permission = 'cliente' | 'admin' | 'veterinario' | 'asistente' | 'public';

/**
 * Verifica si un rol de usuario tiene un permiso específico.
 * En una implementación más compleja, podrías tener un mapeo de roles a múltiples permisos.
 * Por ahora, asumimos que el 'requiredPermission' es el nombre del rol en sí.
 *
 * @param userRole El rol del usuario autenticado (puede ser null si no está autenticado).
 * @param requiredPermission El permiso requerido para acceder a una ruta/funcionalidad.
 * @returns true si el usuario tiene el permiso, false en caso contrario.
 */
export const hasPermission = (userRole: string | null, requiredPermission: Permission): boolean => {
  // Si no hay rol de usuario (no autenticado), solo se permite si el permiso requerido es 'public'.
  if (!userRole) {
    return requiredPermission === 'public';
  }

  // Para este sistema simple, el permiso requerido es el rol mismo.
  // Ejemplo: si requiredPermission es 'admin', solo un usuario con role 'admin' tendrá acceso.
  return userRole === requiredPermission;
};
  