import { ETIQUETAS_DIA, type DiaSemana } from '@/lib/admin/estadisticas';

// La semana y la forma del horario de una sede, SIN NADA DE SERVIDOR DENTRO.
//
// POR QUE ESTE ARCHIVO EXISTE, y no es gusto de organizacion: lo destapo el
// `build` y ni el `typecheck` ni el `lint` lo vieron. Estas constantes vivian
// en lib/admin/horarios.ts, que importa createClient() de
// @/lib/supabase/server; un Client Component que importe de alli aunque sea
// UNA constante arrastra el modulo entero al bundle del navegador, y Turbopack
// corta con "You're importing a module that depends on next/headers". Mismo
// criterio de separacion que ya explica la cabecera de lib/admin/acciones.ts:
// la linea no se traza por capas conceptuales, se traza por lo que cada
// entorno puede resolver.
//
// El TIPO se puede importar desde donde sea -`import type` se borra al
// compilar-, pero los VALORES no. Por eso los dos que se pintan en pantalla
// -la lista de dias y su etiqueta- viven aca.

// `weekday` es el de Postgres, con 0 = domingo, que es la misma convencion de
// `getDay()` y la que usa la clave primaria de `campus_hours`. El ORDEN de
// pantalla empieza en lunes, que es como se lee una semana en castellano
// -mismo criterio que ORDEN_DIAS en lib/admin/estadisticas.ts, de donde salen
// tambien las etiquetas: se reusan en vez de escribir siete cadenas nuevas que
// se separarian de aquellas-.
export const DIAS_SEMANA: readonly { weekday: number; nombre: DiaSemana }[] = [
  { weekday: 1, nombre: 'lunes' },
  { weekday: 2, nombre: 'martes' },
  { weekday: 3, nombre: 'miercoles' },
  { weekday: 4, nombre: 'jueves' },
  { weekday: 5, nombre: 'viernes' },
  { weekday: 6, nombre: 'sabado' },
  { weekday: 0, nombre: 'domingo' },
];

export function etiquetaDia(nombre: DiaSemana): string {
  return ETIQUETAS_DIA[nombre];
}

// `null` NO es "no se pudo leer": es CERRADO, y esa es la lectura literal del
// modelo -un dia sin fila en `campus_hours` es un dia sin atencion, D-75-. Es
// la primera de las tres formas que D-76 obliga a distinguir en pantalla.
export type HorarioDia = { apertura: string; cierre: string } | null;

export type SedeConHorario = {
  id: string;
  nombre: string;
  activo: boolean;
  // Indexado por `weekday`, no por posicion: quien lo lea tiene que pasar por
  // DIAS_SEMANA para saber en que orden pintarlo, y asi no hay forma de
  // confundir "el tercero de la lista" con "el miercoles".
  dias: Record<number, HorarioDia>;
};
