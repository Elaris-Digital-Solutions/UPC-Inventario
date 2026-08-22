// Logica PURA de la configuracion de reserva. Q-14 vive aca.
//
// ESTE ARCHIVO NO IMPORTA NADA, Y NO PUEDE HACERLO. Es una restriccion real y
// no una preferencia de estilo: un test lo carga, y Vitest no conoce el alias
// `@/` que declara tsconfig.json -no hay vitest.config.ts, medido en la Task 8
// de la T3A-. En cuanto este modulo importara `@/lib/supabase/server`, el test
// se rompe... y `typecheck` y `build` seguirian en VERDE, que es lo que hace
// peligroso ese modo de fallo.
//
// CORRECCION AL PLAN, decidida aca y no descubierta despues: la Task 10 tenia
// que agregar `guardarAjustes()` a ESTE archivo. No puede: esa funcion es una
// Server Action y necesita el cliente de servidor, o sea el import que este
// archivo tiene prohibido. `guardarAjustes()` va en lib/admin/acciones.ts, con
// las demas Server Actions del area de administracion, y aca se queda solo lo
// que se puede probar sin base: `multiplosDeSlot()` ahora y
// `productosDesalineados()` en la Task 10.
//
// La regla general que sale de esto, y que vale para el resto de la tanda:
// un modulo que un test carga no puede contener una Server Action. La
// separacion no es por capas ni por gusto, es por lo que Vitest puede resolver.

// Q-14, PRIMERA MITAD. `products.buffer_minutes` solo tiene
// `check (buffer_minutes between 0 and 480)` -supabase/migrations/
// 20260806002459_reservation_settings.sql:30-31-, asi que la base NO defiende
// que sea multiplo de `slot_minutes`. La defensa es esta funcion.
//
// Es la tercera de las tres salidas que MIGRATION_DOCS/FASE_2_DISENO.md
// escribio en su seccion 15 -"que la interfaz de admin solo ofrezca
// multiplos"-, elegida por D-39. Las otras dos eran un trigger sobre
// `products` y redondear `blocked_range`; la segunda tocaba una migracion de
// la Fase 1 que esta probada y mueve el borde que afirma 21_no_overlap.sql.
//
// LA SEGUNDA MITAD DE Q-14 NO ESTA ACA y esta funcion no puede verla: cambiar
// `slot_minutes` desde /admin/ajustes desalinea buffers YA GUARDADOS,
// retroactivamente, y esto solo mira hacia adelante. Eso es
// `productosDesalineados()`, Task 10.
//
// EL TOPE SE PASA POR PARAMETRO y no se lee de una constante: quien llama sabe
// para que columna esta pidiendo los multiplos. Hoy el unico llamador usa 480,
// que es el `check` de `buffer_minutes`.
export function multiplosDeSlot(slotMinutes: number, maximo: number): number[] {
  const salida: number[] = [];
  for (let v = 0; v <= maximo; v += slotMinutes) {
    salida.push(v);
  }
  return salida;
}

