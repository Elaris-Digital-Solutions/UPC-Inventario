import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  authLoading: boolean;
  isUniversityEmail: (email: string) => boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  loginWithMicrosoft: (email: string, redirectPath?: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  user: any | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const UPC_EMAIL_REGEX = /^[a-zA-Z0-9._-]+@upc\.edu\.pe$/i;

const isValidUpcEmail = (email: string) => UPC_EMAIL_REGEX.test(email.trim().toLowerCase());

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const syncSession = async (nextSession: Session | null) => {
      const email = nextSession?.user?.email || '';
      if (nextSession && email && !isValidUpcEmail(email)) {
        await supabase.auth.signOut();
        setSession(null);
        return;
      }
      setSession(nextSession);
    };

    // Obtener sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await syncSession(session);
      setAuthLoading(false);
    });

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        await syncSession(session);
        setAuthLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidUpcEmail(normalizedEmail)) {
      return { error: new Error('Solo se permiten cuentas @upc.edu.pe') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    return { error };
  };

  const loginWithMicrosoft = async (email: string, redirectPath = '/catalogo') => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidUpcEmail(normalizedEmail)) {
      return { error: new Error('Solo se permiten cuentas @upc.edu.pe') };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}${redirectPath}`,
        queryParams: {
          prompt: 'select_account',
          login_hint: normalizedEmail,
        },
      },
    });

    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const effectiveUser = session?.user || null;

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!session,
      authLoading,
      isUniversityEmail: isValidUpcEmail,
      user: effectiveUser,
      login,
      loginWithMicrosoft,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};