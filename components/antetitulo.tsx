// El antetitulo de seccion: regla roja de 2px a la izquierda y una etiqueta
// diminuta en versalitas muy espaciadas, con el titular en Playfair debajo.
//
// Es el rasgo MAS reconocible del producto original y se habia perdido
// entero. Medido el 2026-08-13: en todo el arbol Next no habia una sola
// utilidad `tracking-`, ni un `uppercase`, ni un tamano por debajo de
// `text-xs`. La jerarquia se resolvia solo con tamano y color, que es
// exactamente lo que hace que dos pantallas distintas se parezcan a
// cualquier panel de administracion y no a este.
//
// El Vite lo usaba en los encabezados de seccion de la landing
// (MIGRATION_GUIDE/src/pages/Index.tsx:116 y 178), en la navegacion, en los
// contadores de categoria y en las llamadas a la accion. Aqui se recoge una
// sola vez para que las once pantallas lo escriban igual en vez de que cada
// una invente su propio tamano y espaciado.
//
// Los colores salen de tokens -`text-muted-foreground`, `border-primary`- y
// no de la escala de grises de Tailwind que usaba el original
// -`text-gray-500`-: el gris de fabrica no es el gris de este sistema, y
// mezclarlos es como se rompe el modo oscuro sin que nadie lo note.
type AntetituloProps = {
  children: React.ReactNode;
};

export function Antetitulo({ children }: AntetituloProps) {
  return (
    // `0.35em` y no `0.3em`: medido contra el original en un navegador el
    // 2026-08-13, `letter-spacing` calculado 3.5px a 10px de cuerpo.
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
  // `h2` por defecto. La landing lo usa como h2 bajo el h1 del heroe; las
  // pantallas con sesion no tienen heroe y ahi es el h1 de la pagina.
  como?: "h1" | "h2";
};

export function TituloSeccion({ children, como = "h2" }: TituloSeccionProps) {
  const Etiqueta = como;

  return (
    // `text-4xl sm:text-5xl` -36px que suben a 48- y no `text-3xl sm:text-4xl`.
    // Medido contra el original: sus h2 de seccion calculaban 48px a 1197 de
    // viewport, y aqui salian 36. Doce pixeles menos en TODOS los encabezados
    // de seccion es de las cosas que mas aplanan una pagina sin que se pueda
    // senalar un elemento concreto como culpable.
    //
    // Y SIN `leading-tight`: las utilidades de tamano de Tailwind ya traen su
    // propio interlineado -`text-5xl` viene con 1-, asi que anadir
    // `leading-tight` (1.25) lo AFLOJA en vez de apretarlo. Es lo que pasaba
    // en el heroe: 60px de cuerpo con 75 de interlineado donde el original
    // tenia 60.
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
