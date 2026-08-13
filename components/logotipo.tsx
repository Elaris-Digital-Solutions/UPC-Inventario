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
// El texto "UPC-Inventario" NO se toca. El original decia "Reserva UPC /
// Sistema de Prestamos" y esto es OTRO nombre, pero los textos de interfaz no
// se reescriben desde la capa visual: queda preguntado y, mientras tanto, el
// logo se SUMA al texto que ya habia en vez de sustituirlo.
//
// `alt=""` a proposito: el nombre del servicio ya lo dice el texto de al
// lado, asi que describir la imagen otra vez le haria leer lo mismo dos veces
// a quien use un lector de pantalla. La imagen es decorativa; el enlace no, y
// ese si tiene texto.
type LogotipoProps = {
  // El pie lo quiere mas pequeno y sin el texto, igual que en el Vite
  // (MIGRATION_GUIDE/src/components/Footer.tsx:8), donde el nombre de la
  // universidad iba al lado en vez del nombre del sistema.
  tamano?: "cabecera" | "pie";
};

export function Logotipo({ tamano = "cabecera" }: LogotipoProps) {
  const esPie = tamano === "pie";

  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-3 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Image
        src="/upc-logo.png"
        alt=""
        width={600}
        height={600}
        // `priority` solo en la cabecera: esta sobre el pliegue en las once
        // pantallas. El del pie no, que llega cuando ya se bajo hasta abajo.
        priority={!esPie}
        className={esPie ? "h-8 w-auto opacity-70" : "h-9 w-auto sm:h-11"}
      />
      {!esPie && (
        <span className="font-display text-upc-red text-lg leading-none font-bold sm:text-xl">
          UPC-Inventario
        </span>
      )}
    </Link>
  );
}
