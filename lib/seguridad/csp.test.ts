import { describe, expect, it } from 'vitest';

// Import RELATIVO y no `@/lib/seguridad/csp`: el proyecto no tiene
// `vitest.config.ts` y Vitest no conoce el alias `@/*` que declara
// tsconfig.json. Misma correccion que ya aplican ajustes.test.ts y
// filtro.test.ts.
import { construirCSP } from './csp';

const NONCE = 'abc123';
const URL_SUPABASE_LOCAL = 'http://127.0.0.1:54321';
const URL_SUPABASE_PROD = 'https://zqfkzgdyeqxzgzpxgadi.supabase.co';

describe('construirCSP', () => {
  it('en desarrollo NO incluye upgrade-insecure-requests', () => {
    const csp = construirCSP({ nonce: NONCE, esDesarrollo: true, urlSupabase: URL_SUPABASE_LOCAL });
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('en produccion SI incluye upgrade-insecure-requests, y va al final', () => {
    const csp = construirCSP({ nonce: NONCE, esDesarrollo: false, urlSupabase: URL_SUPABASE_PROD });
    expect(csp).toContain('upgrade-insecure-requests');
    expect(csp.endsWith('upgrade-insecure-requests')).toBe(true);
  });

  it('connect-src lleva la URL local que se le paso, en desarrollo', () => {
    const csp = construirCSP({ nonce: NONCE, esDesarrollo: true, urlSupabase: URL_SUPABASE_LOCAL });
    expect(csp).toContain(`connect-src 'self' ${URL_SUPABASE_LOCAL} https://api.cloudinary.com`);
  });

  it('connect-src lleva la URL de produccion que se le paso, en produccion', () => {
    const csp = construirCSP({ nonce: NONCE, esDesarrollo: false, urlSupabase: URL_SUPABASE_PROD });
    expect(csp).toContain(`connect-src 'self' ${URL_SUPABASE_PROD} https://api.cloudinary.com`);
  });

  it('connect-src lleva https://api.cloudinary.com en los dos modos', () => {
    const dev = construirCSP({ nonce: NONCE, esDesarrollo: true, urlSupabase: URL_SUPABASE_LOCAL });
    const prod = construirCSP({ nonce: NONCE, esDesarrollo: false, urlSupabase: URL_SUPABASE_PROD });
    expect(dev).toContain('https://api.cloudinary.com');
    expect(prod).toContain('https://api.cloudinary.com');
  });

  it('en desarrollo script-src lleva unsafe-eval', () => {
    const csp = construirCSP({ nonce: NONCE, esDesarrollo: true, urlSupabase: URL_SUPABASE_LOCAL });
    expect(csp).toContain(`script-src 'self' 'nonce-${NONCE}' 'strict-dynamic' 'unsafe-eval'`);
  });

  it('en produccion script-src NO lleva unsafe-eval', () => {
    const csp = construirCSP({ nonce: NONCE, esDesarrollo: false, urlSupabase: URL_SUPABASE_PROD });
    expect(csp).not.toContain('unsafe-eval');
  });

  it('en desarrollo style-src lleva unsafe-inline y no lleva el nonce', () => {
    const csp = construirCSP({ nonce: NONCE, esDesarrollo: true, urlSupabase: URL_SUPABASE_LOCAL });
    expect(csp).toContain(`style-src 'self' 'unsafe-inline'`);
    expect(csp).not.toContain(`style-src 'self' 'nonce-${NONCE}'`);
  });

  it('en produccion style-src lleva el nonce y no lleva unsafe-inline', () => {
    const csp = construirCSP({ nonce: NONCE, esDesarrollo: false, urlSupabase: URL_SUPABASE_PROD });
    // Acotado a la directiva style-src (la de elementos), no a la cadena
    // entera: desde que existe style-src-attr, 'unsafe-inline' SI aparece en
    // la cadena completa, y eso es correcto. El match es por 'style-src '
    // con espacio final para no atrapar tambien a 'style-src-attr '.
    const directivaStyleSrc = csp.split('; ').find((d) => d.startsWith('style-src '));
    expect(directivaStyleSrc).toBe(`style-src 'self' 'nonce-${NONCE}'`);
    expect(directivaStyleSrc).not.toContain('unsafe-inline');
  });

  it('style-src-attr unsafe-inline aparece en desarrollo y en produccion', () => {
    const dev = construirCSP({ nonce: NONCE, esDesarrollo: true, urlSupabase: URL_SUPABASE_LOCAL });
    const prod = construirCSP({ nonce: NONCE, esDesarrollo: false, urlSupabase: URL_SUPABASE_PROD });
    expect(dev).toContain(`style-src-attr 'unsafe-inline'`);
    expect(prod).toContain(`style-src-attr 'unsafe-inline'`);
  });

  it('el nonce aparece en script-src', () => {
    const csp = construirCSP({ nonce: NONCE, esDesarrollo: false, urlSupabase: URL_SUPABASE_PROD });
    expect(csp).toContain(`script-src 'self' 'nonce-${NONCE}' 'strict-dynamic'`);
  });

  it('object-src none y frame-ancestors none estan en desarrollo', () => {
    const csp = construirCSP({ nonce: NONCE, esDesarrollo: true, urlSupabase: URL_SUPABASE_LOCAL });
    expect(csp).toContain(`object-src 'none'`);
    expect(csp).toContain(`frame-ancestors 'none'`);
  });

  it('object-src none y frame-ancestors none estan en produccion', () => {
    const csp = construirCSP({ nonce: NONCE, esDesarrollo: false, urlSupabase: URL_SUPABASE_PROD });
    expect(csp).toContain(`object-src 'none'`);
    expect(csp).toContain(`frame-ancestors 'none'`);
  });

  it('dos nonces distintos producen cadenas distintas', () => {
    const csp1 = construirCSP({ nonce: 'nonce-uno', esDesarrollo: false, urlSupabase: URL_SUPABASE_PROD });
    const csp2 = construirCSP({ nonce: 'nonce-dos', esDesarrollo: false, urlSupabase: URL_SUPABASE_PROD });
    expect(csp1).not.toBe(csp2);
  });
});
