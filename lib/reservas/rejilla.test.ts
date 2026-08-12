import { describe, expect, it } from 'vitest';

// Import RELATIVO, no `@/lib/reservas/rejilla`. El proyecto no tiene
// `vitest.config.ts`, asi que Vitest corre con los valores por defecto y NO
// conoce el alias `@/*` que declara `tsconfig.json`. Escribirlo con alias
// compilaria -`tsc` si lo resuelve- y fallaria solo al ejecutar, que es
// exactamente la clase de fallo que esta tanda tiene que evitar.
//
// Se deja asi a proposito en vez de anadir configuracion: un archivo de
// configuracion nuevo es superficie que mantener, y un test junto a su codigo
// no necesita alias para encontrarlo.
import { diasDeLaVentana, duracionesPosibles, fechaEnLima, hoyEnLima, sumarDias } from './rejilla';

describe('fechaEnLima', () => {
  // Lima es UTC-5 y no cambia de hora. Estos tres instantes rodean la
  // medianoche local, que es donde un calculo hecho en UTC se equivoca de dia
  // -y es el fallo M-7 reapareciendo en el cliente-.
  it('un instante UTC ya del dia siguiente sigue siendo HOY en Lima', () => {
    expect(fechaEnLima(new Date('2026-08-11T02:00:00Z'))).toBe('2026-08-10');
  });

  it('un minuto antes de la medianoche local todavia es el dia que acaba', () => {
    expect(fechaEnLima(new Date('2026-08-11T04:59:00Z'))).toBe('2026-08-10');
  });

  it('a la medianoche local en punto ya es el dia nuevo', () => {
    expect(fechaEnLima(new Date('2026-08-11T05:00:00Z'))).toBe('2026-08-11');
  });

  it('hoyEnLima es la misma traduccion, sin leer el reloj del sistema', () => {
    const instante = new Date('2026-08-11T02:00:00Z');
    expect(hoyEnLima(instante)).toBe(fechaEnLima(instante));
  });
});

describe('duracionesPosibles', () => {
  // Los datos REALES de produccion, medidos el 2026-08-10: slot_minutes 30,
  // min_duration_minutes 30 y max_duration_hours 4 en los 34 productos.
  it('con los datos reales da ocho opciones, de 30 a 240', () => {
    expect(duracionesPosibles(4, 30, 30)).toEqual([30, 60, 90, 120, 150, 180, 210, 240]);
  });

  // El Laptop del stack local vale 8 horas. Produccion es uniforme en 4, asi
  // que este caso solo existe en local -y es justo por eso que vale: si
  // alguien escribiera "4 horas" a mano, produccion no lo delataria nunca.
  it('con el Laptop del seed local -8 horas- da dieciseis', () => {
    const duraciones = duracionesPosibles(8, 30, 30);
    expect(duraciones).toHaveLength(16);
    expect(duraciones.at(-1)).toBe(480);
  });

  // D-19. 45 minutos es el caso que dio nombre a la decision: cumple el minimo
  // y NO es multiplo del bloque, asi que `create_reservation` lo rechaza.
  // Ofrecerlo seria ofrecer algo que el motor no acepta.
  it('nunca ofrece una duracion que no sea multiplo del bloque', () => {
    const duraciones = duracionesPosibles(4, 30, 30);
    expect(duraciones).not.toContain(45);
    for (const d of duraciones) {
      expect(d % 30).toBe(0);
    }
  });

  it('nunca pasa del maximo del producto', () => {
    for (const d of duracionesPosibles(4, 30, 30)) {
      expect(d).toBeLessThanOrEqual(240);
    }
  });

  // Si algun dia `min_duration_minutes` bajara por debajo de un bloque, la
  // primera opcion sigue siendo un bloque entero y no el minimo crudo.
  it('redondea el minimo hacia arriba hasta el primer bloque valido', () => {
    expect(duracionesPosibles(1, 30, 20)[0]).toBe(30);
  });
});

