import { describe, expect, it } from 'vitest';

// Import RELATIVO, no `@/lib/imagenes/principal`. El proyecto no tiene
// `vitest.config.ts`, asi que Vitest corre con los valores por defecto y NO
// conoce el alias `@/*` que declara `tsconfig.json`. Misma correccion que ya
// aplican los otros diez archivos de prueba.
import { imagenPrincipal, type ImagenElegible } from './principal';

// Constructor de filas para no repetir las tres columnas en cada caso. La URL
// se DERIVA del nombre para que cada asercion diga cual gano y no solo que
// gano alguna: `expect(...).toBe('/b.jpg')` senala una fila concreta.
function img(nombre: string, is_main: boolean, sort_order: number): ImagenElegible {
  return { secure_url: `/${nombre}.jpg`, is_main, sort_order };
}

describe('imagenPrincipal', () => {
  it('sin ninguna imagen devuelve null', () => {
    expect(imagenPrincipal([])).toBeNull();
  });

  it('con una sola imagen marcada como principal devuelve esa', () => {
    expect(imagenPrincipal([img('a', true, 0)])).toBe('/a.jpg');
  });

  // El caso de PRODUCCION, y se dice que lo es: medido el 2026-08-19, los 34
  // productos tienen exactamente una imagen y las 34 con `is_main = true`.
  it('con una sola imagen SIN marcar la devuelve igual, que es no dejar al producto sin foto', () => {
    expect(imagenPrincipal([img('a', false, 7)])).toBe('/a.jpg');
  });

  // LA RAMA QUE PRODUCCION NO EJERCITA NUNCA. Existe esta prueba porque es el
  // unico sitio donde ese codigo se ejecuta: en el proyecto real no hay ni un
  // producto con dos imagenes, asi que mirar una pantalla no la cubriria
  // jamas. Es el argumento de por que la funcion se extrajo a un modulo
  // probable en vez de copiarse a cada capa.
  it('sin ninguna principal gana la de menor sort_order', () => {
    const imagenes = [img('c', false, 9), img('a', false, 1), img('b', false, 5)];
    expect(imagenPrincipal(imagenes)).toBe('/a.jpg');
  });

  // El par que hace que la prueba anterior signifique algo: si `is_main` no
  // decidiera, este caso devolveria '/a.jpg' y el anterior tambien, y las dos
  // pasarian con una funcion que solo ordenara por `sort_order`. Aqui la
  // principal es la de sort_order MAS ALTO a proposito.
  it('is_main gana aunque no sea la de menor sort_order', () => {
    const imagenes = [img('a', false, 0), img('b', true, 99)];
    expect(imagenPrincipal(imagenes)).toBe('/b.jpg');
  });

  // Y el simetrico, para que ninguna de las dos reglas se pueda quitar sin que
  // falle algo: con la principal TAMBIEN en el primer puesto, una funcion que
  // ignorara `is_main` seguiria pasando. Por eso el caso de arriba lleva el 99.
  it('con dos principales devuelve la primera que encuentra, sin ordenar', () => {
    const imagenes = [img('a', true, 5), img('b', true, 1)];
    expect(imagenPrincipal(imagenes)).toBe('/a.jpg');
  });

  // EMPATE EN sort_order: se afirma que devuelve UNA DE LAS DOS, no CUAL. El
  // desempate no esta definido por la funcion -depende de la estabilidad de
  // `Array.sort`, que es un detalle del motor y no una decision de este
  // proyecto-, asi que fijar cual seria atar la prueba a algo que nadie
  // prometio. Afirmar de menos aqui es lo correcto; afirmar de mas seria una
  // prueba que falla el dia que cambie algo que no nos importa.
  it('con sort_order empatado devuelve una de las dos, sin prometer cual', () => {
    const imagenes = [img('a', false, 3), img('b', false, 3)];
    expect(['/a.jpg', '/b.jpg']).toContain(imagenPrincipal(imagenes));
  });

  // No ordena EN SITIO. Si mutara el array, la galeria de administracion
  // -que pinta sus botones de subir y bajar leyendo `sort_order` en el orden
  // recibido- veria las imagenes reordenadas sin que nadie las moviera.
  it('no muta el array que recibe', () => {
    const imagenes = [img('c', false, 9), img('a', false, 1)];
    const antes = imagenes.map((i) => i.secure_url);

    imagenPrincipal(imagenes);

    expect(imagenes.map((i) => i.secure_url)).toEqual(antes);
  });
});
