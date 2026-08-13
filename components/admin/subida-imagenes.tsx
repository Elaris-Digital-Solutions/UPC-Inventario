"use client";

import { useRef, useState, useTransition } from "react";

import { registrarImagen } from "@/lib/admin/acciones";

// La subida de imagenes a Cloudinary (F7: "carga multiple de imagenes").
//
// EL ARCHIVO NO PASA POR EL SERVIDOR DE NEXT, y ese es el punto del diseño:
//
//   1. Se pide la firma a /api/cloudinary/firma. El secreto se queda alli.
//   2. El NAVEGADOR sube el archivo DIRECTO a Cloudinary con esa firma.
//   3. Cloudinary devuelve public_id, secure_url, format, width, height, bytes.
//   4. registrarImagen() escribe la fila en `product_images`.
//
// Subir a traves del servidor de Next obligaria a que el binario entero
// atraviese el proceso -- memoria y tiempo por imagen -- sin ganar nada: la
// autorizacion ya ocurrio en el paso 1, que es donde tiene que estar.
//
// LOS PARAMETROS QUE SE MANDAN SON EXACTAMENTE LOS QUE SE FIRMARON. El
// handler firma `{ timestamp, folder }`, asi que aca van esos dos y nada mas
// entre los firmables. Agregar uno -- un `public_id` propio, un `tag` --
// haria que Cloudinary calculara otra firma y rechazara la subida con un error
// que suena a credenciales invalidas y manda a buscar el problema donde no
// esta. `file` y `api_key` van pero NO se firman, que es lo que dice
// FUERA_DE_LA_FIRMA en lib/cloudinary/firma.ts.

type SubidaImagenesProps = {
  productoId: string;
};

export function SubidaImagenes({ productoId }: SubidaImagenesProps) {
  const [error, setError] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function subir(archivos: FileList) {
    setError(null);

    // Se piden las credenciales UNA vez para todo el lote. El `timestamp` que
    // firma el servidor vale para las subidas del lote entero, y pedir una
    // firma por archivo serian N viajes mas sin ninguna ganancia.
    const respuesta = await fetch("/api/cloudinary/firma", { method: "POST" });

    if (!respuesta.ok) {
      // El cuerpo puede no ser JSON: sin sesion, el proxy contesta un 307 a
      // /login -- medido en la Task 4 -- y lo que llega es HTML. Por eso se
      // intenta leer y se cae a un texto propio, en vez de dejar que un
      // `await respuesta.json()` reviente con un error de parseo que no
      // explicaria nada.
      let mensaje = "No se pudo preparar la subida.";
      try {
        const cuerpo = await respuesta.json();
        if (typeof cuerpo?.error === "string") {
          mensaje = cuerpo.error;
        }
      } catch {
        mensaje = "Tu sesión caducó. Vuelve a entrar para subir imágenes.";
      }
      setError(mensaje);
      return;
    }

    const { timestamp, signature, apiKey, cloudName, folder } = await respuesta.json();

    // EN SERIE Y NO EN PARALELO, a proposito. registrarImagen() cuenta las
    // imagenes que ya hay para decidir `is_main` y `sort_order`; con varias
    // subidas resolviendose a la vez, todas leerian el MISMO conteo y saldrian
    // con el mismo `sort_order` -- y si el producto estaba vacio, TODAS se
    // marcarian principales. Es una carrera de lectura-y-escritura, y en serie
    // no existe.
    for (const archivo of Array.from(archivos)) {
      setProgreso(`Subiendo ${archivo.name}…`);

      const cuerpo = new FormData();
      cuerpo.append("file", archivo);
      cuerpo.append("api_key", apiKey);
      cuerpo.append("timestamp", String(timestamp));
      cuerpo.append("signature", signature);
      if (folder !== "") {
        cuerpo.append("folder", folder);
      }

      const subida = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: cuerpo,
      });

      if (!subida.ok) {
        // El mensaje CRUDO de Cloudinary, no uno propio: los rechazos de aca
        // -- firma invalida, formato no admitido, cuenta sin cuota -- son
        // cosas que este codigo no puede anticipar ni traducir con honestidad.
        // Mismo criterio que el resto del proyecto: texto propio solo para lo
        // alcanzable y previsto, crudo para lo demas.
        const detalle = await subida.text();
        setError(`Cloudinary rechazó ${archivo.name}: ${detalle}`);
        setProgreso(null);
        return;
      }

      const datos = await subida.json();

      const resultado = await registrarImagen(productoId, {
        publicId: datos.public_id,
        secureUrl: datos.secure_url,
        format: datos.format ?? null,
        width: datos.width ?? null,
        height: datos.height ?? null,
        bytes: datos.bytes ?? null,
      });

      // La imagen YA esta en Cloudinary y la fila no se guardo. Se dice tal
      // cual en vez de disimularlo: el archivo existe, no se ve en el
      // catalogo, y quien lo lea tiene que saber que reintentar sube una
      // segunda copia.
      if (resultado?.error) {
        setError(
          `${archivo.name} se subió a Cloudinary pero no se pudo guardar en el catálogo: ${resultado.error}`,
        );
        setProgreso(null);
        return;
      }
    }

    setProgreso(null);

    // El input se limpia para que elegir el MISMO archivo otra vez vuelva a
    // disparar `onChange`. Sin esto, un reintento tras un error no haria nada
    // y pareceria que el boton esta roto.
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        disabled={pendiente}
        onChange={(e) => {
          const archivos = e.target.files;
          if (archivos && archivos.length > 0) {
            iniciarTransicion(() => {
              void subir(archivos);
            });
          }
        }}
        className="text-sm"
      />

      {progreso && <p className="text-muted-foreground text-sm">{progreso}</p>}

      {error && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <p className="text-muted-foreground text-xs">
        Puedes elegir varias a la vez. La primera imagen del producto queda como principal.
      </p>
    </div>
  );
}
