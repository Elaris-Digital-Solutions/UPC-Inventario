"use client";

import { setNonce } from "get-nonce";

// LE DA A RADIX EL NONCE DE LA PETICION, para que la hoja <style> que inyecta
// para bloquear el scroll nazca con el y la CSP no la rechace. Es la tercera
// cura de Q-20, y la unica que no es peor que la enfermedad.
//
// LA CADENA, leida en las dependencias instaladas el 2026-08-19:
//
//   @radix-ui/react-dialog  ->  react-remove-scroll
//   @radix-ui/react-select  ->  react-remove-scroll
//                                 -> react-remove-scroll-bar
//                                     -> react-style-singleton  ->  get-nonce
//
// `react-style-singleton/dist/es2015/singleton.js` crea el <style> con
// `document.createElement('style')` y le pone el atributo `nonce` SI
// `getNonce()` devuelve algo. `get-nonce` expone `setNonce()` para fijarlo.
//
// POR QUE ESTO ES MEJOR QUE LAS DOS CURAS QUE Q-20 YA CONOCIA:
//   - El HASH casa hasta que Radix cambie un byte de ese CSS, y entonces el
//     bloqueo vuelve EN SILENCIO, sin que ningun comando se ponga rojo. Y ya
//     no es un hash: son dos, medidos, y pueden ser mas.
//   - `'unsafe-inline'` desarma lo que D-56 construyo.
//   - Esto NO TOCA LA POLITICA. `lib/seguridad/csp.ts` queda igual: lo que
//     cambia es que el estilo llega acreditado.
//
// OJO -- CORREGIDO EL 2026-08-19, EL MISMO DIA EN QUE SE ESCRIBIO. Aca decia
// que el Dialog y el Select "no eran dos problemas sino dos hojas del mismo
// inyector, y una sola llamada cubre las dos". ES FALSO. La cadena de arriba
// describe UN mecanismo, no los dos, y medirlo lo separo de la deduccion:
//
//   scroll-lock del <body>        -> react-style-singleton via get-nonce -> SI
//   [data-radix-select-viewport]  -> lo renderiza @radix-ui/react-select  -> NO
//                                    EN JSX con dangerouslySetInnerHTML
//                                    -su dist/index.mjs:733- y lo inserta
//                                    React DOM, fuera del alcance de get-nonce
//
// O sea que `setNonce()` cubre el primero y NINGUNA llamada alcanza al segundo.
// La violacion de CSP que queda es de ese segundo mecanismo, y su efecto es
// cosmetico: se ve la barra de desplazamiento del desplegable.
//
// LA LECCION, y por eso queda escrita aca y no solo en el documento: la version
// anterior de este parrafo era una LECTURA DEL CODIGO de la dependencia
// presentada como mecanismo completo. La correccion se escribio el mismo dia en
// ESTADO_Y_PLAN.md, en el plan de la F3-T3 y en PLANES/README.md, y ESTE
// ARCHIVO SE QUEDO SIN CORREGIR -- corregir una afirmacion caducada en un sitio
// no la corrige en los otros, y la copia que vive en el codigo es la que nadie
// relee. Ningun comando la habria puesto roja: `lint` no lee prosa.

type NonceRadixProps = {
  nonce: string;
};

export function NonceRadix({ nonce }: NonceRadixProps) {
  // DURANTE EL RENDER y no en un `useEffect`, y el motivo es medido, no
  // estetico: `react-style-singleton` crea el <style> UNA SOLA VEZ -- su
  // contador arranca en 0 y solo entonces llama a `makeStyleTag()` -- y NO lo
  // vuelve a crear. Un nonce que llegue despues de que la hoja ya exista no
  // arregla nada, porque no hay una segunda hoja que acreditar.
  //
  // La llamada es idempotente: `setNonce` solo asigna una variable de modulo,
  // asi que repetirla en cada render no cuesta nada ni acumula estado.
  setNonce(nonce);

  // No pinta nada: existe solo por su efecto. Va en un componente propio, y no
  // suelto en el layout, porque `setNonce` tiene que correr EN EL NAVEGADOR --
  // la hoja la inyecta el cliente -- y el layout raiz es un Server Component.
  return null;
}
