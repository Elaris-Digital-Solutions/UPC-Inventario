// La tipografia de la navegacion, recuperada del Vite el 2026-08-13.
//
// El original escribia TODOS sus enlaces de cabecera en versalitas de 11px
// con `tracking-[0.22em]`, y la llamada a la accion en un rectangulo rojo SIN
// redondear (MIGRATION_GUIDE/src/components/Header.tsx:45 y 68). Aqui iban en
// caja y minusculas, que es el aspecto por defecto de shadcn y el que hacia
// que la cabecera se leyera como una barra de herramientas.
//
// Vive en un modulo aparte y no repetido en las tres cabeceras porque es
// exactamente el tipo de valor que se desincroniza: se ajusta el `tracking`
// en una, se olvida en las otras dos, y solo se nota comparando dos pantallas
// una al lado de la otra.
//
// Son constantes de clases y no componentes a proposito: se aplican SOBRE el
// <Button> que ya habia, via `className`, en vez de sustituirlo por un <a>
// suelto como hacia el Vite. Asi el foco por teclado, el `asChild` y los
// `data-slot` de shadcn siguen intactos -que es lo que la capa visual no
// puede tocar- y lo unico que cambia es como se ve.

// Enlaces de navegacion: versalitas pequenas y muy espaciadas.
export const ENLACE_NAV =
  "text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground";

// La llamada a la accion. `rounded-none` es el rasgo: el Vite no le daba
// radio ninguno, y ese rectangulo recto contra las esquinas redondeadas del
// resto es parte de la personalidad del producto.
export const ACCION_NAV =
  "rounded-none px-6 text-[11px] font-semibold uppercase tracking-[0.22em]";

// La misma pareja para el panel movil, donde los controles se apilan y van
// alineados a la izquierda en vez de centrados.
export const ENLACE_NAV_MOVIL = `${ENLACE_NAV} justify-start`;
export const ACCION_NAV_MOVIL = `${ACCION_NAV} justify-start`;
