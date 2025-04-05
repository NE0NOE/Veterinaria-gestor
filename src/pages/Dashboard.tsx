import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CalendarDays, PawPrint, Package, ShoppingCart, Users } from 'lucide-react';
import { hasPermission } from '../config/permissions';
import { UserRole } from '../types';

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, color }) => (
  <div className={`p-4 rounded-lg shadow bg-white border-l-4 ${color}`}>
    <div className="flex items-center">
      <div className={`p-3 rounded-full ${color.replace('border', 'bg').replace('-500', '-100')} mr-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Mock data - replace with real data from services
  const stats = {
    appointments: 5,
    patients: 12,
    inventoryItems: 47,
    lowStockItems: 3,
    pendingPurchases: 2,
    users: 4
  };

  return (
    <div className="p-6 ml-64">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Panel Principal</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {hasPermission(user?.role, 'appointments') && (
          <StatCard 
            icon={CalendarDays} 
            title="Citas Hoy" 
            value={stats.appointments} 
            color="border-blue-500" 
          />
        )}
        
        {hasPermission(user?.role, 'patients') && (
          <StatCard 
            icon={PawPrint} 
            title="Pacientes" 
            value={stats.patients} 
            color="border-green-500" 
          />
        )}
        
        {hasPermission(user?.role, 'inventory') && (
          <StatCard 
            icon={Package} 
            title="Artículos en Inventario" 
            value={stats.inventoryItems} 
            color="border-purple-500" 
          />
        )}
        
        {hasPermission(user?.role, 'inventory') && (
          <StatCard 
            icon={Package} 
            title="Artículos con Stock Bajo" 
            value={stats.lowStockItems} 
            color="border-yellow-500" 
          />
        )}
        
        {hasPermission(user?.role, 'purchases') && (
          <StatCard 
            icon={ShoppingCart} 
            title="Compras Pendientes" 
            value={stats.pendingPurchases} 
            color="border-orange-500" 
          />
        )}
        
        {hasPermission(user?.role, 'users') && (
          <StatCard 
            icon={Users} 
            title="Usuarios" 
            value={stats.users} 
            color="border-red-500" 
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasPermission(user?.role, 'appointments') && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Próximas Citas</h2>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="border-b pb-3 last:border-b-0">
                  <p className="font-medium">Consulta de rutina</p>
                  <p className="text-sm text-gray-500">10:30 AM - Mascota: Max</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasPermission(user?.role, 'inventory') && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Artículos con Stock Bajo</h2>
            <div className="space-y-4">
              {['Shampoo para perros', 'Cepillos', 'Correas'].map((item) => (
                <div key={item} className="border-b pb-3 last:border-b-0">
                  <p className="font-medium">{item}</p>
                  <p className="text-sm text-gray-500">Stock: 2 unidades</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
