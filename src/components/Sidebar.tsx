import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, LogOut, Users, Stethoscope, PawPrint, Package, ShoppingCart, CalendarDays, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../config/permissions';
import { UserRole, Permission } from '../types';
import ThemeToggle from './ThemeToggle'; // Added import

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  requiredPermission?: Permission;
  currentPath: string;
  userRole: UserRole;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label, requiredPermission, currentPath, userRole }) => {
  if (requiredPermission && !hasPermission(userRole, requiredPermission)) {
    return null; // Don't render if user lacks permission
  }

  const isActive = currentPath === to || (to !== '/' && currentPath.startsWith(to));

  return (
    <li>
      <Link
        to={to}
        className={`flex items-center p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-gray-700 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors duration-150 ${
          isActive ? 'bg-indigo-100 text-indigo-700 dark:bg-gray-700 dark:text-indigo-300 font-semibold' : ''
        }`}
      >
        <Icon className="w-5 h-5 mr-3" />
        <span>{label}</span>
      </Link>
    </li>
  );
};


const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
  };

  if (!user) return null; // Don't render sidebar if not logged in

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 h-screen fixed top-0 left-0 shadow-lg flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <Link to="/" className="flex items-center text-indigo-600 dark:text-indigo-400">
           {/* Using PawPrint as a more generic pet icon */}
           <PawPrint className="w-8 h-8 mr-2" />
           <span className="text-xl font-bold">Max's Groomer</span> {/* Updated Name */}
        </Link>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Rol: {user.role}</p> {/* Kept Rol in Spanish */}
      </div>
      <nav className="flex-grow p-4 overflow-y-auto">
        <ul className="space-y-2">
          {/* Translated Labels */}
          <NavItem to="/" icon={LayoutDashboard} label="Panel Principal" currentPath={location.pathname} userRole={user.role} requiredPermission="dashboard" />
          <NavItem to="/appointments" icon={CalendarDays} label="Citas" currentPath={location.pathname} userRole={user.role} requiredPermission="appointments" />
          {/* Client specific pet management */}
          <NavItem to="/my-pets" icon={PawPrint} label="Mis Mascotas" currentPath={location.pathname} userRole={user.role} requiredPermission="pets" />
          {/* Vet/Owner patient management */}
          <NavItem to="/patients" icon={PawPrint} label="Pacientes" currentPath={location.pathname} userRole={user.role} requiredPermission="patients" />
          <NavItem to="/inventory" icon={Package} label="Inventario" currentPath={location.pathname} userRole={user.role} requiredPermission="inventory" />
          <NavItem to="/purchases" icon={ShoppingCart} label="Compras" currentPath={location.pathname} userRole={user.role} requiredPermission="purchases" />
          <NavItem to="/users" icon={Users} label="Usuarios" currentPath={location.pathname} userRole={user.role} requiredPermission="users" />
          {/* Add more NavItems based on permissions.ts */}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <ThemeToggle /> {/* Added ThemeToggle component */}
         {/* Optional Settings Link - Translated */}
         {/* <Link to="/settings" className="flex items-center p-3 rounded-lg text-gray-700 hover:bg-gray-100">
           <Settings className="w-5 h-5 mr-3" />
           <span>Configuración</span>
         </Link> */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center p-3 rounded-lg text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-gray-700 transition-colors duration-150 mt-2"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>Cerrar Sesión</span> {/* Translated Logout */}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
