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

export const authService = {
  /** Comprueba si un email es de dominio institucional UPC. */
  isValidUpcEmail(email: string): boolean {
    return UPC_EMAIL_REGEX.test(email.trim().toLowerCase());
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
   * Fuerza el cierre de sesión si el email no cumple la política UPC.
   * Retorna `true` si la sesión fue revocada.
   */
  async enforceUpcEmailPolicy(session: Session | null): Promise<boolean> {
    const email = session?.user?.email ?? '';
    if (session && email && !authService.isValidUpcEmail(email)) {
      await supabase.auth.signOut();
      return true;
    }
    return false;
  },
};
