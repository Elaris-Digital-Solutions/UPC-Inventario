import { describe, expect, it } from 'vitest';

// IMPORTS RELATIVOS, no `@/lib/admin/filtros`: no hay vitest.config.ts, asi que
// Vitest corre por defecto y NO conoce el alias que declara tsconfig.json. Se
// midio en la Task 8 de la tanda 3A -- `typecheck` y `build` pasan en verde con
// el alias y solo `vitest run` se rompe --, y por eso el modulo probado y su
// prueba se escriben asi.
import {
  cruzarPersonal,
  filtrarYOrdenar,
  normalizar,
  particionarPorDia,
  pasaBusqueda,
  pasaFiltroEstado,
  pasaFiltroFechaReservas,
  type AlumnoParaCruce,
  type ReservaDelDia,
  type ReservaFiltrable,
  type StaffParaCruce,
} from './filtros';

// El instante fijo de todas las pruebas de fecha: 12 de agosto de 2026 a las
// 21:00 de Lima -- 02:00 UTC del dia 13 --. Elegido A PROPOSITO en esa hora y
// no a mediodia: es la franja en la que Lima y UTC estan en dias DISTINTOS, que
// es justo donde un filtro escrito sobre el instante crudo se rompe. Con un
// mediodia las dos zonas coinciden y la prueba pasaria igual estando mal.
const AHORA = new Date('2026-08-13T02:00:00Z');

// Una reserva de mentira con todos los campos que el filtro mira. Cada prueba
// pisa solo lo que le interesa.
function reserva(cambios: Partial<ReservaFiltrable> = {}): ReservaFiltrable {
  return {
    inicio: '2026-08-12T20:00:00Z',
    registro: '2026-08-10T14:00:00Z',
    estado: 'reserved',
    alumno: { nombre: 'Ana', apellido: 'Perez', email: 'alumno.a@upc.edu.pe' },
    producto: 'Camara Sony A7 III',
    categoria: 'Fotografia',
    unidad: 'CAM-001',
    activoFijo: 'UPC-100001',
    ...cambios,
  };
}

describe('normalizar', () => {
  it('quita las tildes y baja a minusculas', () => {
    expect(normalizar('Micrófono')).toBe('microfono');
    expect(normalizar('CÁMARA')).toBe('camara');
  });

  it('recorta los espacios de los extremos', () => {
    expect(normalizar('  laptop  ')).toBe('laptop');
  });

  it('deja la ene en paz, que NO es un diacritico suelto', () => {
    // `ñ` se descompone en `n` + tilde de ene con NFD, asi que un
    // `replace(/\p{Diacritic}/gu, '')` la convertiria en `n`. Eso NO es un
    // defecto para buscar -- quien teclea "diseno" quiere encontrar "diseño" --
    // y esta prueba fija ese comportamiento como decidido, no como accidente.
    expect(normalizar('Diseño')).toBe('diseno');
  });
});

