import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, AuthState, MockUser } from '../types';
import { getUserByCredentials } from '../services/userService'; // Import the service function

// Remove mockUsers definition from here
// const mockUsers: MockUser[] = [ ... ];

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Load user from localStorage on initial render
  useEffect(() => {
    const storedUser = localStorage.getItem('vetClinicUser');
    if (storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem('vetClinicUser');
      }
    }
  }, []);

  // Persist authenticated user state to localStorage whenever it changes
  useEffect(() => {
    if (user && isAuthenticated) { // Only save if authenticated
      localStorage.setItem('vetClinicUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('vetClinicUser');
    }
  }, [user, isAuthenticated]);

  // Updated login function using userService
  const login = (credentials: Pick<MockUser, 'username' | 'password'>): boolean => {
    const foundUser = getUserByCredentials(credentials); // Use the service
    if (foundUser) {
      setUser(foundUser); // Store user data (without password)
      setIsAuthenticated(true);
      return true; // Indicate successful login
    }
    // Handle login failure
    console.error('Invalid credentials');
    setIsAuthenticated(false);
    setUser(null);
    return false; // Indicate failed login
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    // localStorage removal is handled by the useEffect hook
  };

  // Context value remains largely the same structure, but login logic is updated
  const contextValue: AuthState = {
    isAuthenticated,
    user,
    // The login function exposed to consumers now handles the credential check via the service
    login: (loggedInUser: User) => { // This signature might need adjustment if login always uses credentials
        // This simplified login might not be needed if login always goes through credential check.
        // Let's keep the credential-based login as the primary method.
        // We can adjust this if a different flow is needed.
        setUser(loggedInUser);
        setIsAuthenticated(true);
    },
    // Expose the credential-based login function directly
    loginWithCredentials: login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Add loginWithCredentials to the returned type if needed by consumers
  // For now, Login.tsx likely uses it internally.
  return context;
};

// No need to export mockUsers from here anymore
// export { mockUsers };
