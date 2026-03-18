import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
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
const ADMIN_EMAIL = 'admin@upc.edu.pe';
const ADMIN_PASSWORD = '123456789';
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

const normalizeEmail = (value: string) => (value || '').trim().toLowerCase();

const isAllowedAdminEmail = (email: string) => normalizeEmail(email) === ADMIN_EMAIL;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const isAdminSession = (nextSession: Session | null) => {
    if (!nextSession) return false;
    const email = normalizeEmail(nextSession.user?.email || '');
    return isAllowedAdminEmail(email);
  };

  /**
   * Returns:
   * - string: alumno id if found
   * - null: not registered
   * - undefined: cannot verify (e.g., RLS/permission/network)
   */
  const getAlumnoIdByEmail = async (email: string): Promise<string | null | undefined> => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;

    try {
      const { data, error } = await supabase
        .from('alumnos')
        .select('id')
        .eq('email', normalizedEmail)
        .eq('activo', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking alumnos table:', error);
        return undefined;
      }

      return data?.id ? String(data.id) : null;
    } catch (error) {
      console.error('Unexpected alumnos check error:', error);
      return undefined;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const syncSession = async (nextSession: Session | null) => {
      const email = nextSession?.user?.email || '';

      // Admin accounts may be outside UPC email domain; allow them via allowlist/role.
      if (nextSession && email && !isValidUpcEmail(email) && !isAdminSession(nextSession)) {
        await supabase.auth.signOut();
        setSession(null);
        return;
      }

      // Do not enforce alumnos membership for admin accounts
      if (nextSession && email && !isAdminSession(nextSession)) {
        const alumnoId = await getAlumnoIdByEmail(email);
        if (alumnoId === null) {
          try {
            localStorage.setItem('upc_register_email', email.trim().toLowerCase());
          } catch {
            // ignore
          }
          await supabase.auth.signOut();
          setSession(null);
          return;
        }
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
    const normalizedEmail = normalizeEmail(email);
    if (!isAllowedAdminEmail(normalizedEmail)) {
      return { error: new Error('Solo el correo admin@upc.edu.pe puede acceder al panel admin') };
    }

    if (password !== ADMIN_PASSWORD) {
      return { error: new Error('Clave de administrador incorrecta') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    return { error };
  };

  const sendMagicLink = async (email: string, redirectPath = '/catalogo') => {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidUpcEmail(normalizedEmail)) {
      return { error: new Error('Solo se permiten cuentas @upc.edu.pe') };
    }

    // Best-effort pre-check: if we can confirm it's NOT registered, block.
    // If we cannot verify (RLS), we allow the OTP request and enforce on session.
    const alumnoId = await getAlumnoIdByEmail(normalizedEmail);
    if (alumnoId === null) {
      const err: any = new Error('Tu correo no está registrado. Regístrate primero.');
      err.code = 'NOT_REGISTERED';
      try {
        localStorage.setItem('upc_register_email', normalizedEmail);
      } catch {
        // ignore
      }
      return { error: err };
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
    const normalizedEmail = normalizeEmail(email);
    if (!isValidUpcEmail(normalizedEmail)) {
      return { error: new Error('Solo se permiten cuentas @upc.edu.pe') };
    }

    const alumnoId = await getAlumnoIdByEmail(normalizedEmail);
    if (alumnoId === null) {
      const err: any = new Error('Tu correo no está registrado. Regístrate primero.');
      err.code = 'NOT_REGISTERED';
      try {
        localStorage.setItem('upc_register_email', normalizedEmail);
      } catch {
        // ignore
      }
      return { error: err };
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
      isAdmin: isAdminSession(session),
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