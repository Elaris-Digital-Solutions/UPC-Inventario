/**
 * AuthContext refactorizado con soporte de roles (admin/gestor/student).
 *
 * El rol se resuelve server-side vía `app_admins` (tabla con RLS).
 * `isAdmin` / `isStaff` derivan del rol verificado, no de un email hardcoded.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { authService, type AppRole } from '@/features/auth/services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  role: AppRole | null;
  authLoading: boolean;
  user: User | null;
  isUniversityEmail: (email: string) => boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  sendMagicLink: (email: string, redirectPath?: string) => Promise<{ error: Error | null }>;
  loginWithMicrosoft: (email: string, redirectPath?: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const session = await authService.getSession();
      const revoked = await authService.enforceUpcEmailPolicy(session);
      if (cancelled) return;

      if (revoked || !session) {
        setUser(null);
        setRole(null);
        setAuthLoading(false);
        return;
      }
      setUser(session.user);
      const r = await authService.resolveRole();
      if (cancelled) return;
      setRole(r);
      setAuthLoading(false);
    };

    void sync();

    const unsubscribe = authService.onAuthStateChange(async (session) => {
      const revoked = await authService.enforceUpcEmailPolicy(session);
      if (revoked || !session) {
        setUser(null);
        setRole(null);
        setAuthLoading(false);
        return;
      }
      setUser(session.user);
      const r = await authService.resolveRole();
      setRole(r);
      setAuthLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isAdmin: role === 'admin',
        isStaff: role === 'admin' || role === 'gestor',
        role,
        authLoading,
        user,
        isUniversityEmail: authService.isValidUpcEmail,
        login: authService.loginWithPassword,
        sendMagicLink: authService.sendMagicLink,
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
