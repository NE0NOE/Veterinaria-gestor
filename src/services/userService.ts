import { v4 as uuidv4 } from 'uuid';
import { MockUser, User, UserRole } from '../types';

const USERS_STORAGE_KEY = 'vetClinicUsers';

// Initial mock users if localStorage is empty
const initialMockUsers: MockUser[] = [
  { id: '1', username: 'owner', password: 'password', role: 'owner' },
  { id: '2', username: 'vet', password: 'password', role: 'veterinarian' },
  { id: '3', username: 'employee', password: 'password', role: 'employee' },
  { id: '4', username: 'client', password: 'password', role: 'client' },
];

const getUsersFromStorage = (): MockUser[] => {
  const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
  if (storedUsers) {
    try {
      return JSON.parse(storedUsers);
    } catch (error) {
      console.error("Failed to parse users from localStorage", error);
      // Fallback to initial users if parsing fails
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialMockUsers));
      return initialMockUsers;
    }
  } else {
    // Initialize localStorage if empty
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialMockUsers));
    return initialMockUsers;
  }
};

const saveUsersToStorage = (users: MockUser[]) => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const getAllUsers = (): MockUser[] => {
  return getUsersFromStorage();
};

// Function to find a user by credentials (used for login)
export const getUserByCredentials = (credentials: Pick<MockUser, 'username' | 'password'>): User | null => {
  const users = getUsersFromStorage();
  const foundUser = users.find(
    (u) => u.username === credentials.username && u.password === credentials.password
  );
  if (foundUser) {
    // Return only the User part (without password)
    const { password, ...userToReturn } = foundUser;
    return userToReturn;
  }
  return null;
};

export const addUser = (userData: Omit<MockUser, 'id'>): MockUser => {
  if (!userData.password) {
    throw new Error("Password is required to create a new user.");
  }
  const users = getUsersFromStorage();
  // Check if username already exists
  if (users.some(u => u.username === userData.username)) {
    throw new Error(`Username "${userData.username}" already exists.`);
  }
  const newUser: MockUser = {
    ...userData,
    id: uuidv4(),
  };
  const updatedUsers = [...users, newUser];
  saveUsersToStorage(updatedUsers);
  return newUser;
};

export const updateUser = (userId: string, updatedData: Partial<Omit<MockUser, 'id' | 'password'>>): MockUser | null => {
  const users = getUsersFromStorage();
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return null; // User not found
  }

  // Prevent changing username if it already exists (excluding the current user)
  if (updatedData.username && users.some(u => u.username === updatedData.username && u.id !== userId)) {
      throw new Error(`Username "${updatedData.username}" is already taken.`);
  }


  const updatedUser = {
    ...users[userIndex],
    ...updatedData, // Apply updates (username, role)
  };
  users[userIndex] = updatedUser;
  saveUsersToStorage(users);
  return updatedUser;
};

export const deleteUser = (userId: string): boolean => {
  const users = getUsersFromStorage();
  const initialLength = users.length;
  const updatedUsers = users.filter((u) => u.id !== userId);
  if (users.length !== updatedUsers.length) {
    saveUsersToStorage(updatedUsers);
    return true; // Deletion successful
  }
  return false; // User not found or deletion failed
};

// Function to get available roles (useful for dropdowns)
export const getAvailableRoles = (): UserRole[] => {
    // You might want to fetch this from a config or define it statically
    return ['owner', 'veterinarian', 'employee', 'client'];
}
