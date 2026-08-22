"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TituloSeccion } from "@/components/antetitulo";
import {
  borrarTurno,
  contarDescubiertas,
  crearTurno,
  guardarTurno,
} from "@/lib/admin/acciones";
import { DIAS_SEMANA, etiquetaDia } from "@/lib/admin/semana";
import type { TurnoAdmin } from "@/lib/admin/horarios";

// Los turnos del personal (F3-T4, Tarea 9). Van en la MISMA ruta que los
// horarios de sede porque son las dos capas de D-74 -"la sede pone el techo, el
// turno dice quien esta debajo"- y separarlas obligaria a ir y volver entre dos
// pantallas para entender por que un dia no ofrece nada.
//
// SE OFRECE TODO EL PERSONAL ACTIVO, ADMIN INCLUIDO (D-93). El modelo nunca ato
// los turnos al rol, y hoy el unico personal que existe en produccion es un
// admin: filtrar por `operator` dejaria el calendario vacio para siempre. Lo que
// SI se filtra es `activo`, porque la baja de personal desactiva y nunca borra.

type PersonaParaTurno = {
  userId: string;
  nombre: string;
  rol: string;
};

type TablaTurnosProps = {
  turnos: TurnoAdmin[];
  personal: PersonaParaTurno[];
  sedes: { id: string; nombre: string }[];
};

// La operacion que espera confirmacion, con el numero de D-92 ya contado. Se
// guarda ENTERA -- y no solo el id -- porque el aviso tiene que hablar del
// cambio concreto: acortar a las 11:00 y borrar el turno descubren cantidades
// distintas.
type Pendiente = {
  tipo: "guardar" | "borrar";
  turno: TurnoAdmin;
  inicio: string;
  fin: string;
  descubiertas: number | null;
};

function paraInputTime(hora: string): string {
  return hora.slice(0, 5);
}

