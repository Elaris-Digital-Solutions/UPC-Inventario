/**
 * Servicio de subida de imágenes a Cloudinary.
 *
 * Responsabilidades:
 *  - Leer credenciales del entorno
 *  - Subir uno o varios archivos
 *  - Devolver metadatos normalizados
 *
 * No tiene dependencias de React ni de Supabase.
 */

export interface UploadedImage {
  secure_url: string;
  public_id: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
}

/** Sube un único archivo a Cloudinary y devuelve los metadatos. */
const uploadOne = async (file: File): Promise<UploadedImage> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const folder = import.meta.env.VITE_CLOUDINARY_FOLDER;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Falta configurar Cloudinary en .env (VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET).',
    );
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);
  if (folder) form.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: form },
  );

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error?.message ?? 'Error subiendo imagen a Cloudinary');
  }

  return {
    secure_url: json.secure_url,
    public_id: json.public_id,
    format: json.format,
    bytes: typeof json.bytes === 'number' ? json.bytes : undefined,
    width: typeof json.width === 'number' ? json.width : undefined,
    height: typeof json.height === 'number' ? json.height : undefined,
  };
};

/**
 * Sube varios archivos a Cloudinary en paralelo.
 * @returns Array de metadatos en el mismo orden que `files`.
 */
export const uploadFilesToCloudinary = async (
  files: File[],
): Promise<UploadedImage[]> => {
  if (!files.length) return [];
  return Promise.all(files.map(uploadOne));
};
