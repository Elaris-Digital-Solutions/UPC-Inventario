import { connection } from "next/server";

import { Cabecera } from "@/components/cabecera";
import { Pie } from "@/components/pie";

// Grupo de las pantallas de acceso. Hoy solo /login.
//
// NACE DE UN DEFECTO QUE SOLO SE VIO ABRIENDO LA PANTALLA: /login no tenia ni un
// enlace, asi que quien llegaba rebotado por el proxy quedaba ENCERRADO. No se
// nota leyendo el codigo ni sondeando por HTTP, porque la pagina responde 200 y
// su formulario funciona.
//
// Cabecera "minima" y no la completa: aquella trae un boton "Entrar" que desde
// /login lleva a /login.
//
// Tipo a mano y no `LayoutProps<...>`: los layouts de grupo no ocupan segmento de
// URL, asi que Next no los genera en LayoutRoutes.
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dinamica por la CSP con nonce, que se genera por peticion. Va AQUI y no en
  // la pagina porque esa es 'use client' y no puede llamar a connection(), que es
  // una API de servidor. Un layout dinamico fuerza dinamica a toda su rama.
  await connection();

  return (
    <>
      <Cabecera variante="minima" />
      {children}
      <Pie />
    </>
  );
}
