import { connection } from "next/server";

import { Cabecera } from "@/components/cabecera";
import { Pie } from "@/components/pie";

// Grupo de las pantallas de acceso. Hoy solo /login.
//
// Nace de un defecto que solo se vio abriendo la pantalla en un navegador:
// /login no tenia ni un enlace. Quien llegaba ahi rebotado por el proxy desde
// una ruta privada quedaba ENCERRADO -su unica salida era el boton atras-, y
// eso no se nota leyendo el codigo ni sondeando por HTTP, porque la pagina
// responde 200 y su formulario funciona.
//
// Cabecera "minima" y no la completa: la completa trae un boton "Entrar" que
// desde /login lleva a /login. Aqui basta el logo, que devuelve a la vitrina.
//
// Tipo a mano y no LayoutProps<...>: los layouts de grupo no ocupan segmento
// de URL, asi que Next no los genera en LayoutRoutes (correccion 37 de la
// tanda 1).
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dinamica por la CSP con nonce: el nonce se genera por peticion en
  // proxy.ts, y este layout se generaba en el prerender, cuando no habia
  // ninguna peticion. Va aca y no en app/(auth)/login/page.tsx porque esa
  // pagina es 'use client', y un componente de cliente no puede llamar
  // connection() -es una API de servidor-. Un layout dinamico fuerza dinamica
  // a toda su rama, incluida una pagina de cliente.
  await connection();

  return (
    <>
      <Cabecera variante="minima" />
      {children}
      <Pie />
    </>
  );
}
