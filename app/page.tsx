// Marcador de posicion de la tanda 0. NO es la landing.
//
// La tanda 0 no construye ni una pantalla de negocio -ni catalogo, ni login, ni
// panel-: solo deja el stack en pie. La landing como vitrina publica es la
// tarea 2.5, en la tanda 2, y va con D-21: muestra catalogo, no disponibilidad.
//
// Esta pagina existe para que `/` responda y se vea que Next.js, Tailwind y los
// tokens arrancan. La sonda que verificaba los tokens uno a uno vivio aqui
// mientras se median, y se retiro al confirmarlos en el CSS compilado.
export default function Home() {
  return (
    <main className="container flex flex-1 flex-col justify-center py-16">
      <p className="text-muted-foreground text-sm">Fase 2 · tanda 0</p>
      <h1 className="font-display text-upc-red mt-2 text-4xl">
        UPC-Inventario
      </h1>
      <p className="text-muted-foreground mt-4 max-w-prose">
        Los cimientos estan puestos y todavia no hay ninguna pantalla. El estado
        del proyecto vive en <code>MIGRATION_DOCS/ESTADO_Y_PLAN.md</code>.
      </p>
    </main>
  );
}
