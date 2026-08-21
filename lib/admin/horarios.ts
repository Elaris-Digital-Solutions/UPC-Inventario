import { createClient } from '@/lib/supabase/server';

import { DIAS_SEMANA, type HorarioDia, type SedeConHorario } from '@/lib/admin/semana';

// La lectura de /admin/horarios (F3-T4, D-74/D-75): el horario de cada sede,
// dia por dia.
//
// SIN 'use server' A PROPOSITO, mismo criterio y mismo motivo que
// lib/admin/dias.ts deja escrito: con 'use server' TODO export del modulo se
// vuelve invocable desde el navegador como un endpoint, y esto es un SELECT,
// no una accion. Las Server Actions de esta pantalla -guardarHorarioDia() y
// cerrarDia()- viven en lib/admin/acciones.ts, con las demas.
//
// LA AUTORIZACION LA PONE RLS Y NO ESTA CAPA. `campus_hours` deja LEER a
// cualquiera con sesion -el alumno necesita saber si su sede abre el jueves- y
// deja ESCRIBIR solo al admin, via private.is_admin(), en la migracion 33.
// Que esta pantalla solo la alcance un admin lo garantiza
// app/(personal)/admin/layout.tsx, y eso es VISIBILIDAD: si alguien llamara a
// la accion por su cuenta, quien lo para es la politica.
//
// LA SEMANA Y LOS TIPOS VIVEN EN lib/admin/semana.ts y no aca, y el motivo
// esta medido: este archivo importa createClient(), asi que un Client
// Component que importara de aqui una sola constante se llevaria
// `next/headers` al navegador y el `build` cortaria. Lo destapo el build y
// no el typecheck.
//
// EL ERROR SE PROPAGA, mismo criterio que listarDiasInhabilitados(), y aca
// pesa tanto como alli o mas: un array vacio por un fallo de red se leeria
// como "ninguna sede tiene horario", que es exactamente la situacion que
// D-76 existe para hacer visible. El admin no podria distinguir la pantalla
// rota del estado que tiene que corregir, y "no hay horarios" es justo lo que
// le pediria ir a cargarlos encima de los que ya hay.

export type { HorarioDia, SedeConHorario };

// DOS CONSULTAS Y NO UN EMBED de PostgREST, y es deliberado: son 2 sedes y 14
// horarios en produccion -medido-, asi que juntarlos en memoria es gratis, y
// un embed obligaria a que la sede SIN ninguna fila de horario siguiera
// apareciendo. Aca esa sede es justamente la que hay que ver.
export async function listarHorariosPorSede(): Promise<SedeConHorario[]> {
  const supabase = await createClient();

  const [sedes, horarios] = await Promise.all([
    supabase.from('campuses').select('id, name, activo').order('name'),
    supabase.from('campus_hours').select('campus_id, weekday, opens_at, closes_at'),
  ]);

  if (sedes.error) {
    throw new Error(`listarHorariosPorSede: fallo la consulta a campuses: ${sedes.error.message}`);
  }

  if (horarios.error) {
    throw new Error(
      `listarHorariosPorSede: fallo la consulta a campus_hours: ${horarios.error.message}`,
    );
  }

  return (sedes.data ?? []).map((sede) => {
    const dias: Record<number, HorarioDia> = {};

    // Se inicializan los SIETE en `null` antes de rellenar. Sin esto, un dia
    // sin fila quedaria `undefined` en vez de `null`, y la pantalla tendria
    // que tratar dos ausencias distintas como la misma cosa.
    for (const { weekday } of DIAS_SEMANA) {
      dias[weekday] = null;
    }

    for (const fila of horarios.data ?? []) {
      if (fila.campus_id === sede.id) {
        dias[fila.weekday] = { apertura: fila.opens_at, cierre: fila.closes_at };
      }
    }

    return { id: sede.id, nombre: sede.name, activo: sede.activo, dias };
  });
}
