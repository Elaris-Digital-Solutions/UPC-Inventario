// Pagina 404 global. Next.js exige este archivo en la RAIZ de app/, no
// dentro de un grupo: un not-found.tsx dentro de (publico) o (alumno) solo
// cubriria las rutas de ese grupo, y esta tiene que cubrir cualquier ruta
// que no exista en la aplicacion entera.
//
// Y esa raiz es justo el problema. app/layout.tsx NO pinta cabecera ni pie
// -lo hacen los layouts de cada grupo, ver el comentario de ese archivo y de
// components/cabecera.tsx: una cabecera en el layout raiz volveria dinamicas
// TODAS las rutas por leer cookies()-, y este archivo no vive dentro de
// ningun grupo, asi que ningun layout de grupo lo envuelve. Por eso esta
// pagina importa y pinta Cabecera y Pie ELLA MISMA, a mano.
//
// ESTO PARECE DUPLICACION Y NO LO ES. Si alguien "limpia" este import
// porque ya existe en los layouts de grupo, el 404 se queda sin cabecera ni
// pie mientras el resto de la aplicacion los tiene. Si algun dia hace falta
// quitar la duplicacion de verdad, la solucion es otra: mover a un layout
// que si envuelva a not-found.tsx, no dejar de llamar a Cabecera/Pie aqui.

import Link from "next/link";
import { connection } from "next/server";

import { Button } from "@/components/ui/button";
import { Cabecera } from "@/components/cabecera";
import { Pie } from "@/components/pie";

export default async function NotFound() {
  // Dinamica por la CSP con nonce: el nonce se genera por peticion en
  // proxy.ts, y esta pagina se generaba en el prerender, cuando no habia
  // ninguna peticion -sus scripts quedaban sin nonce y la CSP los bloqueaba-.
  await connection();

  return (
    <>
      <Cabecera />
      <main className="container flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-upc-red font-display text-6xl font-bold">404</p>
        <h1 className="font-display text-3xl sm:text-4xl">
          Esta página no existe
        </h1>
        <p className="text-muted-foreground max-w-md">
          El enlace puede estar mal escrito, o la página que buscas puede
          haberse movido.
        </p>
        {/* Nada de /catalogo aqui: es una ruta privada, y quien llega sin
            sesion rebotaria a /login. Ofrecer un enlace que redirige a otro
            lado es peor que no ofrecerlo. */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/">Ir al inicio</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/faq">Preguntas frecuentes</Link>
          </Button>
        </div>
      </main>
      <Pie />
    </>
  );
}
