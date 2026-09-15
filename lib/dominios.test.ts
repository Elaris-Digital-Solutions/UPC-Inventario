import { describe, expect, it } from 'vitest';

// Import RELATIVO y no `@/`: bajo Vitest el alias no resuelve.
// Ver MIGRATION_DOCS/COMPORTAMIENTO_MEDIDO.md §5.
import { redireccionPorDominio } from './dominios';

describe('redireccionPorDominio', () => {
  it('en ccnode.net, lo que pide sesion se va a dispositivos', () => {
    expect(redireccionPorDominio('ccnode.net', '/catalogo', '')).toBe(
      'https://dispositivos.ccnode.net/catalogo',
    );
    expect(redireccionPorDominio('ccnode.net', '/login', '')).toBe(
      'https://dispositivos.ccnode.net/login',
    );
  });

  // El token_hash es de un solo uso: si el salto lo pierde, el canje falla sin
  // error y el alumno cae en /login.
  it('conserva la query entera', () => {
    expect(
      redireccionPorDominio('ccnode.net', '/auth/confirm', '?token_hash=abc&type=email'),
    ).toBe('https://dispositivos.ccnode.net/auth/confirm?token_hash=abc&type=email');
  });

  it('la portada, el FAQ y el manifest se sirven en ccnode.net', () => {
    expect(redireccionPorDominio('ccnode.net', '/', '')).toBeNull();
    expect(redireccionPorDominio('ccnode.net', '/faq', '')).toBeNull();
    expect(redireccionPorDominio('ccnode.net', '/manifest.webmanifest', '')).toBeNull();
  });

  // El control negativo: si RUTAS_PORTADA casara por prefijo, este caso se
  // quedaria en la portada.
  it('las rutas de la portada no casan por prefijo', () => {
    expect(redireccionPorDominio('ccnode.net', '/faq-falsa', '')).toBe(
      'https://dispositivos.ccnode.net/faq-falsa',
    );
  });

  it('www.ccnode.net se trata igual que ccnode.net', () => {
    expect(redireccionPorDominio('www.ccnode.net', '/mi-panel', '')).toBe(
      'https://dispositivos.ccnode.net/mi-panel',
    );
  });

  // La cabecera Host la escribe el navegador: puede traer puerto y mayusculas.
  it('ignora el puerto y las mayusculas del host', () => {
    expect(redireccionPorDominio('CCNode.net:443', '/catalogo', '')).toBe(
      'https://dispositivos.ccnode.net/catalogo',
    );
  });

  it('cualquier otro host se sirve tal cual, sin redirigir', () => {
    expect(redireccionPorDominio('dispositivos.ccnode.net', '/catalogo', '')).toBeNull();
    expect(redireccionPorDominio('dispositivos.ccnode.net', '/', '')).toBeNull();
    expect(redireccionPorDominio('127.0.0.1:3000', '/catalogo', '')).toBeNull();
    expect(redireccionPorDominio('upc-inventario.netlify.app', '/admin/inventario', '')).toBeNull();
  });

  // Un subdominio que solo TERMINA en ccnode.net no es la portada.
  it('no confunde un host que solo termina en ccnode.net', () => {
    expect(redireccionPorDominio('otroccnode.net', '/catalogo', '')).toBeNull();
  });

  it('sin cabecera host no redirige', () => {
    expect(redireccionPorDominio(null, '/catalogo', '')).toBeNull();
  });
});
