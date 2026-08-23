// El antetitulo de seccion: regla roja a la izquierda, etiqueta diminuta en
// versalitas espaciadas y el titular en Playfair debajo.
//
// Es el rasgo MAS reconocible del producto original y se habia perdido entero:
// en todo el arbol Next no habia una sola utilidad `tracking-`, ni un
// `uppercase`, ni un tamaño por debajo de `text-xs`. Se recoge UNA vez para que
// todas las pantallas lo escriban igual.
//
// Los colores salen de TOKENS y no de la escala de grises de Tailwind: el gris de
// fabrica no es el gris de este sistema, y mezclarlos rompe el modo oscuro sin
// que nadie lo note.
type AntetituloProps = {
  children: React.ReactNode;
};

export function Antetitulo({ children }: AntetituloProps) {
  return (
    // `0.35em` y no `0.3em`: medido contra el original, 3.5px a 10px de cuerpo.
    <p className="border-primary text-muted-foreground border-l-2 pl-3 text-[10px] font-semibold tracking-[0.35em] uppercase">
      {children}
    </p>
  );
}

// El titular que va debajo del antetitulo. Se ofrece junto porque el par es
// el patron: un antetitulo suelto sin titular no significa nada, y un titular
// sin antetitulo es lo que ya habia.
type TituloSeccionProps = {
  children: React.ReactNode;
  // `h2` por defecto: la landing lo usa bajo el h1 del heroe, y las pantallas con
  // sesion no tienen heroe, asi que alli es el h1.
  como?: "h1" | "h2";
};

export function TituloSeccion({ children, como = "h2" }: TituloSeccionProps) {
  const Etiqueta = como;

  return (
    // 36px que suben a 48, medido contra el original. Doce pixeles menos en TODOS
    // los encabezados es de lo que mas aplana una pagina sin que se pueda señalar
    // un culpable concreto.
    //
    // Y SIN `leading-tight`: las utilidades de tamaño de Tailwind ya traen su
    // interlineado -`text-5xl` viene con 1-, asi que añadirlo (1.25) lo AFLOJA.
    <Etiqueta className="font-display mt-4 text-4xl font-bold text-balance sm:text-5xl">
      {children}
    </Etiqueta>
  );
}

// El par completo, que es como se usa el 90% de las veces.
type EncabezadoSeccionProps = {
  antetitulo: string;
  titulo: React.ReactNode;
  como?: "h1" | "h2";
  className?: string;
};

export function EncabezadoSeccion({
  antetitulo,
  titulo,
  como = "h2",
  className,
}: EncabezadoSeccionProps) {
  return (
    <div className={className}>
      <Antetitulo>{antetitulo}</Antetitulo>
      <TituloSeccion como={como}>{titulo}</TituloSeccion>
    </div>
  );
}
