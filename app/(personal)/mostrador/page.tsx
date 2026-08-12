// El mostrador, Task 1 de la tanda 3A. Esta pagina no esta en ninguna lista
// de tareas del plan (FASE_2_TANDA_3A.md): su "Estructura de archivos" la
// menciona y la Task 5 dice "Modify", pero ninguna tarea la crea. Sin ella el
// grupo (personal) no aporta ni una ruta al build, y el andamio de la Task 1
// no se puede abrir en un navegador -que es justo lo que este proyecto exige
// verificar en cada tanda-. Correccion anotada aqui, no en el plan.
//
// Server Component, sin "use client", como el resto de paginas del proyecto:
// no lleva estado ni manejadores de evento propios.
export default function MostradorPage() {
  return (
    <main className="container flex-1 py-12">
      <h1 className="font-display text-upc-red text-4xl">Mostrador</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl">
        Las tres columnas del mostrador —por entregar, activas y por devolver— llegan en las
        siguientes tareas de esta tanda. Por ahora esta pantalla solo confirma que la sesión y el
        acceso del personal ya funcionan.
      </p>
    </main>
  );
}