describe('pasaBusqueda', () => {
  it('con la consulta vacia deja pasar todo', () => {
    expect(pasaBusqueda(reserva(), '')).toBe(true);
    expect(pasaBusqueda(reserva(), '   ')).toBe(true);
  });

  it('encuentra un dato SIN tilde buscando CON tilde', () => {
    // El caso que nombra el Step 3 del plan: el producto se llama "Microfono
    // Rode NTG4" -- sin tilde, y es del SEED local -- y quien busca escribe
    // "micrófono".
    const r = reserva({ producto: 'Microfono Rode NTG4' });
    expect(pasaBusqueda(r, 'micrófono')).toBe(true);
  });

  it('encuentra un dato CON tilde buscando SIN tilde', () => {
    // El sentido contrario, y es el que se olvida: normalizar solo la consulta
    // deja pasar esta prueba a medias. Los DOS lados se normalizan.
    const r = reserva({ producto: 'Micrófono Rode NTG4' });
    expect(pasaBusqueda(r, 'microfono')).toBe(true);
  });

  it('busca por los SEIS campos que pide F6', () => {
    const r = reserva();
    expect(pasaBusqueda(r, 'Ana Perez')).toBe(true); // solicitante
    expect(pasaBusqueda(r, 'alumno.a@upc')).toBe(true); // correo
    expect(pasaBusqueda(r, 'Sony')).toBe(true); // producto
    expect(pasaBusqueda(r, 'Fotografia')).toBe(true); // categoria
    expect(pasaBusqueda(r, 'CAM-001')).toBe(true); // codigo de unidad
    expect(pasaBusqueda(r, 'UPC-100001')).toBe(true); // activo fijo
  });

  it('no encuentra lo que no esta en ninguno de los seis', () => {
    expect(pasaBusqueda(reserva(), 'tripode')).toBe(false);
  });

  it('tolera el alumno nulo y los campos opcionales vacios', () => {
    // `alumno` llega `null` cuando RLS bloquea el embed -- medido en la T3A --,
    // y `categoria` y `activoFijo` son columnas nulables de verdad: 38 de las 92
    // unidades reales no tienen `asset_code`. Buscar no puede reventar por eso.
    const r = reserva({ alumno: null, categoria: null, activoFijo: null });
    expect(pasaBusqueda(r, 'Sony')).toBe(true);
    expect(pasaBusqueda(r, 'Ana')).toBe(false);
  });

  it('encuentra al alumno por el apellido aunque le falte el nombre', () => {
    // `nombre` y `apellido` son nulables por separado: la fila de `alumnos`
    // nace al PEDIR el magic link, antes de que nadie diga como se llama.
    const r = reserva({ alumno: { nombre: null, apellido: 'Perez', email: 'x@upc.edu.pe' } });
    expect(pasaBusqueda(r, 'Perez')).toBe(true);
  });
});

describe('pasaFiltroFechaReservas', () => {
  // Decision de Alejandro, 2026-08-12: RANGO CERRADO con ventana MOVIL. Con
  // suelo, al reves que el filtro del mostrador -- alli el techo sin suelo
  // existe para no esconder las candidatas a "No se retiro", y aca la tabla es
  // historica: sin suelo, "Hoy" arrastraria todo el pasado y no filtraria nada.
  it('"todas" no descarta nada, ni siquiera lo viejo', () => {
    expect(pasaFiltroFechaReservas('2020-01-01T15:00:00Z', AHORA, 'todas')).toBe(true);
  });

  it('"hoy" deja pasar lo de hoy en Lima', () => {
    // 2026-08-13T02:00Z son las 21:00 del 12 en Lima: MISMO dia civil que AHORA.
    expect(pasaFiltroFechaReservas('2026-08-13T02:00:00Z', AHORA, 'hoy')).toBe(true);
  });

  it('"hoy" descarta lo de ayer -- ESTE es el suelo', () => {
    expect(pasaFiltroFechaReservas('2026-08-11T15:00:00Z', AHORA, 'hoy')).toBe(false);
  });

  it('"hoy" descarta lo de manana', () => {
    expect(pasaFiltroFechaReservas('2026-08-13T15:00:00Z', AHORA, 'hoy')).toBe(false);
  });

  it('"tres_dias" cubre hoy y los dos siguientes, y nada mas', () => {
    expect(pasaFiltroFechaReservas('2026-08-12T15:00:00Z', AHORA, 'tres_dias')).toBe(true);
    expect(pasaFiltroFechaReservas('2026-08-14T15:00:00Z', AHORA, 'tres_dias')).toBe(true);
    expect(pasaFiltroFechaReservas('2026-08-15T15:00:00Z', AHORA, 'tres_dias')).toBe(false);
    expect(pasaFiltroFechaReservas('2026-08-11T15:00:00Z', AHORA, 'tres_dias')).toBe(false);
  });

  it('"semana" cubre hoy y los seis siguientes, movil y no de calendario', () => {
    // El 12 de agosto de 2026 es MIERCOLES. Una semana de calendario
    // (lunes a domingo) terminaria el domingo 16; esta termina el 18, porque
    // cuenta siete dias desde hoy sin mirar que dia de la semana es.
    expect(pasaFiltroFechaReservas('2026-08-18T15:00:00Z', AHORA, 'semana')).toBe(true);
    expect(pasaFiltroFechaReservas('2026-08-19T15:00:00Z', AHORA, 'semana')).toBe(false);
  });
});

