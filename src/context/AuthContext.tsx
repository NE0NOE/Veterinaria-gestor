import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '../supabaseClient.ts';

interface User {
  id: string;
  email: string | undefined;
  role?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cargar sesión al iniciar
  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const supabaseUser = session.user;
        let cachedRole = localStorage.getItem(`role_${supabaseUser.id}`);

        if (!cachedRole) {
          console.log("AuthContext: No role in cache. Fetching from Supabase...");
          try {
            const { data: userRoleData, error: userRoleError } = await supabase
              .from('user_roles')
              .select('id_rol')
              .eq('id_user', supabaseUser.id)
              .single();

            if (userRoleData) {
              const { data: roleNameData } = await supabase
                .from('roles')
                .select('nombre')
                .eq('id_rol', userRoleData.id_rol)
                .single();

              cachedRole = roleNameData?.nombre?.toLowerCase().trim() || null;

              if (cachedRole) {
                localStorage.setItem(`role_${supabaseUser.id}`, cachedRole);
                console.log("AuthContext: Rol obtenido y guardado en localStorage:", cachedRole);
              }
            } else {
              console.warn("AuthContext: Usuario sin rol asignado");
            }
          } catch (err: any) {
            console.error("AuthContext: Error al obtener el rol:", err.message);
          }
        } else {
          console.log("AuthContext: Rol recuperado desde localStorage:", cachedRole);
        }

        setUser({ id: supabaseUser.id, email: supabaseUser.email, role: cachedRole || undefined });
        setIsAuthenticated(true);
      } else {
        console.log("AuthContext: No session. Usuario no autenticado.");
      }

      setLoading(false);
    };

    initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthContext: onAuthStateChange event:", event);

      if (event === 'SIGNED_IN' && session?.user) {
        const supabaseUser = session.user;
        let cachedRole = localStorage.getItem(`role_${supabaseUser.id}`);

        if (!cachedRole) {
          const { data: userRoleData } = await supabase
            .from('user_roles')
            .select('id_rol')
            .eq('id_user', supabaseUser.id)
            .single();

          const { data: roleNameData } = await supabase
            .from('roles')
            .select('nombre')
            .eq('id_rol', userRoleData?.id_rol)
            .single();

          cachedRole = roleNameData?.nombre?.toLowerCase().trim() || null;

          if (cachedRole) {
            localStorage.setItem(`role_${supabaseUser.id}`, cachedRole);
            console.log("AuthContext: Rol obtenido y guardado en localStorage:", cachedRole);
          }
        }

        setUser({ id: supabaseUser.id, email: supabaseUser.email, role: cachedRole || undefined });
        setIsAuthenticated(true);
        setLoading(false);
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        localStorage.clear(); // Limpia todos los roles cacheados al cerrar sesión
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = (loggedInUser: User) => {
    setUser(loggedInUser);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) console.error('AuthContext: Error al cerrar sesión:', error.message);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
