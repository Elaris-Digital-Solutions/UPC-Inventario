import { describe, expect, it } from 'vitest';

// Import RELATIVO y no `@/lib/cloudinary/firma`: Vitest no conoce el alias que
// declara tsconfig.json. Medido en la Task 8 de la tanda 3A.
import { cadenaAFirmar, firmar } from './firma';

describe('cadenaAFirmar', () => {
  it('ordena alfabeticamente y une con &', () => {
    expect(cadenaAFirmar({ timestamp: 1, folder: 'upc', eager: 'x' })).toBe(
      'eager=x&folder=upc&timestamp=1',
    );
  });

  it('excluye file, api_key y resource_type, que Cloudinary no firma', () => {
    expect(cadenaAFirmar({ timestamp: 1, file: 'a', api_key: 'b', resource_type: 'image' })).toBe(
      'timestamp=1',
    );
  });

  it('descarta los vacios: un parametro sin valor no se manda ni se firma', () => {
    expect(cadenaAFirmar({ timestamp: 1, folder: '' })).toBe('timestamp=1');
  });

  it('el orden de las claves de entrada no cambia el resultado', () => {
    const a = cadenaAFirmar({ folder: 'upc', timestamp: 1 });
    const b = cadenaAFirmar({ timestamp: 1, folder: 'upc' });
    expect(a).toBe(b);
  });
});

describe('firmar', () => {
  // VECTOR FIJO, calculado el 2026-08-12 con `crypto.createHash('sha1')` sobre
  // la cadena 'public_id=sample&timestamp=1315060510' concatenada con el
  // secreto 'abcd'. NO es "el ejemplo de la documentacion de Cloudinary": los
  // parametros salen de alli, pero el secreto y por tanto el hash son de esta
  // medicion. Decirlo importa, porque una fuente inventada sobre un hecho
  // cierto es el genero de error que este proyecto persigue desde la T2B.
  //
  // Vale como regresion de verdad: si alguien cambia el algoritmo, el orden de
  // concatenacion o mete un separador entre la cadena y el secreto, este
  // numero cambia y la prueba lo dice. Un `/^[0-9a-f]{40}$/` no lo diria.
  it('coincide con el vector fijo', async () => {
    const f = await firmar({ public_id: 'sample', timestamp: 1315060510 }, 'abcd');
    expect(f).toBe('c3470533147774275dd37996cc4d0e68fd03cd4f');
  });

  it('el secreto va PEGADO al final, sin separador', async () => {
    // Si hubiera un '&' o cualquier separador entre la cadena y el secreto, el
    // hash seria otro. Esta es la comprobacion que fija ese detalle.
    const f = await firmar({ timestamp: 1 }, 'uno');
    expect(f).toBe('12362ca93f620e91a30b0d9b7cde97cb6f486ccd');
  });

  it('cambia si cambia el secreto', async () => {
    const a = await firmar({ timestamp: 1 }, 'uno');
    const b = await firmar({ timestamp: 1 }, 'dos');
    expect(a).not.toBe(b);
    expect(b).toBe('471289c418ae7e5d7868f23f839a73b1a47280eb');
  });

  it('es un sha1 en hexadecimal de 40 caracteres', async () => {
    const f = await firmar({ timestamp: 1 }, 'uno');
    expect(f).toMatch(/^[0-9a-f]{40}$/);
  });
});
