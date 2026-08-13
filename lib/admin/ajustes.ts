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
