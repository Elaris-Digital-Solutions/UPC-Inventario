// Las seis opciones fijas de motivo.
//
// EN SU PROPIO ARCHIVO Y NO EN acciones.ts por un motivo tecnico: aquel lleva
// `'use server'`, y Next exige que TODO lo que ese archivo exporte sea una
// funcion async -una constante exportada ahi no compila-. Esta lista la
// necesitan un Client Component, para pintar los radios, y la Server Action,
// para validar lo que llega.
//
// FIJAS Y NO TEXTO LIBRE: el panel del personal las muestra, y un desplegable
// cerrado deja el dato comparable entre reservas.
//
// `purpose` es `text` NULLABLE y sin ningun CHECK, asi que esta lista es una
// regla de la APLICACION y no del motor: relajarla a texto libre no exigiria
// ninguna migracion.
export const MOTIVOS = [
  "Práctica de laboratorio",
  "Proyecto de curso",
  "Trabajo de investigación",
  "Tesis",
  "Actividad extracurricular",
  "Otro",
] as const;

export type Motivo = (typeof MOTIVOS)[number];
