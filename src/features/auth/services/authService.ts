/**
 * authService — lógica de autenticación mediante Supabase Auth.
 *
 * Responsabilidades:
 *  - Validación de email institucional UPC
 *  - Magic link / login con contraseña / OAuth Microsoft
 *  - Resolución de rol (admin/gestor/student) vía RPC server-side
 *  - Aplicación de política de dominio en cliente (defensa en profundidad)
 *
 * Sin dependencias de React.
 */
import { supabase } from '@/infrastructure/supabase/client';
import type { Session } from '@supabase/supabase-js';

const UPC_EMAIL_REGEX = /^[a-zA-Z0-9._-]+@upc\.edu\.pe$/i;

export type AppRole = 'admin' | 'gestor' | 'student';

export const authService = {
  /** Comprueba si un email es de dominio institucional UPC. */
  isValidUpcEmail(email: string): boolean {
    return UPC_EMAIL_REGEX.test(email.trim().toLowerCase());
  },

  /** Verifica si el alumno está registrado en la tabla alumnos. */
  async isAlumnoRegistered(email: string): Promise<boolean | undefined> {
    try {
      const { data, error } = await supabase
        .from('alumnos')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .eq('activo', true)
        .maybeSingle();
      if (error) return undefined;
      return data !== null;
    } catch {
      return undefined;
    }
  },

  /**
   * Resuelve el rol del usuario actual consultando la tabla `app_admins` server-side.
   * Si no es staff, retorna 'student'. Si no hay sesión, retorna null.
   */
  async resolveRole(): Promise<AppRole | null> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return null;
      const { data, error } = await supabase
        .from('app_admins')
        .select('role')
        .eq('email', (sessionData.session.user.email ?? '').toLowerCase())
        .eq('active', true)
        .maybeSingle();
      if (error) return 'student';
      return (data?.role as AppRole) ?? 'student';
    } catch {
      return 'student';
    }
  },

  /** Obtiene la sesión activa actual. */
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /** Suscribe a cambios de autenticación. */
  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => callback(session),
    );
    return () => subscription.unsubscribe();
  },

  /**
   * Envía un magic link OTP al email institucional.
   * No revela si el correo está o no registrado (anti-enumeración).
   * Aplica un delay constante para mitigar timing attacks.
   */
  async sendMagicLink(
    email: string,
    redirectPath = '/catalogo',
  ): Promise<{ error: Error | null }> {
    const normalizedEmail = email.trim().toLowerCase();
    const start = Date.now();

    const result = await (async () => {
      if (!authService.isValidUpcEmail(normalizedEmail)) {
        return { error: new Error('Solo se permiten cuentas @upc.edu.pe') };
      }
      const registered = await authService.isAlumnoRegistered(normalizedEmail);
      if (registered !== false) {
        const safeRedirect =
          /^\/[^/]/.test(redirectPath) ? redirectPath : '/catalogo';
        const redirectTo = `${window.location.origin}${safeRedirect}`;
        await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: { emailRedirectTo: redirectTo },
        });
      }
      return { error: null };
    })();

    // Delay constante mínimo de 800ms para no filtrar timing
    const elapsed = Date.now() - start;
    if (elapsed < 800) {
      await new Promise((r) => setTimeout(r, 800 - elapsed));
    }
    return result;
  },

  /** Login con email institucional y contraseña. */
  async loginWithPassword(
    email: string,
    password: string,
  ): Promise<{ error: Error | null }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!authService.isValidUpcEmail(normalizedEmail)) {
      return { error: new Error('Credenciales inválidas') };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) return { error: new Error('Credenciales inválidas') };
    return { error: null };
  },

  /** Login OAuth Microsoft (Azure AD). */
  async loginWithMicrosoft(
    email: string,
    redirectPath = '/catalogo',
  ): Promise<{ error: Error | null }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!authService.isValidUpcEmail(normalizedEmail)) {
      return { error: new Error('Solo se permiten cuentas @upc.edu.pe') };
    }
    const safeRedirect = /^\/[^/]/.test(redirectPath) ? redirectPath : '/catalogo';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}${safeRedirect}`,
        queryParams: { prompt: 'select_account', login_hint: normalizedEmail },
      },
    });
    return { error: error ?? null };
  },

  /** Cierra la sesión actual. */
  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  /**
   * Defense-in-depth client-side: cierra sesión si el email no cumple política UPC.
   * El backend igualmente lo aplica vía RLS, pero esto reduce superficie en cliente.
   */
  async enforceUpcEmailPolicy(session: Session | null): Promise<boolean> {
    const email = (session?.user?.email ?? '').trim().toLowerCase();
    if (!session || !email) return false;

    // Staff (admin/gestor) puede no estar en alumnos
    const role = await authService.resolveRole();
    if (role === 'admin' || role === 'gestor') return false;

    if (!authService.isValidUpcEmail(email)) {
      await supabase.auth.signOut();
      return true;
    }

    const registered = await authService.isAlumnoRegistered(email);
    if (registered === false) {
      try { localStorage.setItem('upc_register_email', email); } catch { /* ignore */ }
      await supabase.auth.signOut();
      return true;
    }

    return false;
  },
};
