/**
 * AuthContext refactorizado.
 *
 * Cambios respecto a la versión anterior:
 *  - Toda la lógica de Supabase Auth delegada a `authService`.
 *  - `user` tipado con `User` de Supabase en lugar de `any`.
 *  - Contexto separado del proveedor para facilitar tests.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { authService } from '@/features/auth/services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  authLoading: boolean;
  user: User | null;
  isUniversityEmail: (email: string) => boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  loginWithMicrosoft: (email: string, redirectPath?: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Carga la sesión inicial
    const init = async () => {
      const session = await authService.getSession();
      const revoked = await authService.enforceUpcEmailPolicy(session);
      setUser(revoked ? null : (session?.user ?? null));
      setAuthLoading(false);
    };

    void init();

    // Escucha cambios de sesión en tiempo real
    const unsubscribe = authService.onAuthStateChange(async (session) => {
      const revoked = await authService.enforceUpcEmailPolicy(session);
      setUser(revoked ? null : (session?.user ?? null));
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        authLoading,
        user,
        isUniversityEmail: authService.isValidUpcEmail,
        login: authService.loginWithPassword,
        loginWithMicrosoft: authService.loginWithMicrosoft,
        logout: authService.logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return context;
};
