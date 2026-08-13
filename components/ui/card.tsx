import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        // `border border-border` en vez de `ring-1 ring-foreground/10`: el
        // borde de la tarjeta es un token del sistema -hsl(0 0% 88%)- y el
        // anillo lo inventaba shadcn 4 a partir del color de texto. Y
        // `shadow-card`, que estaba DECLARADO en globals.css y no lo llamaba
        // nadie: es la sombra del Vite (MIGRATION_GUIDE/src/pages/Login.tsx:62).
        //
        // El radio NO se toca, y conviene decir por que: el Vite usaba
        // `rounded-2xl` = 16px de la escala de fabrica, pero este proyecto
        // REDEFINIO la escala -`--radius-xl: calc(var(--radius) * 1.4)` =
        // 16.8px-, asi que el `rounded-xl` de aqui ya es el equivalente. Poner
        // `rounded-2xl` daria 21.6px, mas redondo que el original.
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl border border-border bg-card py-(--card-spacing) text-sm text-card-foreground shadow-card [--card-spacing:--spacing(5)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        // text-lg/semibold y no text-base/medium: con 16px y peso medio el
        // nombre del equipo quedaba casi al mismo tamano que su descripcion y
        // la jerarquia dentro de la tarjeta se aplanaba. El Vite le daba
        // `text-lg font-semibold` a la tarjeta del catalogo
        // (MIGRATION_GUIDE/src/pages/Catalog.tsx:118).
        //
        // Y SIN `font-heading`, que es lo que shadcn 4 puso aqui por su
        // cuenta: en el original Playfair era SOLO para titulos de pagina y
        // de seccion -el h1 del heroe y los h2-, y los titulos de tarjeta
        // iban en Montserrat, igual que el resto del cuerpo. Medido en un
        // navegador el 2026-08-13: los nombres de equipo salian en serif
        // donde el original los tenia en la sans. Poner la serif en cada
        // tarjeta le quita al titular justo lo que lo hacia titular.
        "text-lg leading-snug font-semibold group-data-[size=sm]/card:text-base",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
