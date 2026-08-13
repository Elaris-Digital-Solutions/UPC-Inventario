"use client";

import Image from "next/image";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { borrarImagen, fijarPrincipal, reordenarImagenes } from "@/lib/admin/acciones";
import type { ImagenProducto } from "@/lib/admin/consultas";

// La galeria de administracion (F7: "reordenar, fijar principal, eliminar").
//
// REORDENAR CON DOS BOTONES Y NO ARRASTRANDO. F7 dice "reordenar (arrastrar)",
// y arrastrar es ESTETICA: subir y bajar hace exactamente lo mismo, es
// funcionalidad, y el compañero que hace la fase visual decidira si vale la
// pena el arrastre. Ademas dos botones funcionan con teclado sin trabajo extra.
//
// ELIMINAR BORRA LA FILA Y NO TOCA CLOUDINARY, y esta dicho en la pantalla:
// F7 lo manda asi, y para las 34 imagenes reales seria imposible de todos
// modos porque no guardan `cloudinary_public_id`.

type GaleriaAdminProps = {
  productoId: string;
  imagenes: ImagenProducto[];
};

export function GaleriaAdmin({ productoId, imagenes }: GaleriaAdminProps) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function ejecutar(accion: () => Promise<{ error: string } | null>) {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await accion();
      if (resultado?.error) {
        setError(resultado.error);
      }
    });
  }

  // Manda el orden COMPLETO y no "sube esta una posicion": la accion recibe el
  // estado final que el admin quiere, no una instruccion que podria aplicarse
  // sobre un orden distinto del que estaba viendo.
  function mover(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= imagenes.length) {
      return;
    }
    const ids = imagenes.map((i) => i.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    ejecutar(() => reordenarImagenes(productoId, ids));
  }

  if (imagenes.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Este producto no tiene imágenes. En el catálogo se verá sin foto.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {imagenes.map((imagen, indice) => (
          <li key={imagen.id} className="border-border/60 space-y-2 rounded-lg border p-3">
            <div className="bg-muted relative aspect-video overflow-hidden rounded">
              {/* `next/image` con `unoptimized` NO: el host res.cloudinary.com
                  ya esta declarado en images.remotePatterns de next.config.ts
                  desde la T2A, y el optimizador sirve esas fotos con
                  `200 image/jpeg` -- medido entonces. */}
              <Image
                src={imagen.url}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {imagen.esPrincipal && <Badge variant="secondary">Principal</Badge>}
              {/* Se DICE cuando la imagen no se puede identificar en
                  Cloudinary. En el catalogo real son las 34, todas, asi que
                  esta insignia va a ser la norma y no la excepcion hasta que
                  se resuban. Es visibilidad: explica por que de esas no se
                  puede hacer nada mas que borrar la fila. */}
              {imagen.cloudinaryPublicId === null && (
                <Badge variant="outline">Sin identificador de Cloudinary</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pendiente || indice === 0}
                onClick={() => mover(indice, -1)}
              >
                Subir
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pendiente || indice === imagenes.length - 1}
                onClick={() => mover(indice, 1)}
              >
                Bajar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pendiente || imagen.esPrincipal}
                onClick={() => ejecutar(() => fijarPrincipal(productoId, imagen.id))}
              >
                Hacer principal
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pendiente}
                onClick={() => ejecutar(() => borrarImagen(productoId, imagen.id))}
              >
                Quitar
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground text-xs">
        Quitar una imagen la saca del catálogo, pero el archivo sigue guardado en Cloudinary.
      </p>
    </div>
  );
}
