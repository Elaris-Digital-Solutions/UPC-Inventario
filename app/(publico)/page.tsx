// La landing de verdad, tarea 2A.3. REEMPLAZA al marcador de posicion de la
// tanda 0 -aquel decia en su primera linea "NO es la landing"; este archivo
// es la landing-.
//
// Es VITRINA y no catalogo (D-21): ensena que equipos existen, nunca cuantos
// quedan. La frontera es que la vitrina es promocion y el catalogo es una
// herramienta de decision -y una herramienta de decision sin datos es peor
// que ninguna-. Por eso llama a productosVitrina() y no toca
// product_availability, y por eso TarjetaProducto se usa aqui SIN href: la
// vitrina no lleva a ningun lado, entrar es el unico paso siguiente.
//
// Se ve EXACTAMENTE IGUAL con sesion y sin ella, y es intencional: si
// cambiara segun quien mira, estaria prometiendo algo que depende de la
// sesion, que es justo lo que D-21 descarta.
//
// CORRECCION medida al escribir este archivo (2026-08-08): NO se
// prerenderiza como estatica. `npm run build` la marca "ƒ /" -dinamica-, no
// "○ /". No es por leer sesion -esta pagina no llama a getClaims() ni nada
// que dependa de quien mira-, sino porque productosVitrina() llama a
// createClient() (lib/supabase/server.ts), que hace `await cookies()` para
// poder construir el cliente aunque la consulta sea anonima. Next.js trata
// cookies() como una Dynamic API sin mirar si el valor se usa: el simple
// hecho de pedirla ya saca la ruta del prerender. Cabecera y Pie no leen
// cookies -eso sigue siendo cierto-, pero ya no basta: cualquier consulta a
// Supabase desde el arbol de '/', lea o no sesion, la vuelve dinamica.
import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TarjetaProducto } from "@/components/catalogo/tarjeta-producto";
import { productosVitrina } from "@/lib/catalogo/consultas";

export default async function Home() {
  const productos = await productosVitrina(8);

  return (
    <main className="flex-1">
      {/* Heroe. Sin promesas de disponibilidad: "para tus proyectos", no
          "en stock ahora". */}
      <section className="container flex flex-col items-start gap-6 py-16 sm:py-24">
        <h1 className="font-display max-w-2xl text-4xl sm:text-5xl">
          Equipamiento tecnológico para tus proyectos
        </h1>
        <p className="text-muted-foreground max-w-prose text-lg">
          Los alumnos UPC reservan cámaras, laptops, tablets y más equipamiento
          por franja horaria, y lo recogen en su sede.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/login">Entrar con mi correo UPC</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/faq">Cómo funciona</Link>
          </Button>
        </div>
      </section>

      {/* Vitrina. Ordenada por sort_order (ver el porque en
          lib/catalogo/consultas.ts), nunca por stock: ProductoVitrina ni
          siquiera trae ese dato. */}
      <section className="container py-16">
        <h2 className="font-display text-2xl sm:text-3xl">
          Algunos de los equipos con los que contamos
        </h2>

        {productos.length === 0 ? (
          // Vacio no es un error -puede ser un catalogo recien sembrado o un
          // fallo ya registrado por consultas.ts con console.error-, pero
          // tampoco se pinta una rejilla vacia: es peor senal que un mensaje
          // sobrio.
          <p className="text-muted-foreground border-border mt-8 rounded-lg border border-dashed py-12 text-center">
            Todavía no hay equipos para mostrar.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {productos.map((producto) => (
              <TarjetaProducto key={producto.id} producto={producto} />
            ))}
          </div>
        )}

        <p className="text-muted-foreground mt-6 text-sm">
          El catálogo completo, con la disponibilidad por sede, se ve al
          entrar con tu cuenta UPC.
        </p>
      </section>

      {/* Las dos sedes. Estaticos locales -no dependen de
          images.remotePatterns, que solo cubre res.cloudinary.com-. */}
      <section className="container py-16">
        <h2 className="font-display text-2xl sm:text-3xl">Dos sedes</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Card className="gap-3 overflow-hidden pt-0">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src="/Campus.png"
                alt="Sede Monterrico"
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle>Monterrico</CardTitle>
            </CardHeader>
          </Card>
          <Card className="gap-3 overflow-hidden pt-0">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src="/campus-san-miguel.webp"
                alt="Sede San Miguel"
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle>San Miguel</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Cierre. Mismo llamado que el heroe, para quien llego hasta aqui
          desplazandose sin haber entrado todavia. */}
      <section className="container pb-20">
        {/* Redaccion en tuteo peruano y sin marcar genero: "entra" y "accede",
            no "entra vos"; y "empieza tu proxima reserva" en vez de "¿lista?",
            que le presupone el genero a quien lee. */}
        <div className="bg-muted rounded-2xl px-6 py-12 text-center sm:px-12">
          <h2 className="font-display text-2xl sm:text-3xl">
            Empieza tu próxima reserva
          </h2>
          <p className="text-muted-foreground mt-2">
            Entra con tu correo institucional y accede al catálogo completo.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/login">Entrar con mi correo UPC</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
