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
// EL ROTULO NOMBRA DOS COSAS, no una: arriba QUIEN es dueño del sistema
// -Ciencias de la Computacion - UPC- y abajo QUE es -Gestion de Dispositivos-.
// Antes decia "Reserva UPC / Sistema de Prestamos"; cambiado el 2026-09-25.
//
// ESTE ROTULO ES LA FUENTE DEL NOMBRE, y lo siguen ya los otros cuatro sitios
// donde el producto se nombra: el pie (components/pie.tsx), el <title> raiz
// (app/layout.tsx), el de la FAQ y el manifest de la aplicacion instalable
// (app/manifest.ts). Si vuelve a cambiar, se cambian los cinco de una vez.
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
      {/* OCULTO POR DEBAJO DE `xl` y no de `sm`, subido el 2026-09-25 con el
          rotulo nuevo. Medido con Playwright a cinco anchos: el rotulo paso de
          ~120px a 376px -"Ciencias de la Computacion - UPC" son 32 caracteres
          con `tracking-[0.22em]`-, y con el visible desde `sm` la cabecera del
          alumno DESBORDABA 230px a 768 y 98px a 900, y la del personal 56px a
          768. El logo solo ya identifica de sobra; el Vite lo escondia por el
          mismo motivo, solo que su rotulo era corto y le bastaba `sm`. */}
      <div className="border-border hidden border-l pl-4 xl:block">
        <p className="text-foreground text-[11px] leading-tight font-semibold tracking-[0.22em] uppercase">
          Ciencias de la Computación - UPC
        </p>
        <p className="text-muted-foreground mt-0.5 text-[10px] leading-tight tracking-[0.18em] uppercase">
          Gestión de Dispositivos
        </p>
      </div>
    </Link>
  );
}
