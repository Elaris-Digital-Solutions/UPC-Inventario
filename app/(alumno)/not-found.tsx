// El 404 de las rutas del alumno. NO pinta Cabecera ni Pie, y esa es
// exactamente la razon de que este archivo exista.
//
// Medido en un navegador el 2026-08-10, y la distincion es fina:
//
//   /faq/subruta-falsa        ninguna ruta casa      1 cabecera, 1 pie
//   /catalogo/cualquier-cosa  SI casa con [id]       2 cabeceras, 2 pies
//
// Cuando NINGUNA ruta casa, Next resuelve app/not-found.tsx sin montar el
// layout de ningun grupo, y ese archivo pinta su propia Cabecera y su propio
// Pie a mano -porque el layout raiz no los tiene, ver el comentario de
// app/layout.tsx-. Pero /catalogo/[id] SI existe: el layout de (alumno) ya se
// monto y ya pinto CabeceraSesion y Pie, y solo DESPUES la pagina llamo a
// notFound() al no encontrar el producto. El 404 de la raiz se renderiza
// dentro de ese layout y suma los suyos a los que ya habia.
//
// Es el mismo error que la correccion 5 de esta tanda -una cabecera que se
// SUMA en vez de sustituir, porque un layout de grupo envuelve al de arriba y
// no lo reemplaza- reapareciendo por otra puerta.
//
// Y no lo pudo ver la tarea 2A.4, que fue la que escribio el 404: entonces
// ninguna pantalla llamaba a notFound(), asi que el segundo caso todavia no
// existia. Nace con la tarea 2A.6, que es la primera que lo llama.
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFoundAlumno() {
  return (
    <main className="container flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-upc-red font-display text-6xl font-bold">404</p>
      <h1 className="font-display text-3xl sm:text-4xl">Esta página no existe</h1>
      <p className="text-muted-foreground max-w-md">
        El enlace puede estar mal escrito, o el equipo que buscas puede haberse
        retirado del catálogo.
      </p>
      {/* Aqui SI se enlaza a /catalogo, al reves que en el 404 global. Alli se
          evita a proposito porque quien cae en el 404 global puede no tener
          sesion y /catalogo lo rebotaria a /login. Bajo (alumno) la sesion ya
          esta comprobada por el layout del grupo, asi que el enlace lleva a
          donde dice que lleva. */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/catalogo">Ir al catálogo</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/faq">Preguntas frecuentes</Link>
        </Button>
      </div>
    </main>
  );
}
