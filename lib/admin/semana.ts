import { ETIQUETAS_DIA, type DiaSemana } from '@/lib/admin/estadisticas';

// La semana y la forma del horario de una sede, SIN NADA DE SERVIDOR DENTRO.
//
// POR QUE EXISTE ESTE ARCHIVO, y lo destapo el `build` -ni el typecheck ni el
// lint lo vieron-: estas constantes vivian en lib/admin/horarios.ts, que importa
// createClient(). Un Client Component que importe de alli aunque sea UNA
// constante arrastra el modulo entero al bundle y Turbopack corta con "You're
// importing a module that depends on next/headers".
//
// El TIPO se puede importar desde donde sea -`import type` se borra al
// compilar-, pero los VALORES no. Por eso los dos que se pintan viven aca.

// `weekday` es el de Postgres, con 0 = domingo, igual que la clave primaria de
// `campus_hours`. El ORDEN de pantalla empieza en lunes. Las etiquetas se reusan
// de estadisticas.ts en vez de escribir siete cadenas que se separarian.
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

// `null` NO es "no se pudo leer": es CERRADO. Un dia sin fila en `campus_hours`
// es un dia sin atencion (D-75), y es la primera de las tres formas que D-76
// obliga a distinguir en pantalla.
export type HorarioDia = { apertura: string; cierre: string } | null;

export type SedeConHorario = {
  id: string;
  nombre: string;
  activo: boolean;
  // Indexado por `weekday` y no por posicion: quien lo lea pasa por DIAS_SEMANA
  // para saber el orden, y asi no hay forma de confundir "el tercero de la
  // lista" con "el miercoles".
  dias: Record<number, HorarioDia>;
};