// Q-14, SEGUNDA MITAD. Devuelve los productos cuyo `buffer_minutes` DEJARIA de
// ser multiplo de `slot_minutes` si el admin guardara `slotNuevo`. Es la Task
// 10, no la Task 2: la primera mitad -multiplosDeSlot(), arriba- solo mira
// hacia ADELANTE, que buffer se puede elegir HOY; esta mira hacia ATRAS, que
// buffer YA GUARDADO se rompe si `slot_minutes` cambia.
//
// NO IMPIDE GUARDAR, y no es una omision: la base permite CUALQUIER
// combinacion de `slot_minutes` y `buffer_minutes` -no hay ningun `check` que
// las relacione-, asi que bloquear el guardado aca inventaria una regla que
// el motor no tiene. Mismo criterio de fondo que ya aplica en el resto del
// proyecto para RLS: la aplicacion no decide lo que el motor no decide. El
// aviso con los nombres lo escribe la pantalla -Step 3 del plan-, fuera de
// este archivo; esta funcion solo calcula la lista.
//
// MEDIDO EL 2026-08-12 -ver el plan, Step 2 de la Task 10- que con los datos
// de HOY esta funcion es INALCANZABLE: el `check app_settings_slot_divisor`
// deja ocho valores de `slot_minutes` -5, 6, 10, 12, 15, 20, 30, 60- y los
// OCHO dividen a 120, que es el `buffer_minutes` de los 34 productos reales.
// El riesgo nace en cuanto exista un producto con OTRO buffer -algo que la
// Task 2 SI permite crear-, no con el catalogo de hoy.
export function productosDesalineados(
  productos: { id: string; nombre: string; bufferMinutos: number }[],
  slotNuevo: number,
): { id: string; nombre: string; bufferMinutos: number }[] {
  // Un buffer de 0 nunca entra aca: 0 modulo cualquier cosa es 0, asi que no
  // hace falta un caso especial para "sin tiempo de retorno".
  return productos.filter((p) => p.bufferMinutos % slotNuevo !== 0);
}

