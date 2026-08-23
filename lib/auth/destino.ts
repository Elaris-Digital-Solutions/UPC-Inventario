import { createClient } from '@/lib/supabase/server';

// A donde manda el sistema a alguien recien identificado.
export type Destino =
  | '/admin/inventario'
  | '/mostrador'
  | '/completar-perfil'
  | '/catalogo'
  | '/auth/error';

// LA LECTURA UNICA QUE REPARTE. Si el reparto se duplicara en varios layouts,
// dos copias se desincronizarian y decidiria la que se ejecute primero -que
// depende del arbol de rutas, no de ninguna decision tomada a proposito-.
//
// Esto NO autoriza nada: solo elige a donde mandar a alguien que YA tiene
// sesion. Quien decide que puede ver y escribir es RLS. Si borrar esta funcion
// abriera un agujero, el agujero estaba en la base.
export async function destino(): Promise<Destino> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;

  if (!sub) {
    return '/auth/error';
  }

  // Personal antes que alumno: alguien puede tener fila en las dos tablas, y en
  // ese caso el panel manda. El orden de estas dos consultas ES la decision.
  const { data: staff } = await supabase
    .from('staff_members')
    .select('role')
    // Un miembro DESACTIVADO cae por la rama de alumnos en vez de ir a un panel
    // donde RLS le negaria todo. Es comodidad para que no vea una pantalla
    // vacia, no un control.
    .eq('user_id', sub)
    .eq('activo', true)
    .maybeSingle();

  if (staff?.role === 'admin') {
    return '/admin/inventario';
  }
  if (staff?.role === 'operator') {
    return '/mostrador';
  }

  // maybeSingle() y no single(): no tener fila es un caso ESPERADO, no un error.
  const { data: alumno } = await supabase
    .from('alumnos')
    .select('nombre, apellido, carrera_id')
    .eq('auth_user_id', sub)
    .maybeSingle();

  if (!alumno) {
    return '/auth/error';
  }

  // D-79: entrar ya NO desvia por perfil incompleto. Los datos se piden en la
  // primera reserva.
  return '/catalogo';
}
