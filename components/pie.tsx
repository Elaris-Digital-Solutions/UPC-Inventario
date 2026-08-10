import Link from "next/link";

// El pie, compartido por las pantallas publicas y las del alumno.
//
// Deliberadamente minimo: el nombre del servicio y el enlace a las reglas. No
// promete horarios ni disponibilidad, que es lo mismo que se le pide a la
// vitrina (D-21) y por el mismo motivo -un dato repetido en el pie es un dato
// mas que se queda viejo sin que nadie lo mire-.
export function Pie() {
  return (
    <footer className="border-border/60 mt-auto border-t">
      <div className="container flex flex-col items-center justify-between gap-2 py-6 text-sm sm:flex-row">
        <p className="text-muted-foreground">
          UPC-Inventario · Préstamo de equipamiento para alumnos
        </p>
        <Link
          href="/faq"
          className="text-primary underline-offset-4 hover:underline"
        >
          Cómo funciona
        </Link>
      </div>
    </footer>
  );
}
