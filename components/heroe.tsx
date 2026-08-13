// El heroe de las pantallas publicas, recuperado del Vite el 2026-08-13.
//
// `bg-gradient-hero` y el halo radial estaban DECLARADOS en globals.css desde
// la tanda 0 y no los llamaba nadie: la utilidad existia, el color existia, y
// la landing abria con un <h1> negro sobre el gris de fondo. Comparando las
// dos versiones en un navegador, esto es lo que mas distancia marcaba -el
// Vite abria con una franja carmesi a sangre de casi toda la altura de
// pantalla-.
//
// Dos variantes porque el Vite tenia dos: la landing usaba casi la pantalla
// entera con el halo desplazado a la izquierda
// (MIGRATION_GUIDE/src/pages/Index.tsx:75), y la FAQ una franja mas baja con
// el halo abajo y centrado (MIGRATION_GUIDE/src/pages/FAQ.tsx:42).
//
// `100svh` y no `100vh`: en un movil la barra del navegador entra y sale, y
// `vh` mide la ventana con la barra ESCONDIDA, asi que un heroe a `100vh`
// deja el boton por debajo del pliegue hasta que el usuario se desplaza. Es
// lo que ya usaba el Vite.
//
// Se descuenta la cabecera, que es `sticky` y mide h-20 en movil y h-24 desde
// `sm` -components/cabecera.tsx-. El Vite descontaba `4rem` porque la suya
// media h-16; aqui son 5rem y 6rem.
type HeroeProps = {
  variante?: "portada" | "seccion";
  children: React.ReactNode;
};

export function Heroe({ variante = "portada", children }: HeroeProps) {
  const esPortada = variante === "portada";

  return (
    <section
      className={
        esPortada
          ? "bg-gradient-hero relative flex min-h-[calc(100svh-5rem)] items-center overflow-hidden py-24 sm:min-h-[calc(100svh-6rem)] sm:py-32"
          : "bg-gradient-hero relative overflow-hidden py-16 sm:py-20"
      }
    >
      {/* El halo. `aria-hidden` no hace falta en un div sin texto, pero
          `pointer-events-none` si: cubre el ancho entero por encima del
          contenido y sin el se comeria los clics de los botones. */}
      <div
        className={
          esPortada
            ? "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(354_72%_50%/0.3),transparent_70%)]"
            : "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(354_72%_50%/0.2),transparent_70%)]"
        }
      />
      <div className="container relative text-center">{children}</div>
    </section>
  );
}

// El rotulo pequeno de encima del titular. En el Vite era una pildora en la
// portada y un antetitulo en versalitas en la FAQ; se conservan los dos.
export function HeroePildora({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground mb-4 inline-block rounded-full border px-4 py-1.5 text-xs font-medium tracking-wide">
      {children}
    </span>
  );
}

export function HeroeAntetitulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-primary-foreground/80 mb-4 text-[11px] font-semibold tracking-[0.22em] uppercase">
      {children}
    </p>
  );
}

// El titular. `text-primary-foreground` y no `text-white`: es el mismo blanco
// -hsl(0 0% 100%)- pero sale del token, asi que si algun dia el rojo de marca
// cambiara a uno que pidiera texto oscuro, esto lo seguiria.
export function HeroeTitular({ children }: { children: React.ReactNode }) {
  return (
    // Sin `leading-tight`: `text-6xl` ya trae interlineado 1, y anadir 1.25
    // encima lo AFLOJABA -60px de cuerpo con 75 de interlineado, donde el
    // original media 60/60-. El original tambien escribia `leading-tight`,
    // pero en su orden de clases ganaba el interlineado del tamano; aqui
    // ganaba el otro. Se quita para no depender de ese desempate.
    <h1 className="font-display text-primary-foreground mx-auto max-w-3xl text-4xl font-bold text-balance sm:text-5xl lg:text-6xl">
      {children}
    </h1>
  );
}

export function HeroeBajada({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-primary-foreground/75 mx-auto mt-6 max-w-xl text-lg">
      {children}
    </p>
  );
}

export function HeroeAcciones({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
      {children}
    </div>
  );
}
