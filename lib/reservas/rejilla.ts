// La rejilla, como logica pura: sin React, sin Supabase y sin red.
//
// "QUE DIA ES HOY" SE CALCULA EN UN SOLO SITIO -este-, y ese es el arreglo de
// M-7 en el cliente. El servidor corre en UTC y el navegador en la zona del
// alumno; a las 20:00 de Lima estan en dias distintos, y `create_reservation`
// resuelve el dia en America/Lima. Si el cliente lo resolviera de otra forma, la
// pantalla y el motor discreparian sobre que dia es "mañana".

// NO se lee de configuracion a proposito: la RPC la tiene escrita a mano, asi que
// un valor configurable aqui podria separarse del motor sin que nada avisara.
const ZONA = 'America/Lima';

// `en-CA` da exactamente `YYYY-MM-DD`, el formato que espera `p_date` de
// `available_slots`. Con Intl y no con aritmetica de horas: Intl SI conoce el
// calendario de la zona, y una resta de cinco horas escrita a mano seria una
// suposicion sin nadie que la vigile.
const FORMATO_FECHA = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * El dia civil en Lima al que pertenece un instante, como `YYYY-MM-DD`.
 *
 * Es la unica traduccion de instante a fecha del proyecto. Un `new Date()` suelto
 * con zona en cualquier otro archivo es un defecto, no un atajo.
 */
export function fechaEnLima(instante: Date): string {
  return FORMATO_FECHA.format(instante);
}

/**
 * Que dia es hoy en Lima. Recibe `ahora` para que las pruebas puedan fijar el
 * instante: leer el reloj del sistema impide probar la frontera de medianoche.
 */
export function hoyEnLima(ahora: Date): string {
  return fechaEnLima(ahora);
}

/**
 * Las duraciones que la interfaz ofrece, en minutos.
 *
 * Salen de `app_settings` y del producto (D-1, D-19), NUNCA de una constante. Con
 * los datos reales son ocho opciones de 30 a 240; el Laptop del seed vale 8 horas
 * y da dieciseis, y esa diferencia es a proposito -el seed ejercita D-1 y
 * produccion no-.
 *
 * El multiplo de `slotMinutes` es D-19 y no es cosmetico: `create_reservation`
 * rechaza lo que no cae en un bloque, asi que ofrecer 45 minutos seria ofrecer
 * algo que el motor rechaza.
 */
export function duracionesPosibles(
  maxDurationHours: number,
  slotMinutes: number,
  minDurationMinutes: number,
): number[] {
  // El minimo real es el primer multiplo del bloque que llega al minimo
  // configurado: con min=20 y slot=30 seria 30, no 20.
  const primera = Math.ceil(minDurationMinutes / slotMinutes) * slotMinutes;
  const tope = maxDurationHours * 60;

  const duraciones: number[] = [];
  for (let d = primera; d <= tope; d += slotMinutes) {
    duraciones.push(d);
  }
  return duraciones;
}

/**
 * Los dias que el calendario ofrece, empezando por hoy.
 *
 * Son `bookingWindowDays + 1` entradas, y ese "+ 1" es una DECISION y no un error
 * de contador: `create_reservation` compara INSTANTES, no fechas, asi que con la
 * ventana en 7 hay OCHO dias civiles con alguna franja reservable y el ultimo
 * esta cortado por la mitad.
 *
 * Se ofrecen los ocho. Devolver siete seria mas bonito y mas pobre: esconderia
 * franjas que el motor SI acepta.
 *
 * No hace falta recortar el ultimo dia aqui: `available_slots` ya filtra por
 * instante, asi que ese dia llega con menos franjas solo. Duplicar el recorte
 * seria una segunda copia de la regla.
 *
 * @param ahora  el instante actual; se pasa para poder fijarlo en las pruebas
 * @param bookingWindowDays  `app_settings.booking_window_days`, hoy 7
 */
export function diasDeLaVentana(ahora: Date, bookingWindowDays: number): string[] {
  const hoy = hoyEnLima(ahora);
  return Array.from({ length: bookingWindowDays + 1 }, (_, i) => sumarDias(hoy, i));
}

/**
 * Suma dias a una fecha civil `YYYY-MM-DD`.
 *
 * La aritmetica va sobre `Date.UTC`, que no tiene horario de verano, asi que
 * sumar 86.400.000 ms es exactamente un dia de calendario. Sobre el instante
 * local seria correcto hoy en Peru y dejaria de serlo con una zona con DST.
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
