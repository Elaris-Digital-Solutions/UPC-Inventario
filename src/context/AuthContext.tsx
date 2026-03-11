import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  authLoading: boolean;
  isUniversityEmail: (email: string) => boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  sendMagicLink: (email: string, redirectPath?: string) => Promise<{ error: any }>;
  loginWithMicrosoft: (email: string, redirectPath?: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  user: any | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const UPC_EMAIL_REGEX = /^[a-zA-Z0-9._-]+@upc\.edu\.pe$/i;
const AUTH_REDIRECT_BASE_URL = import.meta.env.VITE_AUTH_REDIRECT_URL?.replace(/\/+$/, '');
const FALLBACK_PRODUCTION_AUTH_URL = 'https://upc-inventario.netlify.app';

const isValidUpcEmail = (email: string) => UPC_EMAIL_REGEX.test(email.trim().toLowerCase());

const isLocalhostUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

const getAuthRedirectBaseUrl = () => {
  const browserOrigin = window.location.origin;
  const browserIsLocalhost = isLocalhostUrl(browserOrigin);

  if (!AUTH_REDIRECT_BASE_URL) {
    return browserIsLocalhost ? browserOrigin : FALLBACK_PRODUCTION_AUTH_URL;
  }

  const configuredIsLocalhost = isLocalhostUrl(AUTH_REDIRECT_BASE_URL);
  if (configuredIsLocalhost && !browserIsLocalhost) {
    return FALLBACK_PRODUCTION_AUTH_URL;
  }

  return AUTH_REDIRECT_BASE_URL;
};

const buildAuthRedirectUrl = (redirectPath = '/') => {
  const safeRedirectPath = redirectPath.startsWith('/') ? redirectPath : '/';
  const baseUrl = getAuthRedirectBaseUrl();

  return `${baseUrl}${safeRedirectPath}`;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async (nextSession: Session | null) => {
      const email = nextSession?.user?.email || '';
      if (nextSession && email && !isValidUpcEmail(email)) {
        await supabase.auth.signOut();
        setSession(null);
        return;
      }
      setSession(nextSession);
    };

    const consumeAuthSessionFromUrl = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          await syncSession(data.session);
          window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
          return true;
        }
      }

      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          await syncSession(data.session);
          window.history.replaceState({}, document.title, window.location.pathname);
          return true;
        }
      }

      return false;
    };

    const initializeAuth = async () => {
      await consumeAuthSessionFromUrl();
      const { data: { session } } = await supabase.auth.getSession();
      await syncSession(session);
      if (isMounted) {
        setAuthLoading(false);
      }
    };

    void initializeAuth();

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        await syncSession(session);
        if (isMounted) {
          setAuthLoading(false);
        }
      })();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
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

  const sendMagicLink = async (email: string, redirectPath = '/catalogo') => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidUpcEmail(normalizedEmail)) {
      return { error: new Error('Solo se permiten cuentas @upc.edu.pe') };
    }

    const safeRedirectPath = redirectPath.startsWith('/') ? redirectPath : '/catalogo';
    const explicitRedirect = buildAuthRedirectUrl(safeRedirectPath);

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: explicitRedirect,
      },
    });

    // Some deployments only allow the base Site URL in Supabase Auth redirects.
    if (error && /redirect/i.test(error.message || '')) {
      const { error: fallbackError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: buildAuthRedirectUrl('/'),
        },
      });

      return { error: fallbackError };
    }

    return { error };
  };

  const loginWithMicrosoft = async (email: string, redirectPath = '/catalogo') => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidUpcEmail(normalizedEmail)) {
      return { error: new Error('Solo se permiten cuentas @upc.edu.pe') };
    }

    const safeRedirectPath = redirectPath.startsWith('/') ? redirectPath : '/catalogo';

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: buildAuthRedirectUrl(safeRedirectPath),
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
      sendMagicLink,
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