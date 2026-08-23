import { createClient } from '@/lib/supabase/server';

import {
  cruzarPersonal,
  type AlumnoParaCruce,
  type MiembroPersonal,
  type PrimerAccesoParaCruce,
  type RolStaff,
  type StaffParaCruce,
} from '@/lib/admin/filtros';

// La lectura de /admin/personal (D-52, D-53). Misma FORMA que lib/admin/dias.ts,
// y el error se PROPAGA con throw en las TRES consultas: un array vacio por
// fallo de red se leeria como "no hay personal", y esta es la unica pantalla
// desde la que se ve y se arregla quien tiene acceso.
//
// DOS CONSULTAS Y NO UN EMBED, y no es estilo: `staff_members.user_id`
// referencia `auth.users`, no `alumnos`, asi que PostgREST no tiene por donde
// embeber y devuelve PGRST200. El cruce lo hace cruzarPersonal(), una funcion
// PURA. Ver COMPORTAMIENTO_MEDIDO.md §1.3.
export type { MiembroPersonal, RolStaff };

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

// `auth_user_id` es NULLABLE en el esquema y se declara igual aunque en este uso
// nunca llegue nulo: la consulta acota con `.in('auth_user_id', ...)` sobre ids
// NOT NULL, y SQL `IN` nunca empareja NULL. Se filtra igual, sin ningun `as`,
// para que lo diga el TIPO y no una suposicion.
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

// Todo el personal. Sin filtro ni busqueda: D-53 deja el alta buscando por correo
// exacto sobre `alumnos`, no sobre esta lista.
//
// CUIDADO CON EL ARRAY VACIO: si no hay personal se vuelve ANTES de lanzar la
// segunda consulta, en vez de llamar a `.in('auth_user_id', [])`.
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

  // TERCERA CONSULTA, y es una RPC y no un select (D-80): la fecha del primer
  // magic link vive en `auth.users.confirmation_sent_at`, y ese esquema no tiene
  // grant para `authenticated`. La funcion es `security definer` y filtra por
  // `private.is_admin()`: a quien no lo sea le devuelve CERO FILAS, no un error.
  const { data: dataAcceso, error: errorAcceso } = await supabase.rpc('primer_acceso_personal');

  if (errorAcceso) {
    throw new Error(`listarPersonal: fallo la RPC primer_acceso_personal: ${errorAcceso.message}`);
  }

  const primerAcceso: PrimerAccesoParaCruce[] = (dataAcceso ?? []).map((fila) => ({
    userId: fila.user_id,
    primerAcceso: fila.primer_acceso,
  }));

  return cruzarPersonal(staff, alumnos, primerAcceso);
}
