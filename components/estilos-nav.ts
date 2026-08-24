// La tipografia de la navegacion.
//
// EN UN MODULO APARTE y no repetida en las tres cabeceras porque es el tipo de
// valor que se desincroniza: se ajusta el `tracking` en una, se olvida en las
// otras dos, y solo se nota comparando dos pantallas lado a lado.
//
// CONSTANTES DE CLASES Y NO COMPONENTES: se aplican SOBRE el <Button> que ya
// habia, asi que el foco por teclado, el `asChild` y los `data-slot` de shadcn
// siguen intactos y lo unico que cambia es como se ve.

// Enlaces de navegacion: versalitas pequenas y muy espaciadas.
export const ENLACE_NAV =
  "text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground";

// `rounded-none` es EL rasgo: ese rectangulo recto contra las esquinas
// redondeadas del resto es parte de la personalidad del producto.
export const ACCION_NAV =
  "rounded-none px-6 text-[11px] font-semibold uppercase tracking-[0.22em]";

// La misma pareja para el panel movil, donde los controles se apilan y van
// alineados a la izquierda en vez de centrados.
export const ENLACE_NAV_MOVIL = `${ENLACE_NAV} justify-start`;
export const ACCION_NAV_MOVIL = `${ACCION_NAV} justify-start`;