describe('pasaFiltroEstado', () => {
  it('"todos" deja pasar cualquier estado', () => {
    expect(pasaFiltroEstado('cancelled', 'todos')).toBe(true);
    expect(pasaFiltroEstado('reserved', 'todos')).toBe(true);
  });

  it('un estado concreto deja pasar solo ese', () => {
    expect(pasaFiltroEstado('reserved', 'reserved')).toBe(true);
    expect(pasaFiltroEstado('active', 'reserved')).toBe(false);
  });
});

describe('filtrarYOrdenar', () => {
  const vieja = reserva({
    inicio: '2026-08-05T15:00:00Z',
    registro: '2026-08-01T15:00:00Z',
    estado: 'completed',
    producto: 'Tripode Manfrotto MT055',
    unidad: 'TRI-001',
  });
  const deHoy = reserva({
    inicio: '2026-08-12T20:00:00Z',
    registro: '2026-08-10T15:00:00Z',
    estado: 'reserved',
  });
  const futura = reserva({
    inicio: '2026-08-17T15:00:00Z',
    registro: '2026-08-12T18:00:00Z',
    estado: 'reserved',
    producto: 'Microfono Rode NTG4',
    unidad: 'MIC-002',
  });
  const todas = [vieja, deHoy, futura];

  const SIN_FILTRO = { busqueda: '', fecha: 'todas', estado: 'todos' } as const;

  it('sin ningun filtro devuelve todas, por inicio descendente', () => {
    const r = filtrarYOrdenar(todas, { ...SIN_FILTRO, orden: 'inicio_desc' }, AHORA);
    expect(r.map((x) => x.unidad)).toEqual(['MIC-002', 'CAM-001', 'TRI-001']);
  });

  it('ordena por inicio ascendente', () => {
    const r = filtrarYOrdenar(todas, { ...SIN_FILTRO, orden: 'inicio_asc' }, AHORA);
    expect(r.map((x) => x.unidad)).toEqual(['TRI-001', 'CAM-001', 'MIC-002']);
  });

  it('ordena por fecha de registro descendente, que NO es el mismo orden', () => {
    // Las tres se registraron en un orden distinto del de inicio: la futura se
    // registro la ultima. Sin esta diferencia, el tercer orden no se
    // distinguiria del primero y la prueba pasaria estando mal.
    const r = filtrarYOrdenar(todas, { ...SIN_FILTRO, orden: 'registro_desc' }, AHORA);
    expect(r.map((x) => x.unidad)).toEqual(['MIC-002', 'CAM-001', 'TRI-001']);
    expect(r.map((x) => x.registro)).toEqual([
      '2026-08-12T18:00:00Z',
      '2026-08-10T15:00:00Z',
      '2026-08-01T15:00:00Z',
    ]);
  });

  it('combina los tres filtros a la vez', () => {
    const r = filtrarYOrdenar(
      todas,
      { busqueda: 'micrófono', fecha: 'semana', estado: 'reserved', orden: 'inicio_desc' },
      AHORA,
    );
    expect(r).toHaveLength(1);
    expect(r[0].unidad).toBe('MIC-002');
  });

  it('no muta el array que recibe', () => {
    // `sort` ordena en el sitio, asi que sin una copia esta funcion reordenaria
    // el array del llamador -- y en React eso es mutar una prop.
    const original = [...todas];
    filtrarYOrdenar(todas, { ...SIN_FILTRO, orden: 'inicio_asc' }, AHORA);
    expect(todas).toEqual(original);
  });

  it('devuelve vacio cuando ningun filtro casa, sin reventar', () => {
    const r = filtrarYOrdenar(todas, { ...SIN_FILTRO, busqueda: 'zzz', orden: 'inicio_desc' }, AHORA);
    expect(r).toEqual([]);
  });
});

