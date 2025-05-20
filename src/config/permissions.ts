import { RolePermissions, UserRole } from '../types';

export const rolePermissions: RolePermissions = {
  owner: [
    'dashboard',
    'appointments',
    'patients',
    'medical-history',
    'inventory',
    'users',
    'purchases',
    'pets',
    'admin' // 👈 AGREGÁ ESTA LÍNEA
  ],
  veterinarian: ['dashboard', 'appointments', 'patients', 'medical-history', 'inventory', 'pets'],
  employee: ['appointments', 'inventory', 'purchases'],
  client: ['appointments', 'pets']
};

export const hasPermission = (role: UserRole, permission: string): boolean => {
  if (!role) return false;
  return rolePermissions[role]?.includes(permission as any) ?? false;
};
