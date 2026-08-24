import { createClient } from '@/lib/supabase/server';

import { DIAS_SEMANA, type HorarioDia, type SedeConHorario } from '@/lib/admin/semana';

// La lectura de /admin/horarios (D-74/D-75): el horario de cada sede, dia a dia.
//
// SIN 'use server' A PROPOSITO, mismo motivo que lib/admin/dias.ts: esto es un
// SELECT, no una accion.
//
// LA AUTORIZACION LA PONE RLS. `campus_hours` deja LEER a cualquiera con sesion
// -el alumno necesita saber si su sede abre el jueves- y ESCRIBIR solo al admin.
// Que a esta pantalla solo llegue un admin es VISIBILIDAD, no control.
//
// LA SEMANA Y LOS TIPOS VIVEN EN lib/admin/semana.ts y no aca: este archivo
// importa createClient(), asi que un Client Component que importara de aqui una
// sola constante se llevaria `next/headers` al navegador y el `build` cortaria.
// Lo destapo el build, no el typecheck.
//
// EL ERROR SE PROPAGA: un array vacio se leeria como "ninguna sede tiene
// horario", que es justo la situacion que D-76 existe para hacer visible, y le
// pediria al admin ir a cargar horarios encima de los que ya hay.

export type { HorarioDia, SedeConHorario };

// DOS CONSULTAS Y NO UN EMBED: son 2 sedes y 14 horarios, asi que juntarlos en
// memoria es gratis, y un embed obligaria a que la sede SIN ninguna fila de
// horario siguiera apareciendo. Esa sede es justamente la que hay que ver.
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

    // Los SIETE en `null` antes de rellenar: sin esto, un dia sin fila quedaria
    // `undefined` y la pantalla tendria que tratar dos ausencias como una.
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

// ─────────────────────────────────────────────────────────────────────────────
// Los turnos (D-74, D-90, D-92)
// ─────────────────────────────────────────────────────────────────────────────

// LA SEDE VIVE SOLO EN EL TURNO y no en `staff_members`, y conviene dejarlo
// dicho para que nadie "arregle" esa falta: un mismo operador puede tener turnos
// en LAS DOS sedes, y el modelo lo permite sin añadir nada.
export type TurnoAdmin = {
  id: string;
  staffId: string;
  campusId: string;
  weekday: number;
  inicio: string; // `starts_at`, "HH:MM:SS" tal cual llega
  fin: string; // `ends_at`
};

export async function listarTurnos(): Promise<TurnoAdmin[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('staff_shifts')
    .select('id, staff_id, campus_id, weekday, starts_at, ends_at')
    .order('weekday')
    .order('starts_at');

  if (error) {
    throw new Error(`listarTurnos: fallo la consulta a staff_shifts: ${error.message}`);
  }

  return (data ?? []).map((fila) => ({
    id: fila.id,
    staffId: fila.staff_id,
    campusId: fila.campus_id,
    weekday: fila.weekday,
    inicio: fila.starts_at,
    fin: fila.ends_at,
  }));
}
