# UPC Inventario

Aplicación web de inventario construida con Vite, React, TypeScript, shadcn-ui y Tailwind CSS.

## Requisitos
  
  
- Node.js
- npm

## Desarrollo local

```sh
npm install
npm run dev
```

## Variables de entorno

Configura estas variables para autenticación con Supabase:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AUTH_REDIRECT_URL` (opcional, recomendado en producción)

Ejemplo para Netlify:

```sh
VITE_AUTH_REDIRECT_URL=https://upc-inventario.netlify.app
```

Si esta variable no está definida, la app usa `window.location.origin`.

## Scripts disponibles

- `npm run dev`: inicia el servidor de desarrollo.
- `npm run build`: genera build de producción.
- `npm run preview`: previsualiza la build.
- `npm run lint`: ejecuta ESLint.
- `npm run test`: ejecuta pruebas con Vitest.
