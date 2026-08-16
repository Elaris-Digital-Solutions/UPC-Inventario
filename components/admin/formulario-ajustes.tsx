"use client";

// El formulario de /admin/ajustes (Task 10, D-39 y D-54; M-12 le suma la
// septima en la Tanda 5): las siete columnas
// editables de app_settings, con dos avisos de naturaleza distinta -ver el
// comentario largo de aperturaDesalineada() y de productosDesalineados() en
// lib/admin/ajustes.ts para el porque completo de cada uno-.
//
// TODOS LOS CAMPOS CONTROLADOS, con useState + useTransition, y NUNCA
// <form action={...}> con useActionState. Motivo medido en la Task 2 de esta
// misma tanda -ver el comentario de FormularioProducto-: React resetea un
// <form action> cuando la accion termina, TAMBIEN cuando devuelve error, y
// esta pantalla nace con los valores YA GUARDADOS -no con un formulario en
// blanco-, asi que un reseteo los borraria. PanelDias (components/admin/panel-dias.tsx)
// ya usa este mismo patron por el mismo motivo, aunque su formulario si nace
// vacio.
import { useId, useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aperturaDesalineada, productosDesalineados } from "@/lib/admin/ajustes";
import { guardarAjustes } from "@/lib/admin/acciones";
import type { AjustesAdmin, ProductoConBuffer } from "@/lib/admin/configuracion";
import { plural } from "@/lib/admin/plural";

// Los OCHO valores que el check `app_settings_slot_divisor` permite -60 %
// slot_minutes = 0, con el rango 5..60-. El desplegable NO es un campo libre
// a proposito: 45 pasaria el rango 5-60 y moriria en ese check con un mensaje
// del motor, en vez de nunca poder escribirse. Mismos ocho valores que ya usan
// las pruebas de aperturaDesalineada() en lib/admin/ajustes.test.ts.
const SLOTS_LEGALES = [5, 6, 10, 12, 15, 20, 30, 60];

// Recorta "HH:MM:SS" a "HH:MM". SOLO para el <input type="time">, que trabaja
// en "HH:MM" con su `step` por defecto -medido el 2026-08-13 por PostgREST:
// `GET app_settings` devuelve "08:00:00"-. La base acepta las dos formas por
// igual -tambien medido-, asi que este recorte no le arregla nada a un
// guardado que fuera a fallar: es puramente para que el control del navegador
// tenga un valor que entienda. leerAjustes() (lib/admin/configuracion.ts)
// devuelve el crudo con segundos A PROPOSITO -su comentario dice que no le
// corresponde a una lectura decidir el formato del formulario-, asi que el
// recorte tiene que vivir aca.
function paraInputTime(hora: string): string {
  return hora.slice(0, 5);
}

type FormularioAjustesProps = {
  ajustes: AjustesAdmin;
  productos: ProductoConBuffer[];
};

