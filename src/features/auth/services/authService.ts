/**
 * authService — lógica de autenticación mediante Supabase Auth.
 *
 * Responsabilidades:
 *  - Validación de email institucional UPC
 *  - Login con email/contraseña
 *  - Login OAuth con Microsoft/Azure
 *  - Logout
 *  - Observación de cambios de sesión
 *
 * Sin dependencias de React.
 */
import { supabase } from '@/infrastructure/supabase/client';
import type { Session } from '@supabase/supabase-js';

const UPC_EMAIL_REGEX = /^[a-zA-Z0-9._-]+@upc\.edu\.pe$/i;
const ADMIN_EMAIL = 'admin@upc.edu.pe';

export const authService = {
  /** Comprueba si un email es de dominio institucional UPC. */
  isValidUpcEmail(email: string): boolean {
    return UPC_EMAIL_REGEX.test(email.trim().toLowerCase());
  },

  /** Comprueba si el email corresponde al administrador. */
  isAdminEmail(email: string): boolean {
    return email.trim().toLowerCase() === ADMIN_EMAIL;
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
      if (error) return undefined; // no se puede verificar (ej. RLS)
      return data !== null;
    } catch {
      return undefined;
    }
  },

  /** Obtiene la sesión activa actual. */
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /**
   * Suscribe a cambios de autenticación.
   * @returns función de cleanup para llamar al desmontar.
   */
  onAuthStateChange(
    callback: (session: Session | null) => void,
  ): () => void {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return () => subscription.unsubscribe();
  },

  /**
   * Envía un magic link OTP al email institucional.
   * Pre-verifica que el alumno esté registrado antes de enviar.
   */
  async sendMagicLink(
    email: string,
    redirectPath = '/catalogo',
  ): Promise<{ error: Error | null }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!authService.isValidUpcEmail(normalizedEmail)) {
      return { error: new Error('Solo se permiten cuentas @upc.edu.pe') };
    }

    const registered = await authService.isAlumnoRegistered(normalizedEmail);
    if (registered === false) {
      try { localStorage.setItem('upc_register_email', normalizedEmail); } catch { /* ignore */ }
      const err = Object.assign(new Error('Tu correo no está registrado. Regístrate primero.'), { code: 'NOT_REGISTERED' });
      return { error: err };
    }

    const safeRedirect = redirectPath.startsWith('/') ? redirectPath : '/catalogo';
    const redirectTo = `${window.location.origin}${safeRedirect}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: redirectTo },
    });

    return { error: error ?? null };
  },

  /** Login con email institucional y contraseña. */
  async loginWithPassword(
    email: string,
    password: string,
  ): Promise<{ error: Error | null }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!authService.isValidUpcEmail(normalizedEmail)) {
      return { error: new Error('Solo se permiten cuentas @upc.edu.pe') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    return { error: error ?? null };
  },

  /** Login OAuth Microsoft (Azure AD) con login_hint al email proporcionado. */
  async loginWithMicrosoft(
    email: string,
    redirectPath = '/catalogo',
  ): Promise<{ error: Error | null }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!authService.isValidUpcEmail(normalizedEmail)) {
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

    return { error: error ?? null };
  },

  /** Cierra la sesión actual. */
  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  /**
   * Fuerza el cierre de sesión si el usuario no cumple la política de acceso.
   * - Admin: siempre permitido.
   * - Resto: debe ser email @upc.edu.pe Y estar en la tabla alumnos (activo).
   * Retorna `true` si la sesión fue revocada.
   */
  async enforceUpcEmailPolicy(session: Session | null): Promise<boolean> {
    const email = (session?.user?.email ?? '').trim().toLowerCase();
    if (!session || !email) return false;
    if (authService.isAdminEmail(email)) return false;

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
