import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../config/permissions';
import { Permission } from '../types';

interface ProtectedRouteProps {
  requiredPermission?: Permission;
  children?: React.ReactNode; // Allow wrapping components directly
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredPermission, children }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(user?.role ?? null, requiredPermission)) {
    // Redirect to an unauthorized page or dashboard if permission is missing
    // For now, redirecting to dashboard
    console.warn(`User ${user?.username} (role: ${user?.role}) lacks permission: ${requiredPermission}`);
    return <Navigate to="/" replace />;
  }

  // If authenticated and has permission (or no specific permission required), render the child route/component
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