// D-54, decidida por Alejandro el 2026-08-13, y CONTRADICE al plan por
// AÑADIDO: MIGRATION_DOCS/PLANES/FASE_2_TANDA_3B.md no pide esta funcion, su
// Task 10 solo trae productosDesalineados() de arriba.
//
// EL DEFECTO QUE LA MOTIVA, medido el 2026-08-13 por PostgREST contra el
// stack local: `app_settings` no tiene NINGUN `check` que relacione
// `opening_time` con `slot_minutes`, asi que la base acepta sin protestar una
// apertura que no cae en un bloque -medido con 09:10 y slot 20, HTTP 200-.
// El efecto no se ve en ESTA pantalla: se mide en `available_slots`, que ese
// mismo dia devolvio 35 franjas empezando a las 09:10, y las 35 resultaron
// IRRESERVABLES -`create_reservation` las rechazo con 23514, "La hora de
// inicio no cae en un bloque de 20 minutos"-. La franja alineada mas
// cercana, las 09:00, tambien se rechazo, pero por otro motivo -P0001,
// "Fuera del horario de atencion", porque 09:00 es ANTERIOR a la apertura
// desalineada-. Con esa combinacion, NINGUNA franja del dia se podia
// reservar, y nada en /admin/ajustes lo hubiera avisado.
//
// POR QUE SOLO `opening_time` Y NO `closing_time`: medido con el
// contraejemplo por el otro lado -apertura ALINEADA (08:00) y cierre
// DESALINEADO (21:50, slot 30)-, `available_slots` dio 27 franjas y la
// ULTIMA se reservo con HTTP 200. `generate_series` arranca en la apertura,
// asi que todas las franjas heredan SU alineacion; el cierre solo recorta la
// serie, nunca la desplaza. La regla es sobre `opening_time` y solo sobre
// `opening_time`.
//
// POR QUE ESTA SI IMPIDE GUARDAR, al reves que productosDesalineados() de
// arriba: la diferencia no es capricho, son los DOS peores casos medidos. Un
// buffer desalineado deja la COLA del bloqueo posterior a mitad de bloque y
// las reservas siguen funcionando -Step 3 del plan: "sus reservas seguiran
// funcionando"-. Una apertura desalineada deja el CALENDARIO ENTERO
// irreservable, sin ningun aviso visible desde esta pantalla ni desde
// ninguna otra: el alumno solo veria un calendario vacio, indistinguible a
// simple vista de un dia sin cupo.
//
// Y IMPEDIRLO NO ES INVENTAR UNA REGLA -al reves que bloquear
// productosDesalineados() si lo seria-: `create_reservation` YA aplica esta
// regla, medido arriba. Lo que falta es que `app_settings` no se la
// comprueba a SI MISMA al guardarse. La defensa de verdad es un `check` en
// la base -Q-19, abierto hoy para la T4-; esta funcion es el parche del lado
// de la aplicacion mientras ese `check` no exista. Mismo aviso que vale para
// todo control de cliente en este proyecto: quien decide de verdad es la
// base, y esta funcion es una comprobacion REPETIDA en el servidor
// -guardarAjustes(), lib/admin/acciones.ts-, no la unica.
//
// SOLO MIRA MINUTOS Y SEGUNDOS, nunca la hora entera, y esto SI esta medido
// -con `node -e`, no supuesto-: los ocho valores legales de `slot_minutes`
// son TODOS divisores de 60, asi que una hora civil completa (60 minutos)
// siempre cae en un bloque valido y su contribucion al resto es cero. Los
// restos medidos del epoch para las 09:10 de Lima contra los ocho slots -0,
// 240, 0, 600, 600, 600, 600, 600 segundos- dividen exacto por 60 y dan
// `10 % slot` para cada uno: la formula sobre los minutos civiles coincide
// con la del epoch absoluto que usa el motor.
//
// TOLERA ENTRADA MALFORMADA: si `apertura` no separa en dos o tres numeros
// -"HH:MM" o "HH:MM:SS"-, se devuelve `true`. Tratar lo que no se entiende
// como desalineado es el lado seguro: la alternativa -devolver `false`-
// dejaria pasar sin aviso un valor que ni siquiera se pudo interpretar.
//
// CADA PARTE SE VALIDA CON UNA EXPRESION REGULAR, `/^\d+$/`, y NO con
// `Number.isFinite()` sobre el resultado de `Number()`. La primera version de
// esta funcion usaba `Number.isFinite()` y tenia un defecto real: `Number('')`
// da `0`, que ES finito, asi que una parte VACIA -"08:" da partes `["08",
// ""]", "::" da `["", "", ""]`- pasaba el filtro y se leia como minuto o
// segundo CERO, o sea "alineada". Descubierto con `node -e` sobre la
// implementacion, no leyendo el codigo: `Number.isFinite(Number(''))` es
// `true`. La regex exige al menos un digito por parte, asi que una cadena
// vacia -o con signo, espacio o decimal- cae por aca antes de llegar a
// `Number()`.
// OJO -F3-T4, migraciones 33 y 35, D-91-: TODO EL COMENTARIO DE ARRIBA SIGUE
// SIENDO CIERTO SOBRE LA REGLA Y YA NO LO ES SOBRE DONDE VIVE. `app_settings`
// no tiene `opening_time` desde la migracion 35: el horario es por sede y por
// dia, en `campus_hours`. Y el `check` que Q-19 pedia YA EXISTE, aunque no
// como `check` -un CHECK no puede llevar subconsulta, medido-: son dos
// disparadores de la migracion 33, `campus_hours_alineacion` sobre la tabla
// nueva y `app_settings_respeta_horarios` para la puerta de atras de
// `slot_minutes`. O sea que la base YA decide, que es lo que este comentario
// pedia.
//
// ESTA FUNCION NO SE BORRA CON LA COLUMNA, y no es inercia: /admin/ajustes
// dejo de llamarla, pero /admin/horarios la necesita para el mismo papel de
// siempre -avisar en pantalla antes de guardar-, ahora sobre
// `campus_hours.opens_at`. Sigue siendo VISIBILIDAD y nunca la unica barrera.
// Sus pruebas viven en lib/admin/ajustes.test.ts y no dependen de ninguna
// columna.
export function aperturaDesalineada(apertura: string, slotMinutos: number): boolean {
  const partes = apertura.split(':');

  if (partes.length !== 2 && partes.length !== 3) {
    return true;
  }

  if (partes.some((p) => !/^\d+$/.test(p))) {
    return true;
  }

  const numeros = partes.map(Number);
  const minutos = numeros[1];
  const segundos = partes.length === 3 ? numeros[2] : 0;

  return minutos % slotMinutos !== 0 || segundos !== 0;
}