export function FormularioAjustes({ ajustes, productos }: FormularioAjustesProps) {
  const [ventanaDias, setVentanaDias] = useState(String(ajustes.ventanaDias));
  const [apertura, setApertura] = useState(paraInputTime(ajustes.apertura));
  const [cierre, setCierre] = useState(paraInputTime(ajustes.cierre));
  const [slotMinutos, setSlotMinutos] = useState(String(ajustes.slotMinutos));
  const [duracionMinima, setDuracionMinima] = useState(String(ajustes.duracionMinima));
  const [limiteDiario, setLimiteDiario] = useState(String(ajustes.limiteDiario));
  const [margenCancelacion, setMargenCancelacion] = useState(String(ajustes.margenCancelacion));

  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarGuardado] = useTransition();

  // SEÑAL DE EXITO, y hace falta ACA aunque PanelDias no la necesite -y hay
  // que decir por que, no solo copiar el patron-. En PanelDias, guardar con
  // exito hace aparecer una fila NUEVA en la lista de dias inhabilitados: el
  // cambio se VE solo, sin ningun mensaje aparte. Aca no hay ninguna lista:
  // los siete campos YA muestran, antes de guardar, exactamente lo que el
  // admin acaba de escribir -son controlados y nacen con los valores
  // guardados-, asi que guardar bien y no guardar nada se ven EXACTAMENTE
  // IGUAL sin esta señal. Es el mismo genero que el fallo silencioso del
  // PATCH que devuelve HTTP 200 con `[]`, que esta misma tanda ya trata como
  // defecto en habilitarDia() y cambiarRolPersonal() (lib/admin/acciones.ts):
  // alli el chequeo es en el servidor porque el silencio viene de RLS; aca es
  // en el cliente porque el silencio viene de que no hay nada que redibujar.
  //
  // DESAPARECE EN CUANTO SE EDITA CUALQUIER CAMPO -via editar(), mas abajo-,
  // no solo cuando se reintenta guardar. Si se quedara fija tras editar,
  // seguiria diciendo "guardado" sobre valores que ya NO son los que estan
  // guardados en la base, que es la misma clase de mentira que el mensaje
  // existe para evitar.
  const [guardadoOk, setGuardadoOk] = useState(false);

  // Wrapper de cada setter de campo: apaga la señal de exito ANTES de aplicar
  // el cambio. Un solo punto para las siete, en vez de repetir
  // `setGuardadoOk(false)` en cada `onChange`/`onValueChange`.
  function editar<T>(setter: (valor: T) => void, valor: T) {
    setGuardadoOk(false);
    setter(valor);
  }

  const idVentana = useId();
  const idApertura = useId();
  const idCierre = useId();
  const idSlot = useId();
  const idDuracion = useId();
  const idLimite = useId();
  const idMargen = useId();

  const slotElegido = Number(slotMinutos);

  // D-54: la comprobacion que SI bloquea. `aperturaDesalineada()` es la misma
  // funcion pura que repite guardarAjustes() en el servidor
  // (lib/admin/acciones.ts) -esto es VISIBILIDAD, no la unica barrera: la
  // base todavia no tiene un `check` que ate opening_time a slot_minutes
  // (Q-19), asi que sin la comprobacion del servidor esta pantalla seria el
  // unico obstaculo, y un formulario armado a mano la saltaria entera-.
  const aperturaInvalida = aperturaDesalineada(apertura, slotElegido);

  // El aviso de buffers, que NO bloquea: la base permite cualquier
  // combinacion de slot_minutes y buffer_minutes -no hay ningun check que las
  // relacione-, asi que impedir el guardado aca inventaria una regla que el
  // motor no tiene. Se calcula en cada render -es barato: recorre el
  // catalogo una vez- para que el dialogo de confirmacion siempre enumere los
  // productos que el slot ELEGIDO en este momento desalinearia.
  const productosAfectados = productosDesalineados(productos, slotElegido);

  function confirmarGuardar() {
    setError(null);
    setGuardadoOk(false);
    iniciarGuardado(async () => {
      const resultado = await guardarAjustes({
        ventanaDias: Number(ventanaDias),
        apertura,
        cierre,
        slotMinutos: slotElegido,
        duracionMinima: Number(duracionMinima),
        limiteDiario: Number(limiteDiario),
        margenCancelacion: Number(margenCancelacion),
      });

      if (resultado?.error) {
        setError(resultado.error);
        return;
      }

      setGuardadoOk(true);
      setConfirmando(false);
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <Label htmlFor={idVentana}>Ventana de reserva (días)</Label>
          {/* `min`/`max` son VISIBILIDAD, no control -mismo criterio que el
              `min` de fecha en PanelDias-: el navegador los puede saltar, y
              quien impide de verdad 0 o 61 es el check
              `app_settings_booking_window_days_check`, traducido en
              mensajeDeRechazoAjustes() (lib/admin/acciones.ts). */}
          <Input
            id={idVentana}
            type="number"
            min={1}
            max={60}
            required
            value={ventanaDias}
            onChange={(e) => editar(setVentanaDias, e.target.value)}
            className="mt-1"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Cuántos días hacia adelante puede reservar un alumno. Entre 1 y 60.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor={idApertura}>Hora de apertura</Label>
            <Input
              id={idApertura}
              type="time"
              required
              value={apertura}
              onChange={(e) => editar(setApertura, e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor={idCierre}>Hora de cierre</Label>
            <Input
              id={idCierre}
              type="time"
              required
              value={cierre}
              onChange={(e) => editar(setCierre, e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          El horario de atención. La hora de cierre tiene que ser posterior a la de apertura.
        </p>

        {/* D-54: el aviso que SI impide guardar. Redactado en castellano
            llano -que pasa y como se arregla-, no con el nombre del check. */}
        {aperturaInvalida && (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
            Con bloques de {slotMinutos} minutos, la hora de apertura tiene que caer justo en un
            bloque: sus minutos tienen que ser múltiplo de {slotMinutos}. Ajusta la hora de apertura
            o elige otro tamaño de bloque.
          </p>
        )}

        <div>
          <Label htmlFor={idSlot}>Tamaño del bloque (minutos)</Label>
          {/* Desplegable de los ocho valores, mismo patron que el selector de
              buffer de FormularioProducto (components/admin/formulario-producto.tsx):
              Select controlado, sin <input type="hidden">, porque acá el valor
              se manda a mano al llamar guardarAjustes() y no via FormData. */}
          <Select value={slotMinutos} onValueChange={(v) => editar(setSlotMinutos, v)}>
            <SelectTrigger id={idSlot} className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SLOTS_LEGALES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground mt-1 text-xs">
            El tamaño de cada franja del calendario de reserva. Solo se ofrecen los valores que
            dividen exacto a 60 minutos.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor={idDuracion}>Duración mínima (minutos)</Label>
            <Input
              id={idDuracion}
              type="number"
              min={5}
              max={480}
              required
              value={duracionMinima}
              onChange={(e) => editar(setDuracionMinima, e.target.value)}
              className="mt-1"
            />
            <p className="text-muted-foreground mt-1 text-xs">Entre 5 y 480 minutos.</p>
          </div>

          <div>
            <Label htmlFor={idLimite}>Límite diario por producto</Label>
            <Input
              id={idLimite}
              type="number"
              min={1}
              max={10}
              required
              value={limiteDiario}
              onChange={(e) => editar(setLimiteDiario, e.target.value)}
              className="mt-1"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Cuántas reservas del mismo producto puede tener un alumno en un mismo día. Entre 1 y
              10.
            </p>
          </div>

          <div>
            <Label htmlFor={idMargen}>Antelación mínima para cancelar (minutos)</Label>
            <Input
              id={idMargen}
              type="number"
              min={0}
              max={1440}
              required
              value={margenCancelacion}
              onChange={(e) => editar(setMargenCancelacion, e.target.value)}
              className="mt-1"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Cuánto antes de empezar deja de poder cancelarse una reserva. Entre 0 y 1440 minutos;
              con 0 se puede cancelar hasta el momento de empezar.
            </p>
          </div>
        </div>

        <Button type="button" disabled={aperturaInvalida} onClick={() => setConfirmando(true)}>
          Guardar ajustes
        </Button>

        {/* `role="status"`, no "alert": es una confirmacion, no un error, y
            mismo patron que formulario-editar-producto.tsx (`{guardado &&
            !error && (...)}`). Se apaga sola al editar cualquier campo -ver
            editar() y el comentario de guardadoOk mas arriba-, asi que no
            hace falta condicionarla tambien a `!error`: mientras hay un error
            visible el usuario ya volvio a intentar guardar, y confirmarGuardar()
            ya puso guardadoOk en false antes de reintentar. */}
        {guardadoOk && (
          <p role="status" className="bg-muted rounded-lg px-4 py-3 text-sm">
            Ajustes guardados.
          </p>
        )}
      </section>

      <Dialog open={confirmando} onOpenChange={setConfirmando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar los ajustes</DialogTitle>
            <DialogDescription>
              Revisa los valores antes de confirmar: afectan al calendario de reserva de todos los
              alumnos.
            </DialogDescription>
          </DialogHeader>

          {/* Ningun valor de aca puede estar vacio al abrirse el dialogo: el
              boton que lo abre esta deshabilitado mientras aperturaInvalida
              sea true, y los siete campos nacen con los valores YA GUARDADOS.
              No hay ningun Date ni Intl.format en este bloque -al reves que
              el dialogo de PanelDias- que pudiera lanzar con un valor vacio,
              asi que no hace falta guardia. */}
          <div className="space-y-2 text-sm">
            <p>Vas a guardar estos ajustes:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Ventana de reserva: <strong>{plural(Number(ventanaDias), "día", "días")}</strong>.
              </li>
              <li>
                Horario de atención: <strong>{apertura}</strong> a <strong>{cierre}</strong>.
              </li>
              <li>
                Tamaño del bloque: <strong>{slotMinutos} minutos</strong>.
              </li>
              <li>
                Duración mínima: <strong>{duracionMinima} minutos</strong>.
              </li>
              <li>
                Límite diario por producto: <strong>{limiteDiario}</strong>.
              </li>
              <li>
                Antelación mínima para cancelar: <strong>{margenCancelacion} minutos</strong>.
              </li>
            </ul>

            {/* El aviso de buffers, D-39/Q-14: enumera CON NOMBRES, y NO
                impide confirmar -al reves que aperturaInvalida, que ni
                siquiera deja llegar hasta aca-. Texto del Step 3 del plan
                (MIGRATION_DOCS/PLANES/FASE_2_TANDA_3B.md), CORREGIDO de
                "Podés" a "Puedes": la interfaz de este proyecto tutea, y el
                voseo del plan era un error suyo, no una decision. */}
            {productosAfectados.length > 0 && (
              <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3">
                Cambiar el bloque a <strong>{slotMinutos} minutos</strong> dejará{" "}
                <strong>{plural(productosAfectados.length, "producto", "productos")}</strong> con un
                tiempo de retorno que ya no encaja en los bloques:{" "}
                {productosAfectados.map((p) => p.nombre).join(", ")}. Sus reservas seguirán
                funcionando, pero el bloqueo posterior terminará a mitad de bloque. Puedes corregir
                su tiempo de retorno desde el inventario.
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "outline" })}>Volver</DialogClose>
            <Button onClick={confirmarGuardar} disabled={pendiente}>
              {pendiente ? "Guardando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