describe('sumarDias', () => {
  it('cruza el fin de mes', () => {
    expect(sumarDias('2026-08-31', 1)).toBe('2026-09-01');
  });

  it('cruza el fin de ano', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('acierta en un ano bisiesto', () => {
    expect(sumarDias('2024-02-28', 1)).toBe('2024-02-29');
  });

  it('sumar cero no mueve nada', () => {
    expect(sumarDias('2026-08-10', 0)).toBe('2026-08-10');
  });
});

describe('diasDeLaVentana', () => {
  // Estas cuatro pruebas se escribieron ANTES que la funcion y se vieron
  // fallar las cuatro. Es la disciplina de la Fase 1: una asercion que nunca
  // se ha visto fallar no prueba que el arnes este corriendo, y ese rojo fue
  // la primera evidencia de que Vitest ejecuta este archivo de verdad.
  //
  // Estan escritas para NO forzar la decision de cuantos dias son: valen igual
  // con siete que con ocho. La decision, que fue ocho, la fija su propia
  // prueba mas abajo.
  const ahora = new Date('2026-08-10T19:00:00Z'); // 14:00 en Lima

  it('empieza por hoy, en hora de Lima', () => {
    expect(diasDeLaVentana(ahora, 7)[0]).toBe('2026-08-10');
  });

  it('los dias son consecutivos y sin huecos', () => {
    const dias = diasDeLaVentana(ahora, 7);
    for (let i = 1; i < dias.length; i++) {
      expect(dias[i]).toBe(sumarDias(dias[i - 1], 1));
    }
  });

  it('nunca ofrece mas alla de la ventana que acepta la RPC', () => {
    const dias = diasDeLaVentana(ahora, 7);
    // La regla de §11.2: la rejilla puede ser mas estricta, nunca mas laxa.
    // El ultimo dia jamas puede pasar de hoy + booking_window_days.
    expect(dias.at(-1)! <= sumarDias('2026-08-10', 7)).toBe(true);
  });

  it('respeta la frontera de medianoche: a las 20:00 de Lima sigue siendo hoy', () => {
    // 2026-08-11T01:00:00Z son las 20:00 del dia 10 en Lima. Si la funcion
    // resolviera el dia en UTC, empezaria por el 11 y le robaria un dia entero
    // al alumno.
    expect(diasDeLaVentana(new Date('2026-08-11T01:00:00Z'), 7)[0]).toBe('2026-08-10');
  });

  // La decision del 2026-08-10, con su prueba propia para que deje de vivir
  // solo en un comentario. Se ofrecen `bookingWindowDays + 1` dias porque la
  // RPC compara instantes: a las 14:00 del 10, acepta hasta las 14:00 del 17,
  // asi que el 17 tiene franjas reservables y esconderlo seria mas estricto de
  // lo necesario.
  //
  // Si alguien cambia esto a siete dias, esta prueba se pone roja y le obliga
  // a leer el porque antes de decidir lo contrario. Ese es todo su trabajo.
  it('ofrece OCHO dias con la ventana en 7, y el ultimo es el que la RPC acepta a medias', () => {
    const dias = diasDeLaVentana(ahora, 7);
    expect(dias).toHaveLength(8);
    expect(dias.at(-1)).toBe('2026-08-17');
  });

  it('el ultimo dia NO se recorta aqui: de eso ya se encarga available_slots', () => {
    // A las 23:00 de Lima del dia 10 la RPC sigue aceptando hasta las 23:00
    // del 17, asi que la lista es la misma que a las 14:00. Lo que cambia es
    // cuantas franjas trae ese dia, y eso lo decide el motor, no el cliente.
    const tarde = new Date('2026-08-11T04:00:00Z'); // 23:00 del dia 10 en Lima
    expect(diasDeLaVentana(tarde, 7)).toEqual(diasDeLaVentana(ahora, 7));
  });
});
