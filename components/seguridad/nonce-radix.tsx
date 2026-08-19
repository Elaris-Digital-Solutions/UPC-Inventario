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
// Y explica de paso por que Q-20 tenia DOS hashes: el Dialog y el Select
// importan EL MISMO `RemoveScroll`, asi que no eran dos problemas sino dos
// hojas del mismo inyector. Una sola llamada cubre las dos.

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
