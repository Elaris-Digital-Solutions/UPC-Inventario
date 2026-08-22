"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TituloSeccion } from "@/components/antetitulo";
import { cerrarDia, guardarHorarioDia } from "@/lib/admin/acciones";
import { aperturaDesalineada } from "@/lib/admin/ajustes";
import { DIAS_SEMANA, etiquetaDia, type SedeConHorario } from "@/lib/admin/semana";

// El horario semanal de UNA sede (F3-T4, D-75). La pantalla monta una de estas
// por sede.
//
// UN DIA SIN FILA ES UN DIA CERRADO, y aca se VE que lo esta -D-76, primera de
// las tres formas-. Sin ese distintivo, un dia cerrado y un dia que no se pudo
// leer se pintarian igual, que es justo la confusion que D-76 existe para
// impedir.

// Recorta "HH:MM:SS" a "HH:MM", que es con lo que trabaja <input type="time">
// con su `step` por defecto. La base acepta las dos formas por igual -medido
// el 2026-08-13 sobre app_settings, misma columna `time`-, asi que esto no
// arregla ningun guardado: es para que el control del navegador entienda el
// valor que recibe.
function paraInputTime(hora: string): string {
  return hora.slice(0, 5);
}

type TablaHorariosSedeProps = {
  sede: SedeConHorario;
  // Sale de `app_settings.slot_minutes` y baja por props desde el Server
  // Component: la comprobacion de alineacion necesita saber el tamano del
  // bloque, y leerlo aca obligaria a otra consulta por cada sede pintada.
  slotMinutos: number;
};

type Edicion = { apertura: string; cierre: string };

export function TablaHorariosSede({ sede, slotMinutos }: TablaHorariosSedeProps) {
  // El estado nace de las props y NO se sincroniza despues a proposito: tras
  // guardar, revalidatePath vuelve a montar el arbol con los datos frescos.
  // Un dia cerrado nace con los dos campos VACIOS, no con un horario
  // inventado que el admin podria guardar sin darse cuenta.
  const [edicion, setEdicion] = useState<Record<number, Edicion>>(() => {
    const inicial: Record<number, Edicion> = {};
    for (const { weekday } of DIAS_SEMANA) {
      const dia = sede.dias[weekday];
      inicial[weekday] = dia
        ? { apertura: paraInputTime(dia.apertura), cierre: paraInputTime(dia.cierre) }
        : { apertura: "", cierre: "" };
    }
    return inicial;
  });

  // UN solo error a la vez, con el dia al que pertenece. Guardar un error por
  // fila dejaria siete mensajes viejos colgados en pantalla despues de siete
  // intentos, y ninguno diria cual es el de ahora.
  const [error, setError] = useState<{ weekday: number; texto: string } | null>(null);
  const [weekdayEnCurso, setWeekdayEnCurso] = useState<number | null>(null);
  const [pendiente, iniciar] = useTransition();

  function editar(weekday: number, campo: keyof Edicion, valor: string) {
    setError(null);
    setEdicion((previo) => ({ ...previo, [weekday]: { ...previo[weekday], [campo]: valor } }));
  }

  function guardar(weekday: number) {
    const { apertura, cierre } = edicion[weekday];
    setError(null);
    setWeekdayEnCurso(weekday);
    iniciar(async () => {
      const resultado = await guardarHorarioDia(sede.id, weekday, apertura, cierre);
      if (resultado?.error) {
        setError({ weekday, texto: resultado.error });
      }
      setWeekdayEnCurso(null);
    });
  }

  function cerrar(weekday: number) {
    setError(null);
    setWeekdayEnCurso(weekday);
    iniciar(async () => {
      const resultado = await cerrarDia(sede.id, weekday);
      if (resultado?.error) {
        setError({ weekday, texto: resultado.error });
      } else {
        setEdicion((previo) => ({ ...previo, [weekday]: { apertura: "", cierre: "" } }));
      }
      setWeekdayEnCurso(null);
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <TituloSeccion>{sede.nombre}</TituloSeccion>
        {!sede.activo && <Badge variant="secondary">Sede inactiva</Badge>}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Día</TableHead>
            <TableHead>Apertura</TableHead>
            <TableHead>Cierre</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {DIAS_SEMANA.map(({ weekday, nombre }) => {
            const abierto = sede.dias[weekday] !== null;
            const { apertura, cierre } = edicion[weekday];
            const incompleto = apertura === "" || cierre === "";

            // D-54, ahora sobre `campus_hours.opens_at`: esto es VISIBILIDAD y
            // no la barrera. Quien decide de verdad es el trigger
            // `campus_hours_alineacion` de la migracion 33; si esta
            // comprobacion se saltara, el guardado fallaria igual.
            const desalineada = !incompleto && aperturaDesalineada(apertura, slotMinutos);
            const enCurso = pendiente && weekdayEnCurso === weekday;

            return (
              <TableRow key={weekday}>
                <TableCell>{etiquetaDia(nombre)}</TableCell>
                <TableCell>
                  <Input
                    type="time"
                    aria-label={`Hora de apertura del ${etiquetaDia(nombre)}`}
                    value={apertura}
                    onChange={(e) => editar(weekday, "apertura", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="time"
                    aria-label={`Hora de cierre del ${etiquetaDia(nombre)}`}
                    value={cierre}
                    onChange={(e) => editar(weekday, "cierre", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  {abierto ? (
                    <Badge variant="secondary">Abierto</Badge>
                  ) : (
                    <Badge variant="outline">Cerrado</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={incompleto || desalineada || pendiente}
                      onClick={() => guardar(weekday)}
                    >
                      {enCurso ? "Guardando…" : "Guardar"}
                    </Button>
                    {abierto && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pendiente}
                        onClick={() => cerrar(weekday)}
                      >
                        Cerrar el día
                      </Button>
                    )}
                  </div>

                  {desalineada && (
                    <p role="alert" className="text-destructive mt-2 text-xs">
                      Con bloques de {slotMinutos} minutos, la hora de apertura tiene que caer justo
                      en un bloque: sus minutos tienen que ser múltiplo de {slotMinutos}.
                    </p>
                  )}

                  {error?.weekday === weekday && (
                    <p role="alert" className="text-destructive mt-2 text-xs">
                      {error.texto}
                    </p>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
