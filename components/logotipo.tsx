import Image from "next/image";
import Link from "next/link";

// El logotipo, compartido por las tres cabeceras y el pie.
//
// Existe porque la marca se habia PERDIDO ENTERA en la migracion, no
// encogido: `upc-logo.png` vivia en `src/assets/` del Vite -o sea DENTRO del
// bundle, no en `public/`- y por eso no viajo con los otros cinco estaticos,
// que si estan y son identicos byte a byte. Se recupero a `public/` el
// 2026-08-13.
//
// EL ROTULO, corregido el 2026-08-13 con las dos versiones abiertas al lado:
// aqui decia "UPC-Inventario" en Playfair a 20px, y el original es un rotulo
// de DOS LINEAS en Montserrat diminuto, separado del logo por una regla
// vertical (MIGRATION_GUIDE/src/components/Header.tsx:28-38). Medido en un
// navegador:
//
//   linea 1   "Reserva UPC"           11px / 600 / track 2.42px / gris 900
//   linea 2   "Sistema de Prestamos"  10px / 400 / track 1.80px / gris 400
//   logo      48px de alto            cabecera 96px
//
// Los 20px en serif eran, con diferencia, la letra mas grande de la cabecera
// donde el original tiene la mas pequena. Ese contraste -marca diminuta,
// titular enorme- es medio caracter del producto.
//
// EL NOMBRE CAMBIA, y es una decision del proyecto y no mia: el producto se
// llama "Reserva UPC · Sistema de Prestamos", no "UPC-Inventario", que era el
// nombre del repositorio colado a la interfaz. Queda pendiente decidir si el
// <title> del documento (app/layout.tsx) y los textos que nombran al servicio
// en el pie y en la FAQ tienen que seguirlo.
//
// `alt=""` a proposito: el nombre del servicio ya lo dice el rotulo de al
// lado, asi que describir la imagen otra vez le haria leer lo mismo dos veces
// a quien use un lector de pantalla. La imagen es decorativa; el enlace no, y
// ese si tiene texto.
type LogotipoProps = {
  // El pie lo quiere mas pequeno y sin el rotulo, igual que en el Vite
  // (MIGRATION_GUIDE/src/components/Footer.tsx:8), donde al lado iba el
  // nombre de la universidad y no el del sistema.
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
      {/* Oculto por debajo de `sm`, igual que el original: en un telefono el
          rotulo competia por sitio con el boton de menu, y el logo solo ya
          identifica de sobra. */}
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
