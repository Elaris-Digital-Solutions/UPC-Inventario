// La rejilla, como logica pura: sin React, sin Supabase y sin red.
//
// Vive aparte por dos motivos. El primero es que se puede PROBAR: es lo unico
// de esta tanda que no necesita montar un escenario en la base. El segundo es
// que "que dia es hoy" tiene que calcularse en UN SOLO SITIO -este-, y ese es
// el arreglo de M-7 en el cliente.
//
// El servidor de produccion corre en UTC y el navegador en la zona del alumno.
// A las 20:00 de Lima los dos estan en dias distintos, y `create_reservation`
// resuelve el dia en America/Lima (paso 5 de la RPC). Si el cliente lo
// resolviera de otra forma, la pantalla y el motor discreparian sobre que dia
// es "manana" -y el que se lleva el error es el alumno-.

// La zona horaria del servicio. NO se lee de configuracion a proposito: la RPC
// la tiene escrita a mano -`at time zone 'America/Lima'`-, asi que un valor
// configurable aqui podria separarse del motor sin que nada avisara. Mientras
// el SQL diga America/Lima, esto tambien.
const ZONA = 'America/Lima';

// `en-CA` da exactamente `YYYY-MM-DD`, que es el formato que espera el
// parametro `p_date date` de `available_slots`. Se usa Intl y no aritmetica de
// horas porque Intl SI conoce el calendario de la zona; hoy Peru no cambia de
// hora, pero una resta de cinco horas escrita a mano seria una suposicion sin
// nadie que la vigile.
const FORMATO_FECHA = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * El dia civil en Lima al que pertenece un instante, como `YYYY-MM-DD`.
 *
 * Es la unica traduccion de instante a fecha del proyecto. Un `new Date()`
 * suelto con zona en cualquier otro archivo es un defecto, no un atajo.
 */
export function fechaEnLima(instante: Date): string {
  return FORMATO_FECHA.format(instante);
}

/**
 * Que dia es hoy en Lima. Recibe `ahora` en vez de llamar a `new Date()` por
 * dentro para que las pruebas puedan fijar el instante: una funcion que lee el
 * reloj del sistema no se puede probar en la frontera de medianoche, que es
 * justo donde importa.
 */
export function hoyEnLima(ahora: Date): string {
  return fechaEnLima(ahora);
}

/**
 * Las duraciones que la interfaz ofrece, en minutos.
 *
 * Salen de `app_settings` y del producto (D-1, D-19), NUNCA de una constante.
 * Con los datos reales -`slot_minutes` 30, `min_duration_minutes` 30 y
 * `max_duration_hours` 4 en los 34 productos- son ocho opciones: 30, 60, ...,
 * 240. El Laptop del stack local vale 8 horas y da dieciseis, y esa diferencia
 * es a proposito: el seed ejercita D-1 y produccion no, asi que escribir "4
 * horas" a mano se ve en local y no se veria nunca en el proyecto real.
 *
 * El multiplo de `slotMinutes` es D-19, y no es cosmetico: `create_reservation`
 * rechaza lo que no cae en un bloque. Ofrecer 45 minutos seria ofrecer algo que
 * el motor rechaza, que es exactamente lo que esta tanda existe para evitar.
 */
export function duracionesPosibles(
  maxDurationHours: number,
  slotMinutes: number,
  minDurationMinutes: number,
): number[] {
  // El minimo real es el primer multiplo del bloque que llega al minimo
  // configurado. Con min=30 y slot=30 es 30; si algun dia min fuera 20, seria
  // 30 y no 20, porque 20 no es un bloque valido.
  const primera = Math.ceil(minDurationMinutes / slotMinutes) * slotMinutes;
  const tope = maxDurationHours * 60;

  const duraciones: number[] = [];
  for (let d = primera; d <= tope; d += slotMinutes) {
    duraciones.push(d);
  }
  return duraciones;
}

/**
 * Los dias que el calendario ofrece, como `YYYY-MM-DD` y empezando por hoy.
 *
 * Son `bookingWindowDays + 1` entradas, y ese "+ 1" es una DECISION tomada el
 * 2026-08-10, no un error de contador. El motivo:
 *
 * `create_reservation` no compara fechas, compara INSTANTES —`p_start_at >
 * now() + booking_window_days`, paso 4—. Con la ventana en 7, a las 14:00 del
 * dia 10 el motor acepta hasta las 14:00 del dia 17. Hay ocho dias civiles con
 * alguna franja reservable, del 10 al 17, y el ultimo esta CORTADO por la
 * mitad.
 *
 * Se ofrecen los ocho. La alternativa era devolver siete y no ensenar nunca un
 * dia a medias, mas bonito de ver y mas pobre: esconderia franjas de la manana
 * del dia 17 que el motor SI acepta. **Este proyecto ya rechazo dos veces
 * esconderle al usuario algo que el motor permite**, y la regla de
 * FASE_2_DISENO.md §11.2 -«la rejilla puede ser mas estricta que la RPC, nunca
 * mas laxa»- autoriza las dos, asi que no decidia ella.
 *
 * No hace falta recortar el ultimo dia aqui: `available_slots` filtra por
 * instante -`g.slot_start <= now() + booking_window_days`-, asi que ese dia
 * llega con menos franjas solo. Duplicar el recorte en el cliente seria una
 * segunda copia de la regla, y las dos copias se separan.
 *
 * @param ahora  el instante actual; se pasa para poder fijarlo en las pruebas
 * @param bookingWindowDays  `app_settings.booking_window_days`, hoy 7
 */
export function diasDeLaVentana(ahora: Date, bookingWindowDays: number): string[] {
  const hoy = hoyEnLima(ahora);
  return Array.from({ length: bookingWindowDays + 1 }, (_, i) => sumarDias(hoy, i));
}

/**
 * Suma dias a una fecha civil `YYYY-MM-DD` y devuelve otra `YYYY-MM-DD`.
 *
 * La aritmetica va sobre `Date.UTC`, que no tiene horario de verano, asi que
 * sumar 86.400.000 ms es exactamente un dia de calendario. Hacerlo sobre el
 * instante local seria correcto hoy en Peru y dejaria de serlo en cuanto una
 * zona con DST entrara en juego.
 */
export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const base = Date.UTC(anio, mes - 1, dia);
  const movida = new Date(base + dias * 86_400_000);

  const a = movida.getUTCFullYear();
  const m = String(movida.getUTCMonth() + 1).padStart(2, '0');
  const d = String(movida.getUTCDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}