describe('particionarPorDia', () => {
  function reservaDelDia(cambios: Partial<ReservaDelDia> = {}): ReservaDelDia {
    return {
      id: 'r1',
      inicio: '2026-08-12T20:00:00Z',
      estado: 'reserved',
      ...cambios,
    };
  }

  it('separa las reservadas de las activas del mismo dia', () => {
    const reservada1 = reservaDelDia({ id: 'a' });
    const reservada2 = reservaDelDia({ id: 'b' });
    const activa = reservaDelDia({ id: 'c', estado: 'active' });

    const { reservadas, activas } = particionarPorDia(
      [reservada1, reservada2, activa],
      '2026-08-12',
    );

    expect(reservadas.map((r) => r.id)).toEqual(['a', 'b']);
    expect(activas.map((r) => r.id)).toEqual(['c']);
  });

  it('descarta lo que no es de ese dia', () => {
    const deOtroDia = reservaDelDia({ id: 'x', inicio: '2026-08-13T20:00:00Z' });
    const { reservadas, activas } = particionarPorDia([deOtroDia], '2026-08-12');
    expect(reservadas).toEqual([]);
    expect(activas).toEqual([]);
  });

  it('ignora los otros cuatro estados -- reservasVivas() solo trae reserved y active, pero esta funcion no confia en eso', () => {
    const completada = reservaDelDia({ id: 'y', estado: 'completed' });
    const { reservadas, activas } = particionarPorDia([completada], '2026-08-12');
    expect(reservadas).toEqual([]);
    expect(activas).toEqual([]);
  });

  it('la FRONTERA de medianoche: un inicio que en UTC cae al dia siguiente sigue siendo HOY en Lima', () => {
    // 2026-08-13T02:00:00Z son las 21:00 del 12 de agosto en Lima -- el mismo
    // instante que AHORA en las pruebas de pasaFiltroFechaReservas mas arriba
    // en este archivo. Un rango UTC mal escrito
    // -[2026-08-12T00:00:00Z, 2026-08-13T00:00:00Z)- dejaria esta reserva
    // fuera del dia 12; fechaEnLima() la deja dentro porque el dia CIVIL en
    // Lima todavia es el 12. Es el caso que un rango a mano pierde.
    const enLaFrontera = reservaDelDia({ id: 'frontera', inicio: '2026-08-13T02:00:00Z' });
    const { reservadas } = particionarPorDia([enLaFrontera], '2026-08-12');
    expect(reservadas.map((r) => r.id)).toEqual(['frontera']);
  });
});

describe('cruzarPersonal', () => {
  function staffCrudo(cambios: Partial<StaffParaCruce> = {}): StaffParaCruce {
    return {
      userId: 'u1',
      rol: 'operator',
      activo: true,
      registro: '2026-08-10T14:00:00Z',
      ...cambios,
    };
  }

  function alumnoCrudo(cambios: Partial<AlumnoParaCruce> = {}): AlumnoParaCruce {
    return {
      authUserId: 'u1',
      email: 'ana@upc.edu.pe',
      nombre: 'Ana',
      apellido: 'Perez',
      ...cambios,
    };
  }

  it('cruza un miembro con su fila de alumnos', () => {
    const r = cruzarPersonal([staffCrudo()], [alumnoCrudo()]);
    expect(r).toEqual([
      {
        userId: 'u1',
        rol: 'operator',
        activo: true,
        registro: '2026-08-10T14:00:00Z',
        alumno: { email: 'ana@upc.edu.pe', nombre: 'Ana', apellido: 'Perez' },
      },
    ]);
  });

  it('deja `alumno` en null cuando no hay fila en alumnos para ese user_id', () => {
    // El caso que importa de verdad: staff_members.user_id referencia
    // auth.users, no alumnos, y el trigger de aprovisionamiento solo crea la
    // fila de alumnos para correos @upc.edu.pe. El cruce no puede perder de
    // vista a esta persona solo porque no tenga fila en alumnos.
    const r = cruzarPersonal([staffCrudo({ userId: 'u2' })], []);
    expect(r).toEqual([
      {
        userId: 'u2',
        rol: 'operator',
        activo: true,
        registro: '2026-08-10T14:00:00Z',
        alumno: null,
      },
    ]);
  });

  it('con la lista de personal vacia devuelve vacio, sin reventar', () => {
    expect(cruzarPersonal([], [])).toEqual([]);
    // Ni siquiera importa si hay alumnos sin nadie con quien cruzarlos.
    expect(cruzarPersonal([], [alumnoCrudo()])).toEqual([]);
  });

  it('el orden que entra es el orden que sale', () => {
    const a = staffCrudo({ userId: 'a', rol: 'admin' });
    const b = staffCrudo({ userId: 'b', rol: 'operator' });
    const c = staffCrudo({ userId: 'c', rol: 'operator' });

    const r = cruzarPersonal([c, a, b], []);
    expect(r.map((m) => m.userId)).toEqual(['c', 'a', 'b']);
  });
});
