import Image from "next/image";
import Link from "next/link";

// El logotipo, compartido por las tres cabeceras y el pie.
//
// LA MARCA SE HABIA PERDIDO ENTERA en la migracion, no encogido: `upc-logo.png`
// vivia dentro del bundle del Vite y no en `public/`, asi que no viajo con los
// otros estaticos.
//
// EL ROTULO ES DE DOS LINEAS EN MONTSERRAT DIMINUTO, no un titulo en serif.
// Medido contra el original: 11px y 10px, separado del logo por una regla
// vertical. Ese contraste -marca diminuta, titular enorme- es medio caracter del
// producto; los 20px en serif que habia eran la letra mas grande de la cabecera
// donde el original tiene la mas pequeña.
//
// EL PRODUCTO SE LLAMA "Reserva UPC · Sistema de Prestamos". "UPC-Inventario" era
// el nombre del REPOSITORIO colado a la interfaz, y ya no aparece en ninguna
// pantalla: el <title>, el pie y la FAQ siguen este mismo nombre.
//
// `alt=""` a proposito: el rotulo de al lado ya dice el nombre, asi que
// describir la imagen le haria leer lo mismo dos veces a un lector de pantalla.
// La imagen es decorativa; el enlace no, y ese si tiene texto.
type LogotipoProps = {
  // El pie lo quiere mas pequeño y sin rotulo: alli al lado va el nombre de la
  // universidad, no el del sistema.
  tamano?: "cabecera" | "pie";
};

export function Logotipo({ tamano = "cabecera" }: LogotipoProps) {
  if (tamano === "pie") {
    return (
      <Link
        href="/"
        className="flex shrink-0 items-center rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Image
          src="/upc-logo.png"
          alt=""
          width={600}
          height={600}
          className="h-8 w-auto opacity-70"
        />
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-4 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Image
        src="/upc-logo.png"
        alt=""
        width={600}
        height={600}
        priority
        className="h-10 w-auto sm:h-12"
      />
      {/* Oculto por debajo de `sm`: en un telefono competia por sitio con el
          boton de menu, y el logo solo ya identifica de sobra. */}
      <div className="border-border hidden border-l pl-4 sm:block">
        <p className="text-foreground text-[11px] leading-tight font-semibold tracking-[0.22em] uppercase">
          Reserva UPC
        </p>
        <p className="text-muted-foreground mt-0.5 text-[10px] leading-tight tracking-[0.18em] uppercase">
          Sistema de Préstamos
        </p>
      </div>
    </Link>
  );
}
