import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Importa tu cliente Supabase

interface User {
  id: string; // UUID de Supabase
  email: string | undefined;
  role?: string; // Rol asignado por tu sistema de roles
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean; // Para indicar si la autenticación inicial está en progreso
  login: (user: User) => void; // Función para establecer el usuario (usado internamente o para flujos específicos)
  logout: () => Promise<void>; // Función para cerrar sesión
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true); // Estado de carga inicial

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AuthContext: onAuthStateChange event:", event);

        if (session?.user) {
          const supabaseUser = session.user;
          console.log("AuthContext: Supabase User ID:", supabaseUser.id);
          console.log("AuthContext: Supabase User Email:", supabaseUser.email);

          let userRole: string | undefined;

          try {
            console.log("AuthContext: Attempting to fetch user_roles for id_user:", supabaseUser.id);

            // *** AÑADIMOS UN TIMEOUT PARA LA CONSULTA DE SUPABASE ***
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Supabase query timed out after 5 seconds')), 5000)
            );

            console.log("AuthContext: Executing Supabase query for user_roles...");
            const { data: userRoleData, error: userRoleError } = await Promise.race([
              supabase
                .from('user_roles')
                .select('id_rol')
                .eq('id_user', supabaseUser.id)
                .single(),
              timeoutPromise
            ]) as { data: { id_rol: number } | null; error: any | null; }; // Casteamos para TypeScript

            // *** ESTOS LOGS DEBEN APARECER AHORA ***
            console.log("AuthContext: Raw user_roles data response:", userRoleData);
            console.log("AuthContext: Raw user_roles error response:", userRoleError);

            if (userRoleError) {
              if (userRoleError.code === 'PGRST116') {
                console.warn('AuthContext: No role assigned in user_roles for this user (PGRST116). User ID:', supabaseUser.id);
              } else {
                console.error('AuthContext: Error fetching user role from user_roles:', userRoleError.message, userRoleError);
              }
            }

            if (userRoleData) {
              console.log('AuthContext: userRoleData found:', userRoleData);
              console.log('AuthContext: Attempting to fetch role name for id_rol:', userRoleData.id_rol);
              
              const { data: roleNameData, error: roleNameError } = await Promise.race([
                supabase
                  .from('roles')
                  .select('nombre')
                  .eq('id_rol', userRoleData.id_rol)
                  .single(),
                timeoutPromise // Usamos el mismo timeout
              ]) as { data: { nombre: string } | null; error: any | null; };

              console.log("AuthContext: Raw roles data response:", roleNameData);
              console.log("AuthContext: Raw roles error response:", roleNameError);


              if (roleNameError) {
                console.error('AuthContext: Error fetching role name from roles:', roleNameError.message, roleNameError);
              } else {
                userRole = roleNameData?.nombre?.toLowerCase().trim();
                console.log('AuthContext: ROL ASIGNADO AL USUARIO:', userRole);
              }
            } else {
                console.warn('AuthContext: No userRoleData returned for user ID:', supabaseUser.id, '. User might not have a role assigned in user_roles table.');
            }
          } catch (err: any) {
            // Este catch atrapará el error de timeout o cualquier otro error inesperado.
            console.error('AuthContext: UNHANDLED ERROR IN ROLE FETCH BLOCK:', err.message, err);
            // Eliminado: setError('Error al obtener el rol del usuario: ' + err.message);
          } finally {
            setLoading(false);
            console.log("AuthContext: Loading set to false after role fetch attempt.");
          }

          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email,
            role: userRole,
          });
          setIsAuthenticated(true);
          console.log("AuthContext: User state set. isAuthenticated:", true, "User:", { id: supabaseUser.id, email: supabaseUser.email, role: userRole });

        } else {
          console.log("AuthContext: onAuthStateChange: User logged out/no session.");
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
          console.log("AuthContext: User state cleared. isAuthenticated:", false, "Loading set to false.");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = (loggedInUser: User) => {
    setUser(loggedInUser);
    setIsAuthenticated(true);
    console.log("AuthContext: login function called. User:", loggedInUser);
  };

  const logout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('AuthContext: Error al cerrar sesión:', error.message);
    }
    console.log("AuthContext: logout function initiated.");
  };

  const contextValue: AuthState = {
    user,
    isAuthenticated,
    loading,
    login,
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
  return context;
};
