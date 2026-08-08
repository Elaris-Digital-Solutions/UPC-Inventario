import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProductoVitrina } from "@/lib/catalogo/consultas";

// Esta tarjeta NO muestra stock ni disponibilidad, ni siquiera tras una
// condicion (D-21). `ProductoVitrina` ni siquiera trae ese dato -no es que
// aqui se decida ocultarlo-. Si algun dia hace falta ensenarlo, es OTRO
// componente: el que decide que se promete es el sitio donde se usa la
// tarjeta, y mezclar los dos convertiria la vitrina en un catalogo que
// miente sobre lo que hay.
type TarjetaProductoProps = {
  producto: ProductoVitrina;
  href?: string;
};

// Componente de servidor, sin estado: recibe un producto ya aplanado por
// lib/catalogo/consultas.ts y solo decide como se pinta.
export function TarjetaProducto({ producto, href }: TarjetaProductoProps) {
  // `pt-0`: Card trae padding vertical por defecto y solo lo cancela arriba
  // cuando el primer hijo es un <img> suelto (`has-[>img:first-child]`). Aqui
  // el primer hijo es el contenedor con `aspect-[4/3]` que exige `next/image`
  // con `fill`, asi que ese selector no dispara y hay que cancelarlo a mano
  // para que la imagen llegue al borde superior de la tarjeta.
  const contenido = (
    <Card className={cn("h-full gap-3 pt-0", href && "transition-shadow hover:shadow-md")}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          // El seed local trae un producto sin ninguna imagen -el embed
          // devuelve product_images: []- aunque los 34 de produccion si
          // tengan. El placeholder es para ese caso real, no defensivo de
          // sobra.
          src={producto.imagenUrl ?? "/placeholder.svg"}
          alt={producto.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover"
        />
      </div>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{producto.name}</CardTitle>
          {producto.category !== null && (
            <Badge variant="secondary" className="shrink-0">
              {producto.category}
            </Badge>
          )}
        </div>
        {producto.description !== null && (
          <CardDescription className="line-clamp-2">{producto.description}</CardDescription>
        )}
      </CardHeader>
    </Card>
  );

  // Sin `href` la tarjeta no es enlace: la landing es vitrina y no lleva a
  // ningun lado, porque el catalogo de verdad exige sesion (proxy.ts,
  // RUTAS_PUBLICAS). Envolverla en un <Link> igual habria sido un boton que
  // rebota a /login sin avisar.
  if (href === undefined) {
    return contenido;
  }

  return (
    <Link href={href} className="block h-full">
      {contenido}
    </Link>
  );
}
