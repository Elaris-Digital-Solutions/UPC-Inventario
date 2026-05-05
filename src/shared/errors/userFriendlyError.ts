/**
 * Convierte errores de Supabase/PostgREST en mensajes seguros para usuario final.
 * Nunca expone códigos SQL, nombres de columnas o detalles internos.
 */
export function userFriendlyError(err: unknown, fallback = 'Ocurrió un error. Inténtalo de nuevo.'): string {
  if (!err) return fallback;
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error('[userFriendlyError]', err);
  }
  const e = err as { message?: string; code?: string; status?: number };
  const code = String(e?.code ?? '');
  const msg = String(e?.message ?? '');

  // Auth / RLS
  if (code === '42501' || /permission denied|rls/i.test(msg)) {
    return 'No tienes permisos para realizar esta acción.';
  }
  // Trigger custom de transición de estado
  if (/Transición de estado inválida/i.test(msg)) {
    return 'No se puede cambiar el estado de la reserva.';
  }
  // RPC business errors (mensajes en español que devolvemos a propósito)
  if (/^[A-ZÁÉÍÓÚÑ]/.test(msg) && msg.length < 140 && !msg.includes('::')) {
    return msg;
  }
  if (e?.status === 401 || /jwt|token|auth/i.test(msg)) {
    return 'Tu sesión expiró. Inicia sesión de nuevo.';
  }
  if (e?.status === 429 || /rate limit/i.test(msg)) {
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  }
  return fallback;
}
