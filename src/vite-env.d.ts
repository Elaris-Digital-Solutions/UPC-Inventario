/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SUPABASE_URL: string;
	readonly VITE_SUPABASE_ANON_KEY: string;
	readonly VITE_AUTH_REDIRECT_URL?: string;
	readonly VITE_ADMIN_EMAILS?: string;
	readonly VITE_CLOUDINARY_CLOUD_NAME?: string;
	readonly VITE_CLOUDINARY_UPLOAD_PRESET?: string;
	readonly VITE_CLOUDINARY_FOLDER?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
