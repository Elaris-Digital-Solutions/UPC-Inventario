import { createClient } from '@/lib/supabase/server';

import {
  cruzarPersonal,
  type AlumnoParaCruce,
  type MiembroPersonal,
  type RolStaff,
  type StaffParaCruce,
} from '@/lib/admin/filtros';

// La lectura de /admin/personal (Task 9 de la tanda 3B, D-52 y D-53). Misma
// FORMA que lib/admin/dias.ts: tipo de fila cruda declarado y usado como
// parametro de una funcion de traduccion, para que TypeScript contraste lo
// que el `select` infiere, y el error se PROPAGA con throw en vez de
// devolver un array vacio.
//
// DOS CONSULTAS Y NO UN EMBED, y no es eleccion de estilo: MEDIDO el
// 2026-08-13 por PostgREST contra el stack local con un JWT de admin --
// `GET staff_members?select=user_id,role,activo,alumnos(email,nombre)`
// devuelve HTTP 400, code "PGRST200", "Searched for a foreign key
// relationship between 'staff_members' and 'alumnos' in the schema 'public',
// but no matches were found" --. `staff_members.user_id` referencia
// `auth.users`, no `alumnos`, asi que PostgREST no tiene por donde embeber. El
// cruce lo hace cruzarPersonal() (lib/admin/filtros.ts), una funcion PURA,
// sobre los dos arrays ya traducidos aca.
export type { MiembroPersonal, RolStaff };

// La forma medida de una fila de `staff_members`.
type FilaStaffCruda = {
  user_id: string;
  role: RolStaff;
  activo: boolean;
  created_at: string;
};

function filaAStaffParaCruce(fila: FilaStaffCruda): StaffParaCruce {
  return {
    userId: fila.user_id,
    rol: fila.role,
    activo: fila.activo,
    registro: fila.created_at,
  };
}

// La forma medida de una fila de `alumnos`. `auth_user_id` es `string | null`
// en el esquema -- es NULLABLE de verdad, ver lib/database.types.ts -- y se
// declara igual aca aunque en este uso concreto nunca llegue nulo: la
// consulta de abajo acota con `.in('auth_user_id', <los user_id de
// staff_members>)`, y esos ids son siempre NOT NULL -- `staff_members.user_id`
// referencia `auth.users(id)` --, asi que ninguna fila de `alumnos` con
// `auth_user_id` en null puede casar con ese filtro: SQL `IN` nunca empareja
// NULL. Se filtra igual mas abajo, sin ningun `as`, para que sea el TIPO el
// que lo diga y no una suposicion.
type FilaAlumnoCruda = {
  auth_user_id: string | null;
  email: string;
  nombre: string | null;
  apellido: string | null;
};

function filaAAlumnoParaCruce(fila: FilaAlumnoCruda & { auth_user_id: string }): AlumnoParaCruce {
  return {
    authUserId: fila.auth_user_id,
    email: fila.email,
    nombre: fila.nombre,
    apellido: fila.apellido,
  };
}

// Todo el personal, para /admin/personal. Sin filtro ni busqueda porque no
// hace falta ninguno: D-53 deja el alta buscando por correo exacto sobre
// `alumnos`, no sobre esta lista, asi que esta lectura no necesita paginar ni
// acotar.
//
// CUIDADO CON EL ARRAY VACIO: si `staff_members` no trae ninguna fila, esta
// funcion vuelve con `[]` ANTES de lanzar la segunda consulta, en vez de
// llamar a `.in('auth_user_id', [])` -- que ademas no esta medido aca que
// devuelva.
//
// El error se PROPAGA con throw en las dos consultas, mismo criterio que
// listarDiasInhabilitados() y reservasVivas() (lib/admin/dias.ts): un array
// vacio por un fallo de red o de RLS se leeria exactamente igual que "no hay
// personal", y esta pantalla es la unica forma de ver -y arreglar- quien
// tiene acceso al mostrador y a la administracion.
export async function listarPersonal(): Promise<MiembroPersonal[]> {
  const supabase = await createClient();

  const { data: dataStaff, error: errorStaff } = await supabase
    .from('staff_members')
    .select('user_id, role, activo, created_at')
    .order('created_at');

  if (errorStaff) {
    throw new Error(`listarPersonal: fallo la consulta a staff_members: ${errorStaff.message}`);
  }

  const filasStaff = dataStaff ?? [];

  if (filasStaff.length === 0) {
    return [];
  }

  const staff = filasStaff.map(filaAStaffParaCruce);

  const { data: dataAlumnos, error: errorAlumnos } = await supabase
    .from('alumnos')
    .select('auth_user_id, email, nombre, apellido')
    .in(
      'auth_user_id',
      staff.map((s) => s.userId),
    );

  if (errorAlumnos) {
    throw new Error(`listarPersonal: fallo la consulta a alumnos: ${errorAlumnos.message}`);
  }

  const alumnos = (dataAlumnos ?? [])
    .filter((fila): fila is FilaAlumnoCruda & { auth_user_id: string } => fila.auth_user_id !== null)
    .map(filaAAlumnoParaCruce);

  return cruzarPersonal(staff, alumnos);
}
