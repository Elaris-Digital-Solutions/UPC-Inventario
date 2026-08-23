'use server';

import { redirect } from "next/navigation";

import { destino } from "@/lib/auth/destino";
import { createClient } from "@/lib/supabase/server";

export async function guardarPerfil(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const apellido = formData.get("apellido") as string;
  const carrera_id = formData.get("carrera_id") as string;

  // D-79: una casilla sin marcar NO viaja en el FormData -`get` devuelve null, no
  // "off"-, asi que se compara contra "on" en vez de castear.
  const es_profesor = formData.get("es_profesor") === "on";
  const confirmo_facultad = formData.get("confirmo_facultad") === "on";

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;

  if (!sub) {
    redirect("/login");
  }

  // NO se comprueba aqui que nadie toque `activo` ni `banned_until`: esas tres
  // columnas son las UNICAS con GRANT UPDATE para `authenticated`, asi que una
  // sentencia que tocara otra la rechaza el motor con 42501. Escribirlo aqui
  // replicaria la autorizacion y daria la falsa impresion de que protege esta
  // linea y no el GRANT.
  //
  // EL `.select()` NO ES DECORATIVO: falta de privilegio lanza 42501, pero falta
  // de POLITICA deja el UPDATE en cero filas EN SILENCIO. Sin comprobarlo, quien
  // guardara sin permiso volveria a este mismo formulario sin una sola pista de
  // por que. Se comprueba el EFECTO, no la excepcion.
  const { data: filas, error } = await supabase
    .from("alumnos")
    .update({ nombre, apellido, carrera_id, es_profesor, confirmo_facultad })
    .eq("auth_user_id", sub)
    .select("id");

  if (error || !filas || filas.length === 0) {
    redirect("/auth/error?motivo=perfil");
  }

  // D-79: si se llego desde la puerta de una reserva, se vuelve a esa reserva.
  // Sin esto, dar los datos EXPULSA de la reserva que se estaba haciendo.
  //
  // EL VALOR SE COMPRUEBA ANTES DE USARSE: llega del cliente, y un redirect() a un
  // valor sin atar es un REDIRECT ABIERTO. Solo rutas internas: tiene que empezar
  // por "/" y NO por "//", porque "//evil.com" es absoluta con protocolo heredado
  // y el navegador la sigue fuera del sitio.
  const volver = formData.get("volver") as string | null;

  if (volver && volver.startsWith('/') && !volver.startsWith('//')) {
    redirect(volver);
  }

  // El reparto vive en lib/auth/destino.ts. `redirect()` funciona lanzando una
  // excepcion, por eso va fuera de cualquier try/catch.
  redirect(await destino());
}