export function TablaTurnos({ turnos, personal, sedes }: TablaTurnosProps) {
  // SOLO LOS TURNOS QUE EL ADMIN HA TOCADO, y los demas se leen de las props.
  //
  // OJO -- ESTO ERA UN MAPA SEMBRADO CON LOS TURNOS DE LA PRIMERA CARGA Y
  // REVENTABA, medido en el navegador y no razonado: al añadir un turno,
  // revalidatePath vuelve a pintar con un turno MAS, React conserva el estado
  // del componente, y la fila nueva no tenia entrada en el mapa. `fila.inicio`
  // sobre `undefined` tumbaba la tabla entera y las filas desaparecian de
  // pantalla. La version de ahora no puede tener ese hueco: si no hay edicion
  // local, el valor sale del turno.
  //
  // TablaHorariosSede si puede sembrar su mapa, y la diferencia importa: aquella
  // lo indexa por `weekday`, que son siempre los mismos siete. Aqui la clave es
  // un id que nace y muere.
  const [edicion, setEdicion] = useState<Record<string, { inicio: string; fin: string }>>({});

  function horasDe(turno: TurnoAdmin) {
    return (
      edicion[turno.id] ?? { inicio: paraInputTime(turno.inicio), fin: paraInputTime(turno.fin) }
    );
  }

  const [nuevo, setNuevo] = useState({
    staffId: "",
    campusId: sedes[0]?.id ?? "",
    weekday: "1",
    inicio: "08:00",
    fin: "22:00",
  });

  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  const nombrePorId = new Map(personal.map((p) => [p.userId, p.nombre]));
  const nombreSedePorId = new Map(sedes.map((s) => [s.id, s.nombre]));

  // Pregunta a la base cuantas reservas quedarian descubiertas ANTES de abrir el
  // dialogo, para que el numero ya este ahi cuando el admin lea la pregunta.
  function pedirConfirmacion(tipo: Pendiente["tipo"], turno: TurnoAdmin) {
    const { inicio, fin } = horasDe(turno);
    setError(null);
    iniciar(async () => {
      const descubiertas =
        tipo === "borrar"
          ? await contarDescubiertas(turno.id, null, null)
          : await contarDescubiertas(turno.id, inicio, fin);
      setPendiente({ tipo, turno, inicio, fin, descubiertas });
    });
  }

  function confirmar() {
    if (!pendiente) return;
    const { tipo, turno, inicio, fin } = pendiente;
    setError(null);
    iniciar(async () => {
      const resultado =
        tipo === "borrar"
          ? await borrarTurno(turno.id)
          : await guardarTurno(turno.id, inicio, fin);
      if (resultado?.error) {
        setError(resultado.error);
      }
      setPendiente(null);
    });
  }

  function anadir() {
    setError(null);
    iniciar(async () => {
      const resultado = await crearTurno(
        nuevo.staffId,
        nuevo.campusId,
        Number(nuevo.weekday),
        nuevo.inicio,
        nuevo.fin,
      );
      if (resultado?.error) {
        setError(resultado.error);
      }
    });
  }

  const puedeAnadir =
    nuevo.staffId !== "" && nuevo.campusId !== "" && nuevo.inicio !== "" && nuevo.fin !== "";

  return (
    <section className="space-y-4">
      <TituloSeccion>Turnos del personal</TituloSeccion>
      <p className="text-muted-foreground text-sm">
        Un turno dice quién atiende esa sede ese día. El alumno solo ve las franjas del horario de
        la sede que algún turno cubre; dos turnos pueden solaparse, y una reserva que empieza con
        una persona y termina con otra es válida mientras haya alguien en el mostrador todo el rato.
      </p>

      {personal.length === 0 && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          No hay personal activo al que asignarle turnos. Sin turnos, el calendario del alumno no
          ofrece ninguna franja.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-6 md:items-end">
        <div className="md:col-span-2">
          <Label htmlFor="turno-persona">Persona</Label>
          <Select
            value={nuevo.staffId}
            onValueChange={(v) => setNuevo((p) => ({ ...p, staffId: v }))}
          >
            <SelectTrigger id="turno-persona" className="mt-1">
              <SelectValue placeholder="Elige a alguien" />
            </SelectTrigger>
            <SelectContent>
              {personal.map((p) => (
                <SelectItem key={p.userId} value={p.userId}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="turno-sede">Sede</Label>
          <Select
            value={nuevo.campusId}
            onValueChange={(v) => setNuevo((p) => ({ ...p, campusId: v }))}
          >
            <SelectTrigger id="turno-sede" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sedes.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="turno-dia">Día</Label>
          <Select
            value={nuevo.weekday}
            onValueChange={(v) => setNuevo((p) => ({ ...p, weekday: v }))}
          >
            <SelectTrigger id="turno-dia" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIAS_SEMANA.map(({ weekday, nombre }) => (
                <SelectItem key={weekday} value={String(weekday)}>
                  {etiquetaDia(nombre)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="turno-inicio">Desde</Label>
          <Input
            id="turno-inicio"
            type="time"
            className="mt-1"
            value={nuevo.inicio}
            onChange={(e) => setNuevo((p) => ({ ...p, inicio: e.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="turno-fin">Hasta</Label>
          <Input
            id="turno-fin"
            type="time"
            className="mt-1"
            value={nuevo.fin}
            onChange={(e) => setNuevo((p) => ({ ...p, fin: e.target.value }))}
          />
          <Button
            type="button"
            className="mt-3 w-full"
            disabled={!puedeAnadir || enCurso}
            onClick={anadir}
          >
            Añadir turno
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {turnos.length === 0 ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          No hay ningún turno cargado. Mientras siga así, el calendario del alumno no ofrece ninguna
          franja en ninguna sede, aunque las sedes tengan horario.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Persona</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead>Día</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Hasta</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {turnos.map((turno) => {
              const dia = DIAS_SEMANA.find((d) => d.weekday === turno.weekday);
              const fila = horasDe(turno);

              return (
                <TableRow key={turno.id}>
                  <TableCell>
                    {/* Una persona que ya no esta ACTIVA conserva sus turnos
                        viejos: la baja desactiva y nunca borra, y quitarle los
                        turnos perderia la constancia de que atendio ese dia. Por
                        eso aqui puede aparecer alguien que el desplegable de
                        arriba ya no ofrece. */}
                    {nombrePorId.get(turno.staffId) ?? "Persona dada de baja"}
                  </TableCell>
                  <TableCell>{nombreSedePorId.get(turno.campusId) ?? "—"}</TableCell>
                  <TableCell>{dia ? etiquetaDia(dia.nombre) : turno.weekday}</TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      aria-label="Hora de inicio del turno"
                      value={fila.inicio}
                      onChange={(e) =>
                        setEdicion((p) => ({
                          ...p,
                          [turno.id]: { ...horasDe(turno), inicio: e.target.value },
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      aria-label="Hora de fin del turno"
                      value={fila.fin}
                      onChange={(e) =>
                        setEdicion((p) => ({
                          ...p,
                          [turno.id]: { ...horasDe(turno), fin: e.target.value },
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={enCurso}
                        onClick={() => pedirConfirmacion("guardar", turno)}
                      >
                        Guardar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={enCurso}
                        onClick={() => pedirConfirmacion("borrar", turno)}
                      >
                        Borrar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={pendiente !== null} onOpenChange={(abierto) => !abierto && setPendiente(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendiente?.tipo === "borrar" ? "Borrar el turno" : "Guardar el turno"}
            </DialogTitle>
            <DialogDescription>
              {/* D-92: se AVISA y no se impide. El numero no es "las reservas
                  que caian en este turno" -- con la cobertura por union, el
                  turno de un compañero puede seguir cubriendolas -- sino las que
                  DEJAN de estar cubiertas al recalcular sin el. */}
              {pendiente?.descubiertas === null
                ? "No se pudo comprobar cuántas reservas quedarían sin nadie que las atienda. Puedes continuar, pero lo estarías haciendo sin ese dato."
                : pendiente?.descubiertas === 0
                  ? "Ninguna reserva se queda sin alguien que la atienda: los demás turnos siguen cubriéndolas."
                  : `${pendiente?.descubiertas} reserva(s) se quedarían sin nadie en el mostrador. No se cancelan solas, y el alumno no recibe ningún aviso.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendiente(null)}>
              Cancelar
            </Button>
            <Button type="button" disabled={enCurso} onClick={confirmar}>
              {pendiente?.tipo === "borrar" ? "Borrar de todos modos" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
