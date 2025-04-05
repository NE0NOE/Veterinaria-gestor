import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Pets from './pages/Pets'; // Client's view of their pets
import Patients from './pages/Patients'; // Vet/Owner view of all patients
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Users from './pages/Users';

// Layout component to wrap authenticated routes with Sidebar
const AppLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // This should ideally not be reached if ProtectedRoute is used correctly,
    // but serves as a fallback.
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-grow p-6 ml-64"> {/* Add margin-left to avoid overlap */}
        <Routes>
            {/* Dashboard */}
            <Route index element={<ProtectedRoute requiredPermission="dashboard"><Dashboard /></ProtectedRoute>} />

            {/* Appointments */}
            <Route path="appointments" element={<ProtectedRoute requiredPermission="appointments"><Appointments /></ProtectedRoute>} />

            {/* Pet Management (Client) */}
            <Route path="my-pets" element={<ProtectedRoute requiredPermission="pets"><Pets /></ProtectedRoute>} />

            {/* Patient Management (Vet/Owner) */}
            <Route path="patients" element={<ProtectedRoute requiredPermission="patients"><Patients /></ProtectedRoute>} />

             {/* Inventory */}
            <Route path="inventory" element={<ProtectedRoute requiredPermission="inventory"><Inventory /></ProtectedRoute>} />

             {/* Purchases */}
            <Route path="purchases" element={<ProtectedRoute requiredPermission="purchases"><Purchases /></ProtectedRoute>} />

             {/* User Management (Owner) */}
            <Route path="users" element={<ProtectedRoute requiredPermission="users"><Users /></ProtectedRoute>} />

            {/* Add other protected routes here */}

            {/* Fallback for unknown authenticated routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* All authenticated routes are nested under AppLayout */}
          <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
