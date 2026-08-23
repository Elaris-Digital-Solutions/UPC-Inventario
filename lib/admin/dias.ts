import { createClient } from '@/lib/supabase/server';

import type { EstadoReserva } from '@/lib/reservas/consultas';

// Las DOS lecturas de /admin/dias (F8, corregida por D-40). Misma FORMA que
// lib/admin/reservas.ts: tipo de fila declarado, funcion de traduccion, y el
// error se PROPAGA con throw.
//
// SIN 'use server' A PROPOSITO: con esa directiva TODO export del modulo se
// vuelve invocable desde el navegador como un endpoint, y esto son SELECTs, no
// acciones. Las Server Actions de esta pantalla viven en lib/admin/acciones.ts.
//
// EL ERROR SE PROPAGA y aca pesa mas que en otras pantallas: produccion tiene
// dos dias inhabilitados y cero reservas, asi que un array vacio por fallo de
// red casi coincide con el estado real. Y en reservasVivas() el numero
// equivocado es el que la pantalla usa para decidir CUANTAS reservas cancelar.

export type DiaInhabilitadoAdmin = {
  id: string;
  fecha: string; // `date`, YYYY-MM-DD tal cual llega
  // D-46 lo hace obligatorio para lo que se ESCRIBE desde hoy, pero el tipo
  // admite `null` por las filas historicas de produccion. Un tipo que exigiera
  // `string` dejaria de poder LEERLAS.
  motivo: string | null;
  registro: string; // `created_at` en ISO
};

type FilaDiaCruda = {
  id: string;
  date: string;
  reason: string | null;
  created_at: string;
};

function filaADiaInhabilitado(fila: FilaDiaCruda): DiaInhabilitadoAdmin {
  return {
    id: fila.id,
    fecha: fila.date,
    motivo: fila.reason,
    registro: fila.created_at,
  };
}

// Toda la tabla. SIN filtro de rango, al reves que la consulta del alumno: aca
// la pantalla administra la tabla ENTERA, y un dia pasado sigue teniendo que
// verse en gris (F8).
export async function listarDiasInhabilitados(): Promise<DiaInhabilitadoAdmin[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('disabled_days')
    .select('id, date, reason, created_at')
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`listarDiasInhabilitados: fallo la consulta a disabled_days: ${error.message}`);
  }

  return (data ?? []).map(filaADiaInhabilitado);
}

// Se declara AQUI y no se importa de filtros.ts porque esta funcion es quien
// PRODUCE el dato; el consumo estructural es cosa del generico del otro archivo.
export type ReservaViva = {
  id: string;
  inicio: string; // `start_at`, ISO tal cual llega
  estado: EstadoReserva;
};

type FilaReservaVivaCruda = {
  id: string;
  start_at: string;
  status: EstadoReserva;
};

function filaAReservaViva(fila: FilaReservaVivaCruda): ReservaViva {
  return {
    id: fila.id,
    inicio: fila.start_at,
    estado: fila.status,
  };
}

// Las reservas vivas, para que particionarPorDia() cuente. SOLO tres columnas:
// la pantalla no pinta producto ni alumno, solo cuenta.
//
// SIN FILTRO DE FECHA en la consulta: filtrar en el servidor exigiria convertir
// el dia civil que elige el admin en un rango de instantes UTC, que es
// EXACTAMENTE lo que particionarPorDia() evita comparando con fechaEnLima().
export async function reservasVivas(): Promise<ReservaViva[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('inventory_reservations')
    .select('id, start_at, status')
    .in('status', ['reserved', 'active'])
    .order('start_at');

  if (error) {
    throw new Error(`reservasVivas: fallo la consulta a inventory_reservations: ${error.message}`);
  }

  return (data ?? []).map(filaAReservaViva);
}
