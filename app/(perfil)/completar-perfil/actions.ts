'use server';

import { redirect } from "next/navigation";

import { destino } from "@/lib/auth/destino";
import { createClient } from "@/lib/supabase/server";

export async function guardarPerfil(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const apellido = formData.get("apellido") as string;
  const carrera_id = formData.get("carrera_id") as string;

  // D-79. Una casilla sin marcar NO viaja en el FormData: `get` devuelve null,
  // no "off". Por eso se compara contra "on" y no se castea a booleano, que
  // convertiria el null en false por accidente y no por decision.
  const es_profesor = formData.get("es_profesor") === "on";
  const confirmo_facultad = formData.get("confirmo_facultad") === "on";

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;

  if (!sub) {
    redirect("/login");
  }

  // No se comprueba aqui que nadie toque activo ni banned_until, y no es un
  // olvido. nombre, apellido y carrera_id son las TRES UNICAS columnas con
  // GRANT UPDATE para authenticated: una sentencia que tocara otra columna
  // ni se planificaria, el motor la rechaza con 42501. Escribir esa
  // validacion aca seria replicar la autorizacion, que el diseno prohibe, y
  // ademas daria la falsa impresion de que es esta linea la que protege
  // cuando en realidad protege el GRANT de la base.
  //
  // El .select() del final NO es decorativo: sin el, este UPDATE puede afectar
  // CERO filas y no dar ni un error. Es la regla que costo un fallo en la Fase
  // 1: falta de privilegio lanza 42501, pero falta de POLITICA deja el UPDATE
  // en cero filas en silencio. Sin comprobarlo, quien guardara sin que la
  // politica se lo permitiera volveria a este mismo formulario -destino()
  // seguiria viendo el perfil incompleto- sin una sola pista de por que. Se
  // comprueba el EFECTO, no la excepcion.
  const { data: filas, error } = await supabase
    .from("alumnos")
    .update({ nombre, apellido, carrera_id, es_profesor, confirmo_facultad })
    .eq("auth_user_id", sub)
    .select("id");

  if (error || !filas || filas.length === 0) {
    redirect("/auth/error?motivo=perfil");
  }

  // D-79: si se llego aca desde la puerta de una reserva, se vuelve a esa
  // reserva y no al reparto general. Sin esto, dar los datos EXPULSA de la
  // reserva que se estaba haciendo, que es justo lo que la mudanza pretendia
  // evitar.
  //
  // EL VALOR SE COMPRUEBA ANTES DE USARSE: llega del cliente -es un campo del
  // formulario-, y un redirect() a un valor sin atar es un redirect abierto.
  // Solo se aceptan rutas internas: tiene que empezar por "/" y NO por "//",
  // porque "//evil.com" es una URL absoluta con protocolo heredado y el
  // navegador la sigue fuera del sitio.
  const volver = formData.get("volver") as string | null;

  if (volver && volver.startsWith('/') && !volver.startsWith('//')) {
    redirect(volver);
  }

  // El reparto vive en un solo sitio (lib/auth/destino.ts); aca solo se
  // obedece. redirect() lanza una excepcion interna para funcionar, por eso
  // va fuera de cualquier try/catch que pudiera tragarsela.
  redirect(await destino());
}
