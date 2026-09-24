import { describe, expect, it } from 'vitest';

// Import RELATIVO y no `@/`: bajo Vitest el alias no resuelve.
// Ver MIGRATION_DOCS/COMPORTAMIENTO_MEDIDO.md §5.
import { destinoInterno } from './volver';

const BARRA_INVERTIDA = String.fromCharCode(92);

describe('destinoInterno', () => {
  // El control positivo: sin el, una funcion que devolviera SIEMPRE null
  // pasaria todas las de abajo.
  it('deja pasar la ruta que arma la puerta de reservar, con su query', () => {
    expect(destinoInterno('/catalogo/abc/reservar?sede=xyz')).toBe(
      '/catalogo/abc/reservar?sede=xyz',
    );
  });

  // Sin volver se cae al reparto de destino(): '' NO es la portada.
  it('sin valor devuelve null', () => {
    expect(destinoInterno(null)).toBeNull();
    expect(destinoInterno('')).toBeNull();
  });

  it('rechaza lo absoluto y lo que no es http', () => {
    expect(destinoInterno('https://evil.example/x')).toBeNull();
    expect(destinoInterno('//evil.example')).toBeNull();
    expect(destinoInterno('javascript:alert(1)')).toBeNull();
  });

  // H-11: los dos pasaban el filtro viejo -empieza por "/" y no por "//"-,
  // porque el navegador los reescribe a "//evil.example" DESPUES de filtrar.
  it('rechaza la barra invertida y el tabulador', () => {
    expect(destinoInterno('/' + BARRA_INVERTIDA + 'evil.example')).toBeNull();
    expect(destinoInterno('/\t/evil.example')).toBeNull();
  });

  // El que tumba la correccion obvia: su ORIGEN es el propio, y su ruta
  // normalizada es "//evil.example". Comparar solo el origen no basta.
  it('rechaza los segmentos de punto que normalizan a //', () => {
    expect(destinoInterno('/.//evil.example')).toBeNull();
    expect(destinoInterno('/..//evil.example')).toBeNull();
  });
});
