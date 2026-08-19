"use client";

import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// La miniatura de un producto que se amplia SIN SALIR DE LA PANTALLA (F3-T3).
//
// UNA SOLA IMPLEMENTACION para las dos pantallas que la usan -- la lista de
// inventario y el mostrador --, por el mismo motivo que imagenPrincipal() vive
// en un modulo propio: dos copias de "como se amplia una foto" divergen.
//
// SE MONTA SOBRE components/ui/dialog.tsx, QUE YA EXISTE, y no sobre un overlay
// propio. Radix trae resueltos el portal, el atrapado de foco, el `aria-modal`
// y el cierre con Escape; reescribirlos a mano habria cambiado deuda de CSP
// -- Q-20, que esta tanda mide en su Tarea 5 -- por deuda de accesibilidad, y
// la segunda no la vigila ningun comando.

type MiniaturaAmpliableProps = {
  // La URL de la imagen, o `null` si el producto no tiene ninguna. El
  // componente decide que hacer con el `null`; quien llama no tiene que
  // acordarse de poner el placeholder.
  src: string | null;
  // Con que se identifica la imagen. Es el nombre del producto en las dos
  // pantallas: en una tabla y en una tarjeta, la miniatura ES el identificador
  // visual de la fila, asi que un `alt` vacio la escondaria de quien no la ve.
  alt: string;
  // El lado de la miniatura en pixeles. Lo decide quien llama porque las dos
  // pantallas tienen densidades distintas, y no es una decision de este
  // componente.
  tamano: number;
};

export function MiniaturaAmpliable({ src, alt, tamano }: MiniaturaAmpliableProps) {
  // SIN IMAGEN NO HAY LIGHTBOX, y es deliberado: ampliar un placeholder no
  // muestra nada nuevo y deja a quien lo abrio dentro de un dialogo vacio
  // preguntandose que fallo. Se pinta la misma imagen que pintaria el caso con
  // foto, pero SIN disparador -- ni boton, ni cursor de mano, ni foco --,
  // porque un control que no hace nada es peor que ningun control.
  if (src === null) {
    return (
      <Image
        src="/placeholder.svg"
        alt={alt}
        width={tamano}
        height={tamano}
        className="bg-muted shrink-0 rounded object-cover"
      />
    );
  }

  return (
    <Dialog>
      {/* `asChild` para que el disparador SEA el boton de abajo y no un boton
          dentro de otro: sin el, Radix envuelve el hijo en su propio <button>
          y quedarian dos anidados, que es HTML invalido y rompe el foco. */}
      <DialogTrigger asChild>
        <button
          type="button"
          // El texto accesible dice QUE HACE, no que es: quien navega con
          // lector de pantalla ya tiene el nombre del producto en la fila, y
          // lo que necesita saber es que esto se puede abrir.
          aria-label={`Ampliar la imagen de ${alt}`}
          className="focus-visible:ring-ring shrink-0 cursor-pointer rounded focus-visible:ring-2 focus-visible:outline-none"
        >
          <Image
            src={src}
            alt={alt}
            width={tamano}
            height={tamano}
            className="bg-muted rounded object-cover"
          />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        {/* EL TITULO NO ES OPCIONAL AUNQUE NO SE VEA. Radix avisa por consola
            si falta, y un lector de pantalla anuncia "dialogo" sin decir de
            que. Va en `sr-only` en vez de omitirse: la imagen grande ya dice
            cual es el equipo a quien la ve, y no a quien no. */}
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <DialogDescription className="sr-only">
          Imagen ampliada de {alt}. Pulsa Escape o el botón de cerrar para volver.
        </DialogDescription>

        {/* `width`/`height` grandes con `h-auto w-full`: `next/image` necesita
            medidas intrinsecas para reservar el espacio y no dar un salto al
            cargar, y las clases dejan que la imagen se ajuste al ancho real
            del dialogo. `object-contain` y no `cover`: aqui la foto se mira
            entera, y recortarla seria justo lo contrario de ampliarla. */}
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={1200}
          className="h-auto w-full rounded object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
