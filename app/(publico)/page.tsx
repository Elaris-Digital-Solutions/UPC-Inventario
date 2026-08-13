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
import { EncabezadoSeccion } from "@/components/antetitulo";
import {
  Heroe,
  HeroeAcciones,
  HeroeBajada,
  HeroePildora,
  HeroeTitular,
} from "@/components/heroe";
import { TarjetaProducto } from "@/components/catalogo/tarjeta-producto";
import { productosVitrina } from "@/lib/catalogo/consultas";

export default async function Home() {
  const productos = await productosVitrina(8);

  return (
    <main className="flex-1">
      {/* Heroe. Sin promesas de disponibilidad: "para tus proyectos", no
          "en stock ahora".
          RECUPERADO el 2026-08-13: era una seccion normal dentro del
          container, con el titular negro sobre el gris de fondo y alineado a
          la izquierda -que en un monitor de 1440 dejaba media pantalla
          vacia-. El Vite abria a sangre sobre `bg-gradient-hero`, centrado y
          con la pildora de la universidad encima
          (MIGRATION_GUIDE/src/pages/Index.tsx:75-108). Los textos son los que
          ya habia; lo que cambia es como se presentan. */}
      <Heroe>
        <HeroePildora>Universidad Peruana de Ciencias Aplicadas</HeroePildora>
        <HeroeTitular>Equipamiento tecnológico para tus proyectos</HeroeTitular>
        <HeroeBajada>
          Los alumnos UPC reservan cámaras, laptops, tablets y más equipamiento
          por franja horaria, y lo recogen en su sede.
        </HeroeBajada>
        <HeroeAcciones>
          {/* `secondary` y no `default`: el boton rojo de siempre desaparece
              sobre el carmesi del heroe. Es el mismo cambio que hacia el Vite
              -`variant="secondary"` para la accion principal y un contorno
              claro para la otra-. */}
          <Button asChild size="lg" variant="secondary" className="shadow-lg">
            <Link href="/login">Entrar con mi correo UPC</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground bg-transparent"
          >
            <Link href="/faq">Cómo funciona</Link>
          </Button>
        </HeroeAcciones>
      </Heroe>

      {/* Vitrina. Ordenada por sort_order (ver el porque en
          lib/catalogo/consultas.ts), nunca por stock: ProductoVitrina ni
          siquiera trae ese dato. */}
      {/* Sobre `bg-card` -blanco- y no sobre el fondo de la pagina, que es
          `0 0% 98%`. El original alternaba blanco y `0 0% 97%` entre
          secciones, con una linea de separacion arriba: dos planos apenas
          distintos que separan sin dibujar una caja. */}
      <section className="bg-card border-border/60 border-t py-20 sm:py-28">
        <div className="container">
        <EncabezadoSeccion
          antetitulo="Inventario UPC"
          titulo="Algunos de los equipos con los que contamos"
          className="mb-12 max-w-2xl"
        />

        {productos.length === 0 ? (
          // Vacio no es un error -puede ser un catalogo recien sembrado o un
          // fallo ya registrado por consultas.ts con console.error-, pero
          // tampoco se pinta una rejilla vacia: es peor senal que un mensaje
          // sobrio.
          <p className="text-muted-foreground border-border mt-8 rounded-lg border border-dashed py-12 text-center">
            Todavía no hay equipos para mostrar.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {productos.map((producto) => (
              <TarjetaProducto key={producto.id} producto={producto} />
            ))}
          </div>
        )}

        <p className="text-muted-foreground mt-8 text-sm">
          El catálogo completo, con la disponibilidad por sede, se ve al
          entrar con tu cuenta UPC.
        </p>
        </div>
      </section>

      {/* Las dos sedes. Estaticos locales -no dependen de
          images.remotePatterns, que solo cubre res.cloudinary.com-.
          Sobre `bg-secondary` y no sobre el fondo de siempre: el Vite
          alternaba blanco y un gris muy claro entre secciones para separarlas
          sin dibujar una caja (MIGRATION_GUIDE/src/pages/Index.tsx:173). */}
      <section className="bg-seccion-alterna border-border/60 border-y py-20 sm:py-28">
        <div className="container">
        <EncabezadoSeccion
          antetitulo="Dónde se recoge"
          titulo="Dos sedes"
          className="mb-12 max-w-2xl"
        />
        {/* TARJETAS CUADRADAS, no la <Card> redondeada. Medido en el original
            el 2026-08-13: `border-radius: 0px`, borde de 1px transparente que
            se vuelve rojo al pasar por encima, la imagen en 4/3 y debajo un
            bloque de texto sobre `rgb(242,242,242)` -que es exactamente
            nuestro `--secondary`- con 32px de alto y 28 de ancho de relleno
            (MIGRATION_GUIDE/src/pages/Index.tsx:126-166).
            Aqui salian como tarjetas redondeadas con sombra, que es el
            aspecto por defecto de shadcn y no el de este producto.
            La regla roja que CRECE al pasar por encima es parte del idioma:
            aparece igual en las tarjetas de pasos y en las categorias del
            original. */}
        <div className="grid gap-6 sm:grid-cols-2">
          {[
            { src: "/Campus.png", nombre: "Monterrico" },
            { src: "/campus-san-miguel.webp", nombre: "San Miguel" },
          ].map((sede) => (
            <div
              key={sede.nombre}
              className="group hover:border-primary flex flex-col border border-transparent transition-colors duration-300"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={sede.src}
                  alt={`Sede ${sede.nombre}`}
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
                />
              </div>
              <div className="bg-secondary flex flex-1 flex-col px-7 py-8">
                <p className="text-foreground text-[10px] font-semibold tracking-[0.3em] uppercase">
                  {sede.nombre}
                </p>
                <div className="bg-primary mt-3 h-px w-8 transition-[width] duration-500 ease-out group-hover:w-12" />
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* Cierre. Mismo llamado que el heroe, para quien llego hasta aqui
          desplazandose sin haber entrado todavia.
          Sobre el gradiente, igual que el heroe: es la MISMA llamada, y
          pintarla en gris claro la dejaba como una nota al pie en vez de como
          el cierre de la pagina. */}
      <section className="bg-gradient-upc relative overflow-hidden py-20 text-center sm:py-24">
        <div className="container relative">
          {/* Redaccion en tuteo peruano y sin marcar genero: "entra" y "accede",
              no "entra vos"; y "empieza tu proxima reserva" en vez de "¿lista?",
              que le presupone el genero a quien lee. */}
          {/* Mismo tamano que los otros h2 de la pagina -text-4xl/5xl, 48px
              a partir de `sm`-. Estaba escrito a mano un escalon por debajo,
              que es exactamente como se desincronizan los tamanos cuando no
              salen del mismo sitio: se ve al medir, no al leer. */}
          <h2 className="font-display text-primary-foreground text-4xl font-bold text-balance sm:text-5xl">
            Empieza tu próxima reserva
          </h2>
          <p className="text-primary-foreground/75 mx-auto mt-4 max-w-xl text-lg">
            Entra con tu correo institucional y accede al catálogo completo.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="mt-8 shadow-lg"
          >
            <Link href="/login">Entrar con mi correo UPC</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
