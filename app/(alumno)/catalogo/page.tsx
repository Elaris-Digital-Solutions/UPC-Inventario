// Marcador de posicion de la tanda 1. NO es el catalogo.
//
// El catalogo de verdad es la tanda 2. Esta pagina existe solo para que
// app/(alumno)/layout.tsx cubra algo y se pueda comprobar que el rebote por
// perfil incompleto funciona: un layout sin ninguna pagina debajo es codigo
// muerto que no se puede verificar.
//
// Y no muestra disponibilidad (D-21): eso tampoco es de esta tanda.
export default function CatalogoPage() {
  return (
    <main className="container flex flex-1 flex-col justify-center py-16">
      <h1 className="font-display text-upc-red text-4xl">Catálogo</h1>
      <p className="text-muted-foreground mt-4 max-w-prose">
        El catálogo llega en la tanda 2.
      </p>
    </main>
  );
}
