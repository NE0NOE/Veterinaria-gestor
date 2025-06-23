import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// Importamos Permission desde el mismo lugar que hasPermission para asegurar la compatibilidad de tipos
import { hasPermission, Permission } from '../config/permissions'; 

interface ProtectedRouteProps {
  requiredPermission?: Permission;
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredPermission, children }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    // Redirigir al login si no está autenticado
    return <Navigate to="/login" replace />;
  }

  // Si se requiere un permiso y el usuario no lo tiene
  if (requiredPermission && !hasPermission(user?.role ?? null, requiredPermission)) {
    // Redirigir a una página no autorizada o al dashboard si falta el permiso
    // Por ahora, redirigiendo a la raíz (LandingPage)
    console.warn(`User ${user?.email} (role: ${user?.role}) lacks permission: ${requiredPermission}`); // Cambiado 'username' por 'email'
    return <Navigate to="/" replace />;
  }

  // Si está autenticado y tiene permiso (o no se requiere permiso específico), renderizar la ruta/componente hijo
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
