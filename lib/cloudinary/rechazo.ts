import { reportar } from '../seguridad/reportar';

// La respuesta de /api/cloudinary/firmas cuando pedir_firma_cloudinary() falla.
// Aparte de la ruta para poder probarla: Vitest no resuelve `@/`.
//
// SE EMPAREJA POR EL CODE, nunca por el texto: los dos SQLSTATE los eligio la
// migracion 20260823160000_limite_firmas.sql para no compartirlos con nadie.
//
// Hasta el 2026-09-23 todo lo que no era 54000 caia al 403: un timeout de la
// base o un fallo de red le decian a un admin legitimo "Solo un administrador
// puede subir imagenes", y no quedaba rastro. Lo esperado sigue sin ser un
// incidente; lo demas pasa por reportar().
export function rechazoDeFirma(error: { code?: string; message: string }): { status: number; error: string } {
  if (error.code === '54000') {
    return { status: 429, error: 'Demasiadas subidas seguidas. Espera unos minutos y vuelve a intentarlo.' };
  }

  if (error.code === '42501') {
    return { status: 403, error: 'Solo un administrador puede subir imágenes.' };
  }

  return { status: 500, error: reportar('pedirFirmaCloudinary', error) };
}
