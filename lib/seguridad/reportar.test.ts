import { afterEach, describe, expect, it, vi } from 'vitest';

// EL MOCK VA ANTES DEL IMPORT, y `vi.mock` se iza por encima igualmente.
//
// NO ES SOLO PARA AISLAR: es por TIEMPO, medido. Con el SDK real cargado, esta
// bateria pasa de 2,3 s a 27 s -- 25 segundos que paga cada `npm test` y cada
// corrida del CI, por importar un paquete cuyo unico papel aqui es no ser
// llamado de verdad.
//
// Y de paso permite AFIRMAR la llamada, que con el SDK real no se podria sin
// levantar un servidor de ingesta: la tercera prueba comprueba que el tag
// `correlacion` lleva el MISMO id que ve el usuario, que es la propiedad
// entera de H-3 unida a la de H-4.
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

import * as Sentry from '@sentry/nextjs';

// Import RELATIVO y no `@/`: bajo Vitest el alias no resuelve.
// Ver MIGRATION_DOCS/COMPORTAMIENTO_MEDIDO.md §5.
import { reportar } from './reportar';

// LO QUE ESTAS PRUEBAS VIGILAN es la propiedad entera de H-3, y son DOS
// afirmaciones que hay que probar por separado porque pueden romperse solas:
//
//   1. el crudo NO sale hacia el usuario, y
//   2. el crudo SI queda en el log, atado por el mismo id.
//
// Con solo (1), un `reportar()` que devolviera un generico y tirara el error a
// la basura pasaria en verde -- y seria el retroceso que la cabecera de
// reportar.ts advierte: indiagnosticable. Con solo (2) pasaria uno que loguea y
// ademas filtra. Hacen falta las dos.

// Un mensaje de PostgREST realista, con lo que de verdad revelan: nombre de
// tabla, de columna y de constraint.
const CRUDO =
  'new row for relation "alumnos" violates check constraint "alumnos_nombre_largo"';

function espiarConsola() {
  return vi.spyOn(console, 'error').mockImplementation(() => {});
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('reportar', () => {
  it('NO devuelve al usuario nada del mensaje del motor', () => {
    espiarConsola();

    const mensaje = reportar('cambiarRolPersonal', { message: CRUDO });

    // Las cuatro palabras que no deben viajar al navegador, una por una: si
    // alguien "simplifica" reportar() devolviendo el crudo, esto lo caza.
    expect(mensaje).not.toContain('alumnos');
    expect(mensaje).not.toContain('constraint');
    expect(mensaje).not.toContain('alumnos_nombre_largo');
    expect(mensaje).not.toContain(CRUDO);
  });

  it('el crudo ENTERO queda en el log, bajo el mismo id que ve el usuario', () => {
    const espia = espiarConsola();

    const mensaje = reportar('guardarEncuesta', { message: CRUDO });

    // El id se extrae de lo que vio el usuario y se busca en lo que se logueo.
    // Comparar las dos puntas es lo unico que prueba que estan ATADAS: dos ids
    // generados por separado darian verde en dos aserciones sueltas.
    const id = mensaje.match(/([0-9a-f]{8})$/)?.[1];
    expect(id).toBeDefined();

    expect(espia).toHaveBeenCalledTimes(1);
    const logueado = espia.mock.calls[0][0] as string;
    expect(logueado).toContain(`[${id}]`);
    expect(logueado).toContain(CRUDO);
    expect(logueado).toContain('guardarEncuesta');
  });

  it('dos llamadas dan ids distintos', () => {
    espiarConsola();

    // Si el id fuera constante, dos fallos de dos alumnos distintos se
    // confundirian en el log y el id dejaria de servir para lo unico que sirve.
    const a = reportar('registrarImagen', { message: CRUDO });
    const b = reportar('registrarImagen', { message: CRUDO });

    expect(a).not.toBe(b);
  });

  it('Sentry recibe el error con el MISMO id que vio el usuario como tag', () => {
    espiarConsola();
    vi.mocked(Sentry.captureException).mockClear();

    const error = { message: CRUDO };
    const mensaje = reportar('inhabilitarDia', error);
    const id = mensaje.match(/([0-9a-f]{8})$/)?.[1];

    // Las TRES puntas atadas: lo que vio el usuario, lo que fue al log y lo que
    // fue a Sentry llevan el mismo id. Sin esta prueba, un id distinto en cada
    // destino daria verde en todo lo demas y volveria el codigo de referencia
    // inservible justo cuando alguien lo dicte por telefono.
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { correlacion: id, contexto: 'inhabilitarDia' },
    });
  });
});
