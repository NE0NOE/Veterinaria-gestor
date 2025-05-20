import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Pets from './pages/Pets';
import Patients from './pages/Patients';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Users from './pages/Users';
import LandingPage from './pages/LandingPage';
import FoodCalculator from './pages/FoodCalculator';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import ResetPasswordConfirm from './pages/ResetPasswordConfirm';
import AdminDashboard from './pages/admin/AdminDashboard'; 
import ClienteDashboardLayout from './pages/dashboard/ClienteDashboardLayout';
import Home from './pages/dashboard/Home';
import Citas from './pages/dashboard/Citas';
import Mascotas from './pages/dashboard/Mascotas';
import AgregarUsuario from './pages/admin/AgregarUsuario';


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

          {/* Cliente Dashboard (rol cliente) */}
          <Route path="/dashboard" element={<ClienteDashboardLayout />}>
            <Route index element={<Home />} />        {/* Página inicial para /dashboard */}
            <Route path="citas" element={<Citas />} />     {/* /dashboard/citas */}
            <Route path="mascotas" element={<Mascotas />} /> {/* /dashboard/mascotas */}
          </Route>

          {/* Rutas protegidas para personal */}
          <Route
            path="/appointments"
            element={
              <ProtectedRoute requiredPermission="appointments">
                <Appointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-pets"
            element={
              <ProtectedRoute requiredPermission="pets">
                <Pets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patients"
            element={
              <ProtectedRoute requiredPermission="patients">
                <Patients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute requiredPermission="inventory">
                <Inventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases"
            element={
              <ProtectedRoute requiredPermission="purchases">
                <Purchases />
              </ProtectedRoute>
            }
          />
          <Route path="/admin-dashboard/agregar-usuario" element={<AgregarUsuario />} />

          <Route
            path="/users"
            element={
              <ProtectedRoute requiredPermission="users">
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
  path="/admin-dashboard"
  element={
    <ProtectedRoute requiredPermission="admin">
      <AdminDashboard />
    </ProtectedRoute>
  }
/>

          {/* Fallback para rutas no encontradas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
