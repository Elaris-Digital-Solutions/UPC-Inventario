import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // h-10 y px-3, la altura del Vite -medido en
        // MIGRATION_GUIDE/src/components/ui/input.tsx:11-. shadcn 4 lo dejo
        // en h-8, ocho pixeles por debajo, y un campo mas bajo que su propia
        // etiqueta se lee como un formulario a medio hacer. Va emparejado con
        // el `default` del boton, que vuelve a h-10: los dos se ponen en fila
        // en el buscador del catalogo y en /completar-perfil.
        "h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
