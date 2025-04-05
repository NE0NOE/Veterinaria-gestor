import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MockUser, User } from '../types';
import { ShieldAlert, Plus, Edit, Trash2 } from 'lucide-react';
import * as userService from '../services/userService'; // Import service functions
import UserModal from '../components/UserModal'; // Import the modal

const Users: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<MockUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<MockUser | null>(null);

  const isOwner = user?.role === 'owner';

  const fetchUsers = () => {
    if (!isOwner) return; // Only fetch if owner
    setIsLoading(true);
    setError(null);
    try {
      const fetchedUsers = userService.getAllUsers();
      setUsers(fetchedUsers);
    } catch (err: any) {
      setError(err.message || 'Error al cargar usuarios.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users on component mount or when user role changes (relevant if login changes)
  useEffect(() => {
    fetchUsers();
  }, [isOwner]); // Re-fetch if the user's role changes (e.g., after login)

  const handleOpenModal = (user: MockUser | null = null) => {
    setUserToEdit(user);
    setIsModalOpen(true);
    setError(null); // Clear previous errors when opening modal
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setUserToEdit(null);
    setError(null); // Clear errors when closing modal
  };

  const handleSaveUser = (userData: MockUser) => {
     setError(null); // Clear previous errors
    try {
      if (userToEdit) {
        // Editing existing user
        // Separate data for update (no password unless provided)
        const { password, ...updateData } = userData;
        const dataToUpdate: Partial<Omit<MockUser, 'id' | 'password'>> = updateData;

        userService.updateUser(userToEdit.id, dataToUpdate);
        // If password was provided in the modal, we might need a separate password update function
        // For now, userService.updateUser only updates username and role.
        // A dedicated password change function would be more secure.
      } else {
        // Adding new user
        const { id, ...newUser } = userData; // Exclude empty id
        if (!newUser.password) throw new Error("La contraseña es obligatoria para nuevos usuarios.");
        userService.addUser(newUser);
      }
      fetchUsers(); // Re-fetch users list
      handleCloseModal(); // Close modal on success
    } catch (err: any) {
       console.error("Error saving user:", err);
       // Display error within the modal or page
       // For now, we'll rely on the modal's internal error display,
       // but we could set the page error state here too.
       // setError(err.message || 'Error al guardar el usuario.');

       // Re-throw the error so the modal can catch it and display it
       throw err;
    }
  };

  const handleDeleteUser = (userId: string) => {
    // Optional: Add confirmation dialog here
    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
       setError(null);
      try {
        // Prevent deleting the currently logged-in user (important!)
        if (user?.id === userId) {
            throw new Error("No puedes eliminar tu propia cuenta.");
        }
        userService.deleteUser(userId);
        fetchUsers(); // Re-fetch users list
      } catch (err: any) {
        setError(err.message || 'Error al eliminar el usuario.');
        console.error(err);
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Usuarios</h1>
        {isOwner && (
          <button
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
          >
            <Plus size={18} className="mr-2" />
            Añadir Usuario
          </button>
        )}
      </div>

      {error && <p className="text-red-500 bg-red-100 p-3 rounded mb-4">{error}</p>}

      {!isOwner ? (
        <div className="flex items-center p-4 bg-yellow-100 text-yellow-800 rounded-md border border-yellow-200">
          <ShieldAlert className="mr-3 h-6 w-6" />
          <p>No tienes permisos para gestionar usuarios. Esta sección es solo para el rol Propietario.</p>
        </div>
      ) : isLoading ? (
        <p>Cargando usuarios...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto"> {/* Added overflow-x-auto */}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID (Interno)
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No hay usuarios registrados.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {u.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {u.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {u.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleOpenModal(u)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      {/* Prevent deleting the currently logged-in user */}
                      {user?.id !== u.id && (
                         <button
                           onClick={() => handleDeleteUser(u.id)}
                           className="text-red-600 hover:text-red-900"
                           title="Eliminar"
                         >
                           <Trash2 size={18} />
                         </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveUser}
        userToEdit={userToEdit}
      />
    </div>
  );
};

export default Users;
