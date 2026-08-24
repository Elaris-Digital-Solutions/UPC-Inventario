"use client";

// La tabla de /admin/reservas (F6): una fila por reserva, con el desplegable de
// cambio de estado y la fila expandible.
//
// CLIENT COMPONENT, al reves que TablaInventario: aquella solo pinta y enlaza, y
// esta tiene tres cosas con estado -que fila esta desplegada, que dialogo esta
// abierto y sobre cual, y el desplegable de cada fila-.
import { Fragment, useState, useTransition } from "react";

import { DialogoEstadoReserva, type ModoDialogo } from "@/components/admin/dialogo-estado-reserva";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cambiarEstadoReserva, type ResultadoAdmin } from "@/lib/admin/acciones";
import { ETIQUETAS_ESTADO, type EstadoReserva } from "@/lib/admin/filtros";
import type { ReservaAdmin } from "@/lib/admin/reservas";
import { plural } from "@/lib/admin/plural";
import { fechaEnLima } from "@/lib/reservas/rejilla";

// REPETIDAS y no importadas: son privadas de los archivos donde tambien viven.
// `America/Lima` porque los tres campos son instantes; `hour12: false` porque en
// `es-PE` el formato de 12 horas termina en "p. m." y ya costo un defecto visible
// dos veces en esta fase.
const FORMATO_FECHA_HORA = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const FORMATO_HORA = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// DEFECTO REAL ENCONTRADO MIRANDO LA PANTALLA, con los cuatro comandos en verde:
// una reserva de las 23:00 a la 01:00 se leia como "23:00 · hasta 01:00", una
// franja que TERMINA ANTES DE EMPEZAR. El dato era correcto; mentia el texto.
//
// Cuando el fin cae en otro dia civil de Lima se escribe la fecha entera. La
// comparacion usa fechaEnLima() y no `getDate()` sobre el instante crudo, que
// resolveria el dia en la zona del navegador.
function textoFin(inicio: string, fin: string): string {
  const instanteFin = new Date(fin);

  if (fechaEnLima(new Date(inicio)) === fechaEnLima(instanteFin)) {
    return `hasta ${FORMATO_HORA.format(instanteFin)}`;
  }

  return `hasta ${FORMATO_FECHA_HORA.format(instanteFin)}`;
}

// LAS TRANSICIONES QUE LA BASE ADMITE, y ninguna mas: los otros cuatro estados
// son TERMINALES. Ofrecer los seis y dejar que el motor rechace seria mostrarle
// al admin opciones que no existen, y eso es visibilidad. NO ES UN CONTROL: si
// alguien fuerza otro valor, el trigger lo rechaza igual.
//
// Un `Record` con las SEIS claves a mano y no un objeto parcial: un septimo
// estado en el enum rompe el typecheck en vez de dejar una fila sin desplegable.
const TRANSICIONES: Record<EstadoReserva, readonly EstadoReserva[]> = {
  reserved: ["active", "not_picked_up", "cancelled"],
  active: ["completed", "not_returned"],
  completed: [],
  cancelled: [],
  not_picked_up: [],
  not_returned: [],
};

// Las dos que NO se aplican directo: abren un dialogo que exige escribir algo.
const MODO_DIALOGO: Partial<Record<EstadoReserva, ModoDialogo>> = {
  cancelled: "cancelar",
  not_returned: "no_devuelta",
};

// `default` para lo que esta en curso, `secondary` para lo que termino bien,
// `destructive` para las dos faltas. Cancelada va `outline`: no es falta de nadie.
const VARIANTE_ESTADO: Record<
  EstadoReserva,
  "default" | "secondary" | "destructive" | "outline"
> = {
  reserved: "default",
  active: "default",
  completed: "secondary",
  cancelled: "outline",
  not_picked_up: "destructive",
  not_returned: "destructive",
};

const ETIQUETAS_ESTADO_UNIDAD: Record<ReservaAdmin["estadoUnidad"], string> = {
  active: "Disponible",
  maintenance: "En mantenimiento",
  retired: "Retirada",
};

