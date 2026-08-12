// Las seis opciones fijas de motivo, Task 10 de la tanda 2B.
//
// Vive en su propio archivo y no dentro de acciones.ts, por un motivo tecnico
// y no de gusto: acciones.ts lleva `'use server'` en la cabecera, y Next
// exige que TODO lo que ese archivo exporte sea una funcion async -una
// constante exportada ahi no compila-. Esta lista la necesitan DOS sitios que
// no comparten esa restriccion: el componente de cliente
// (components/reservas/formulario-reserva.tsx), para pintar el grupo de
// radios, y la Server Action (lib/reservas/acciones.ts), para validar que el
// valor recibido sea uno de los seis. De ahi que tenga que ser un archivo
// aparte, sin `'use server'`, importable desde los dos.
//
// Son las seis opciones del sistema Vite anterior
// (MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md §F3, paso 5), y se conservan
// fijas en vez de texto libre por dos motivos que se sostienen entre si: el
// panel del personal las muestra (§F6, "propósito" en la fila expandible), y
// un desplegable cerrado deja el dato comparable entre reservas -un campo de
// texto libre no se puede agrupar ni filtrar con sentido-.
//
// La columna `inventory_reservations.purpose` es `text` NULLABLE y no tiene
// ningun `CHECK`: la base acepta cualquier texto, asi que esta lista es una
// regla de la APLICACION y no del motor. Si algun dia se quisiera relajar a
// texto libre, no haria falta ninguna migracion -la base ya lo permite-, solo
// cambiar esta pantalla. Decidido con Alejandro el 2026-08-11.
export const MOTIVOS = [
  "Práctica de laboratorio",
  "Proyecto de curso",
  "Trabajo de investigación",
  "Tesis",
  "Actividad extracurricular",
  "Otro",
] as const;

export type Motivo = (typeof MOTIVOS)[number];
