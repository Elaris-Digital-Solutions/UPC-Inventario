// PROVISIONAL — sonda de la tanda 0 para comprobar que los tokens del Vite
// llegan a Tailwind 4. Esta tanda no deja pantallas: se borra en la Task 6.
export default function Home() {
  return (
    <main className="container py-16">
      <h1 className="font-display text-4xl text-upc-red">UPC-Inventario</h1>
      <p className="text-muted-foreground font-sans">
        Sonda de tokens. Montserrat en el cuerpo, Playfair en el titulo.
      </p>
      <div className="bg-primary text-primary-foreground rounded-lg shadow-card p-6 mt-6">
        bg-primary con shadow-card y rounded-lg
      </div>
      <div className="dark mt-6">
        <div className="bg-background text-foreground border p-6 rounded-md">
          Bloque en modo oscuro
        </div>
      </div>
      <p className="text-gradient-upc text-3xl font-display mt-6">
        Utilidad text-gradient-upc
      </p>
    </main>
  );
}
