import { createClient } from '@/lib/supabase/server';

// A donde manda el sistema a alguien recien identificado. admin y operador
// van a sus paneles; alumno con el perfil incompleto va a completarlo; alumno
// completo va al catalogo; y sin ninguna fila reconocible, a la pantalla de
// error.
export type Destino =
  | '/admin/inventario'
  | '/mostrador'
  | '/completar-perfil'
  | '/catalogo'
  | '/auth/error';

// La lectura UNICA que reparte. Si el reparto se duplicara en varios
// layouts, dos copias se desincronizarian con el tiempo, y la que decidiria
// seria la que se ejecute primero -que depende del arbol de rutas, no de
// ninguna decision tomada a proposito-. Por eso cada sitio que necesita
// mandar a alguien a algun lado llama a esta funcion en vez de repetir la
// logica.
//
// Esto NO autoriza nada: solo elige a donde mandar a alguien despues de que
// ya tiene sesion. Quien decide que puede ver y escribir es RLS, en la base.
// Si borrar esta funcion abriera un agujero, el agujero estaba en la base, no
// aqui.
export async function destino(): Promise<Destino> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;

  if (!sub) {
    return '/auth/error';
  }

  // Personal antes que alumno: alguien puede tener fila en las dos tablas, y
  // en ese caso el panel manda. El orden de estas dos consultas es la
  // decision.
  const { data: staff } = await supabase
    .from('staff_members')
    .select('role')
    // Un miembro DESACTIVADO no se manda a un panel donde RLS le negaria
    // todo de todas formas: cae por la rama de alumnos. Es comodidad para
    // que no vea una pantalla vacia, no un control -el control ya esta en
    // las politicas que lo bloquearian ahi dentro.
    .eq('user_id', sub)
    .eq('activo', true)
    .maybeSingle();

  if (staff?.role === 'admin') {
    return '/admin/inventario';
  }
  if (staff?.role === 'operator') {
    return '/mostrador';
  }

  // maybeSingle() y no single(): no tener fila en staff_members ni en
  // alumnos es un caso ESPERADO -la mayoria de quienes entran son alumnos, o
  // recien se registraron-, no un error. single() lanzaria una excepcion
  // para un caso normal.
  const { data: alumno } = await supabase
    .from('alumnos')
    .select('nombre, apellido, carrera_id')
    .eq('auth_user_id', sub)
    .maybeSingle();

  if (!alumno) {
    return '/auth/error';
  }

  if (!alumno.nombre || !alumno.apellido || !alumno.carrera_id) {
    return '/completar-perfil';
  }

  return '/catalogo';
}
