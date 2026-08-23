"use client";

import { setNonce } from "get-nonce";

// LE DA A RADIX EL NONCE DE LA PETICION, para que la hoja <style> del
// scroll-lock nazca con el y la CSP no la rechace. Es la cura de Q-20 que no es
// peor que la enfermedad: no toca la politica, solo hace que el estilo llegue
// acreditado.
//
// CUBRE UN MECANISMO DE LOS DOS. El scroll-lock pasa por `react-style-singleton`
// y `get-nonce`, y este lo alcanza; el viewport del Select lo inserta React DOM
// y NINGUNA llamada lo alcanza. Lo que queda es cosmetico. El detalle medido, y
// por que las dos alternativas son peores, en COMPORTAMIENTO_MEDIDO.md §6.1.

type NonceRadixProps = {
  nonce: string;
};

export function NonceRadix({ nonce }: NonceRadixProps) {
  // DURANTE EL RENDER y no en un `useEffect`: `react-style-singleton` crea el
  // <style> UNA SOLA VEZ, asi que un nonce que llegue despues no arregla nada.
  //
  // Es idempotente -solo asigna una variable de modulo-, asi que repetirlo en
  // cada render no cuesta nada.
  setNonce(nonce);

  // No pinta nada: existe solo por su efecto. Va en un componente propio porque
  // `setNonce` tiene que correr EN EL NAVEGADOR y el layout raiz es un Server
  // Component.
  return null;
}
