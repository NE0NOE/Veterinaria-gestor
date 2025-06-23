import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext'; // Tu AuthProvider y useAuth

// Importaciones de tus componentes de página (mantener las existentes)
import GestionarCitasPage from './pages/admin/GestionarCitasPage';
import HistorialClinicoPage from './pages/admin/HistorialClinicoPage';
import AdminCitasModule from './pages/admin/AdminCitasModule';
import Login from './pages/Login';
import Appointments from './pages/Appointments';
import Pets from './pages/Pets';
import Patients from './pages/Patients';
import InventarioPage from './pages/admin/InventarioPage';
import Purchases from './pages/Purchases';
import Users from './pages/Users';
import LandingPage from './pages/LandingPage';
import FoodCalculator from './pages/FoodCalculator';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import ResetPasswordConfirm from './pages/ResetPasswordConfirm';
import AdminDashboard from './pages/admin/AdminDashboard';
import ClienteDashboardLayout from './pages/dashboard/ClienteDashboardLayout';
import Home from './pages/dashboard/Home'; // Home del cliente
import Citas from './pages/dashboard/Citas'; // Citas del cliente
import Mascotas from './pages/dashboard/Mascotas'; // Mascotas del cliente
import AgregarUsuario from './pages/admin/AgregarUsuario';
import AdminDashboardLayout from './pages/admin/AdminDashboardLayout';
import VerUsuarios from './pages/admin/VerUsuarios';
import VerMascotas from './pages/admin/VerMascotas';
import GestionMascotas from './pages/admin/GestionMascotas';
import CreateAppointment from './pages/CreateAppointment';
import GestionCitas from './pages/admin/GestionCitas'; // Para gestionar citas por veterinarios/admin
import ProveedoresComprasPage from './pages/admin/ProveedoresComprasPage';

// Importa los componentes para Veterinario con los nombres de archivo y componentes correctos
import VeterinarioDashboardLayout from './pages/vet/VeterinarioDashboardLayout';
import VeterinarioHome from './pages/vet/VeterinarioHome'; // Asegúrate de que el archivo se llame VeterinarioHome.tsx y el componente sea export default VeterinarioHome;
import VeterinarioCitas from './pages/vet/VeterinarioCitas'; // ¡Importante: este es el componente que queremos cargar!


// Componente de Ruta Protegida
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p className="text-xl text-indigo-400">Verificando autenticación...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    console.warn(`Acceso denegado. Rol del usuario: ${user.role}, Roles permitidos: ${allowedRoles.join(', ')}`);
    // Redirige a un dashboard por defecto o a una página de acceso denegado
    switch (user.role) {
      case 'cliente':
        return <Navigate to="/dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin-dashboard" replace />;
      case 'veterinario':
        return <Navigate to="/veterinario-dashboard" replace />;
      case 'asistente':
        return <Navigate to="/asistente-dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Páginas públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/calculadora-alimentos" element={<FoodCalculator />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password-confirm" element={<ResetPasswordConfirm />} />
          <Route path="/create-appointment" element={<CreateAppointment />} />

          {/* Cliente Dashboard (rol 'cliente') */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['cliente']}><ClienteDashboardLayout /></ProtectedRoute>}>
              <Route index element={<Home />} />
              <Route path="citas" element={<Citas />} />
              <Route path="mascotas" element={<Mascotas />} />
              <Route path="historial-clinico/:mascotaId?" element={<HistorialClinicoPage />} />
          </Route>

          {/* Dashboard Admin (roles 'admin') */}
          <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="agregar-usuario" element={<AgregarUsuario />} />
              <Route path="ver-usuarios" element={<VerUsuarios />} />
              <Route path="gestion-mascotas" element={<GestionMascotas />} />
              <Route path="gestionar-citas" element={<GestionCitas />} />
              <Route path="ver-mascotas" element={<VerMascotas />} />
              <Route path="gestionar-citas-page" element={<GestionarCitasPage />} />
              <Route path="admin-citas-module" element={<AdminCitasModule />} />
              <Route path="historial-clinico/:mascotaId?" element={<HistorialClinicoPage />} />
              <Route path="inventario" element={<InventarioPage />} />
              <Route path="proveedores-compras" element={<ProveedoresComprasPage />} />
          </Route>

          {/* Dashboard Veterinario (rol 'veterinario') */}
          <Route path="/veterinario-dashboard" element={<ProtectedRoute allowedRoles={['veterinario']}><VeterinarioDashboardLayout /></ProtectedRoute>}>
              <Route index element={<VeterinarioHome />} /> {/* Usar el componente VeterinarioHome */}
              <Route path="gestionar-citas" element={<VeterinarioCitas />} />
              <Route path="admin-citas-module" element={<AdminCitasModule />} />
              <Route path="gestion-mascotas" element={<GestionMascotas />} />
              <Route path="historial-clinico/:mascotaId?" element={<HistorialClinicoPage />} />
              {/* Añade aquí otras rutas específicas para el veterinario */}
          </Route>

          {/* Dashboard Asistente (rol 'asistente') */}
          <Route path="/asistente-dashboard" element={<ProtectedRoute allowedRoles={['asistente']}><AdminDashboardLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} /> {/* TEMPORAL: Dashboard general */}
              <Route path="gestionar-citas" element={<GestionCitas />} />
              <Route path="admin-citas-module" element={<AdminCitasModule />} />
              <Route path="gestion-mascotas" element={<GestionMascotas />} />
          </Route>

          {/* Rutas protegidas genéricas */}
          <Route path="/appointments" element={<ProtectedRoute allowedRoles={['admin', 'veterinario', 'asistente']}><Appointments /></ProtectedRoute>} />
          <Route path="/my-pets" element={<ProtectedRoute allowedRoles={['cliente']}><Pets /></ProtectedRoute>} />
          <Route path="/patients" element={<ProtectedRoute allowedRoles={['admin', 'veterinario', 'asistente']}><Patients /></ProtectedRoute>} />
          <Route path="/purchases" element={<ProtectedRoute allowedRoles={['admin']}><Purchases /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><Users /></ProtectedRoute>} />

          {/* Fallback para rutas no encontradas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
