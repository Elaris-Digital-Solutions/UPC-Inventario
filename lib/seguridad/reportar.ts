import * as Sentry from '@sentry/nextjs';

// H-3 de la auditoria del 2026-08-23: el crudo del motor cambia de
// destinatario, no desaparece.
//
// DOS MENSAJES Y NO UNO, unidos por un id de correlacion:
//
//   - al usuario ....... generico MAS el id, y nada del sistema.
//   - al log ........... el crudo entero, bajo ese mismo id.
//
// POR QUE HACIA FALTA. Los errores de Postgres y PostgREST son reveladores POR
// DISENO: traen tabla, columna y nombre de constraint. Antes de este archivo, 14
// sitios devolvian `error.message` tal cual como valor de retorno de una Server
// Action, o sea directo al navegador. Trece solo los alcanza personal
// autenticado -para quien el nombre de una tabla no es un secreto-, y el
// decimocuarto es `guardarEncuesta()`, que se lo devolvia a CUALQUIER ALUMNO.
//
// ─────────────────────────────────────────────────────────────────────────────
// LO QUE ESTE ARCHIVO NO TIRA, y es la mitad importante.
//
// La regla 1 de lib/admin/acciones.ts y de lib/reservas/acciones.ts decia que lo
// no traducido cae al mensaje CRUDO del motor y "nunca a un generico", con un
// argumento que sigue siendo bueno: UN MAPA DE TRADUCCIONES QUE SE QUEDA VIEJO
// TIENE QUE VERSE, y un texto amable que lo disimule es peor que un crudo feo.
//
// Ese argumento se conserva ENTERO. Lo que cambia es donde se ve: el crudo sigue
// estando completo, en el log, y el id es lo que lo une al generico que vio el
// usuario. Antes se elegia entre "diagnosticable" y "no revelador"; con el id no
// hay que elegir.
//
// SIN ESE ID ESTO SERIA UN RETROCESO: un generico a secas convierte cada fallo
// en "algo salio mal" y hace INDIAGNOSTICABLE justo lo que la regla 1 queria
// mantener visible. El id es lo que hace que el cambio sea neutro para quien
// depura y una mejora para quien mira desde fuera.
//
// ─────────────────────────────────────────────────────────────────────────────
// OCHO CARACTERES y no un uuid entero: esto lo va a leer en voz alta un alumno
// por telefono o lo va a copiar de una captura. 16^8 son 4 300 millones de
// combinaciones, de sobra para no colisionar dentro de una misma jornada de
// soporte, que es la unica ventana en la que dos ids tienen que distinguirse.
//
// `crypto.randomUUID()` GLOBAL y no el de `node:crypto`: es la Web Crypto API,
// que existe en Node desde la 19 -aca corre la 22- y tambien en el runtime edge.
// Importar de `node:crypto` ataria este modulo a Node sin necesidad.
//
// SENTRY ENTRO EL MISMO DIA (H-4) y no hubo que tocar ninguno de los 14 sitios
// que llaman aqui: ese es el motivo de que esto fuera una funcion desde el
// principio y no 14 bloques repetidos.
//
// LO QUE NUNCA DEBE ENTRAR EN `contexto`: nada de correos, nombres, carreras,
// cookies ni cabeceras de autorizacion. El parametro es para decir DONDE fallo
// -el nombre de la funcion-, no QUIEN lo provoco. Los 14 sitios pasan un nombre
// de funcion literal, escrito en el codigo, asi que no hay forma de que un dato
// del usuario se cuele por aqui.
export function reportar(contexto: string, error: { message: string }): string {
  const id = crypto.randomUUID().slice(0, 8);

  // `console.error` y no `console.log`: en un hosting serverless los dos van al
  // mismo sitio, pero el nivel es lo que permite filtrar despues.
  //
  // SE QUEDA AUNQUE HAYA SENTRY, y no es redundancia: sin DSN configurado -en
  // local, en el CI y en cualquier clon- esta linea es lo UNICO que queda. Un
  // reportar() que solo hablara con Sentry seria mudo justo donde mas se depura.
  console.error(`[${id}] ${contexto}: ${error.message}`);

  // EL ID VA COMO TAG, y es lo que hace util el id: quien reciba "Código de
  // referencia: a3f9c012" por telefono lo pega en el buscador de Sentry y cae en
  // el evento. Sin el tag, el id seria un numero bonito que no lleva a ninguna
  // parte.
  //
  // Si no hay DSN, `Sentry.init` quedo inerte y esto no hace nada ni falla.
  Sentry.captureException(error, { tags: { correlacion: id, contexto } });

  // El texto NO dice que fallo ni por que. Lo unico accionable para quien lo lee
  // es el id, y por eso va al final y con nombre: es lo que tiene que dictar.
  return `No se pudo completar la operación. Código de referencia: ${id}`;
}