// Misma funcion que textoAlumno() en tarjeta-mostrador.tsx y por los mismos dos
// motivos: `alumno` puede llegar `null` si RLS bloquea el embed, y `nombre` y
// `apellido` pueden faltar por separado.
function textoAlumno(alumno: ReservaAdmin["alumno"]): string {
  if (alumno === null) {
    return "Alumno no disponible";
  }

  const completo = [alumno.nombre, alumno.apellido].filter((p) => p !== null).join(" ");
  return completo.length > 0 ? completo : alumno.email;
}

type TablaReservasProps = {
  reservas: ReservaAdmin[];
  // Cuantas habia ANTES de filtrar, para distinguir "no hay reservas" de "el
  // filtro las esconde": decir "no hay ninguna" cuando el filtro las tapa es una
  // afirmacion falsa con consecuencia real.
  totalSinFiltrar: number;
};

export function TablaReservas({ reservas, totalSinFiltrar }: TablaReservasProps) {
  const [expandida, setExpandida] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<{ modo: ModoDialogo; reserva: ReservaAdmin } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function alElegirEstado(reserva: ReservaAdmin, destino: EstadoReserva) {
    setError(null);

    const modo = MODO_DIALOGO[destino];
    if (modo) {
      setDialogo({ modo, reserva });
      return;
    }

    // Se comprueba en tiempo de EJECUCION y no con un `as`: TRANSICIONES no
    // ofrece ningun otro valor que llegue hasta aqui, pero TypeScript no puede
    // deducirlo, y un `as` no comprueba nada.
    if (destino !== "active" && destino !== "completed" && destino !== "not_picked_up") {
      setError(`El cambio a «${ETIQUETAS_ESTADO[destino]}» no se puede aplicar desde aquí.`);
      return;
    }

    iniciarTransicion(async () => {
      const resultado: ResultadoAdmin = await cambiarEstadoReserva(reserva.id, destino);
      if (resultado?.error) {
        setError(resultado.error);
      }
    });
  }

  if (reservas.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {totalSinFiltrar === 0
          ? "Todavía no hay ninguna reserva registrada."
          : "Ninguna reserva coincide con los filtros. Prueba a cambiarlos para verlas."}
      </p>
    );
  }

  return (
    <>
      {error && (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive mb-4 rounded-lg px-4 py-3 text-sm"
        >
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alumno</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Franja</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Cambiar a</TableHead>
              <TableHead>Detalle</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {reservas.map((reserva) => {
              const destinos = TRANSICIONES[reserva.estado];
              const estaExpandida = expandida === reserva.id;

              return (
                // Fragment con `key` y no `<>`: son DOS <TableRow> hermanas por
                // reserva, y React necesita la clave en el contenedor.
                <Fragment key={reserva.id}>
                  <TableRow>
                    <TableCell className="font-medium">
                      {textoAlumno(reserva.alumno)}
                      {reserva.alumno && (
                        <span className="text-muted-foreground block text-xs">
                          {reserva.alumno.email}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      {reserva.producto}
                      <span className="text-muted-foreground block text-xs">
                        {reserva.unidad} · {reserva.sede}
                      </span>
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      {FORMATO_FECHA_HORA.format(new Date(reserva.inicio))}
                      <span className="text-muted-foreground block text-xs">
                        {textoFin(reserva.inicio, reserva.fin)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge variant={VARIANTE_ESTADO[reserva.estado]}>
                        {ETIQUETAS_ESTADO[reserva.estado]}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {destinos.length === 0 ? (
                        // NO un desplegable vacio ni deshabilitado: el texto dice
                        // POR QUE no hay nada que elegir. Un control gris sin
                        // explicacion se lee como un fallo de la pantalla.
                        <span className="text-muted-foreground text-xs">
                          Estado final, no admite cambios
                        </span>
                      ) : (
                        <Select
                          // `value=""` SIEMPRE y no el estado actual: esto no
                          // representa un valor, representa una ORDEN. Vacio
                          // vuelve al placeholder tras cada uso y nunca muestra
                          // como seleccionado algo que quiza fallo al aplicarse.
                          value=""
                          onValueChange={(v) => alElegirEstado(reserva, v as EstadoReserva)}
                          disabled={pendiente}
                        >
                          <SelectTrigger className="w-44" aria-label={`Cambiar el estado de la reserva de ${reserva.producto}`}>
                            <SelectValue placeholder="Elegir…" />
                          </SelectTrigger>
                          <SelectContent>
                            {destinos.map((destino) => (
                              <SelectItem key={destino} value={destino}>
                                {ETIQUETAS_ESTADO[destino]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>

                    <TableCell>
                      <button
                        type="button"
                        aria-expanded={estaExpandida}
                        onClick={() => setExpandida(estaExpandida ? null : reserva.id)}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        {estaExpandida ? "Ocultar" : "Ver más"}
                      </button>
                    </TableCell>
                  </TableRow>

                  {estaExpandida && (
                    <TableRow>
                      {/* Los cinco datos que F6 pide, mas el activo fijo, que la
                          busqueda ya mira y no se veia en ninguna columna. */}
                      <TableCell colSpan={6} className="bg-muted/40">
                        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <dt className="text-muted-foreground text-xs">Se registró el</dt>
                            <dd>{FORMATO_FECHA_HORA.format(new Date(reserva.registro))}</dd>
                          </div>

                          <div>
                            <dt className="text-muted-foreground text-xs">Duración</dt>
                            <dd>{plural(reserva.duracionMinutos, "minuto", "minutos")}</dd>
                          </div>

                          <div>
                            <dt className="text-muted-foreground text-xs">Estado de la unidad</dt>
                            <dd>{ETIQUETAS_ESTADO_UNIDAD[reserva.estadoUnidad]}</dd>
                          </div>

                          <div>
                            <dt className="text-muted-foreground text-xs">Activo fijo</dt>
                            {/* El 41 % del inventario real no tiene activo fijo.
                                El hueco se dice, no se deja en blanco. */}
                            <dd>{reserva.activoFijo ?? "Sin activo fijo registrado"}</dd>
                          </div>

                          <div>
                            <dt className="text-muted-foreground text-xs">Categoría</dt>
                            <dd>{reserva.categoria ?? "Sin categoría"}</dd>
                          </div>

                          <div>
                            <dt className="text-muted-foreground text-xs">Para qué la pidió</dt>
                            <dd>{reserva.motivo ?? "No lo indicó"}</dd>
                          </div>

                          {/* Solo si lo hay: una fila "Motivo: —" en todas las que
                              nadie cancelo seria ruido para que se vea en una. */}
                          {reserva.motivoCancelacion && (
                            <div className="sm:col-span-2 lg:col-span-3">
                              <dt className="text-muted-foreground text-xs">
                                Motivo de la cancelación
                              </dt>
                              <dd>{reserva.motivoCancelacion}</dd>
                            </div>
                          )}
                        </dl>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* UN SOLO dialogo para toda la tabla y no uno por fila: solo puede haber
          uno abierto, y montar N cerrados seria pagar el estado de todos para usar
          uno. La `key` lo REMONTA al cambiar de reserva o de modo, asi que nunca
          arrastra el texto tecleado para otra fila: barato para lo que evita,
          escribir en el historial de un equipo lo que paso con otro. */}
      {dialogo && (
        <DialogoEstadoReserva
          key={`${dialogo.reserva.id}-${dialogo.modo}`}
          modo={dialogo.modo}
          reservaId={dialogo.reserva.id}
          unidadId={dialogo.reserva.unidadId}
          descripcionReserva={`${dialogo.reserva.producto} · ${dialogo.reserva.unidad} · ${textoAlumno(dialogo.reserva.alumno)}`}
          abierto={true}
          onCambioApertura={(abierto) => {
            if (!abierto) {
              setDialogo(null);
            }
          }}
        />
      )}
    </>
  );
}
