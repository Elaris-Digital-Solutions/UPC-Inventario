"use client";

// El alta y la tabla de /admin/personal (D-52, D-53). El formulario y la lista
// comparten estado -dar de alta tiene que hacer aparecer la fila sin recargar-,
// asi que van en un solo Client Component.
//
// SIN <form action={...}> Y SIN useActionState: React RESETEA un `<form action>`
// cuando la accion TERMINA, tambien cuando devuelve error. Con useTransition
// sobre un onClick y campos controlados, un correo que la accion rechaza SIGUE
// en pantalla para corregirlo. Ver COMPORTAMIENTO_MEDIDO.md §6.
import { useId, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  cambiarActivoPersonal,
  cambiarRolPersonal,
  darDeAltaPersonal,
  type ResultadoAdmin,
} from "@/lib/admin/acciones";
import type { MiembroPersonal, RolStaff } from "@/lib/admin/filtros";
import { plural } from "@/lib/admin/plural";

// Mismas dos etiquetas que ya usa components/cabecera-personal.tsx para el
// distintivo de rol -- "Administrador" / "Operador" --, repetidas aca y no
// importadas porque esa cabecera no exporta la constante, solo el JSX que la
// usa.
const ETIQUETAS_ROL: Record<RolStaff, string> = {
  admin: "Administrador",
  operator: "Operador",
};

// `registro` es un INSTANTE y no una fecha civil, asi que va en America/Lima.
// Solo dia: "desde cuando" no necesita la hora.
const FORMATO_FECHA = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// El correo, o el user_id cuando no hay fila en `alumnos` -posible con una
// cuenta de personal de otro dominio, ver MiembroPersonal en lib/admin/filtros.ts-.
function celdaCorreo(m: MiembroPersonal): string {
  return m.alumno?.email ?? m.userId;
}

function celdaNombre(m: MiembroPersonal): string {
  if (m.alumno === null) {
    return "Sin ficha de alumno";
  }

  const completo = [m.alumno.nombre, m.alumno.apellido].filter((p) => p !== null).join(" ");
  return completo.length > 0 ? completo : "Sin nombre registrado";
}

type TablaPersonalProps = {
  personal: MiembroPersonal[];
  // El sub de quien tiene la sesion abierta. `string | undefined` porque asi
  // sale de `data?.claims.sub`: en la practica siempre llega, pero el tipo no lo
  // promete y no se le miente con un `!`.
  miUserId: string | undefined;
};

export function TablaPersonal({ personal, miUserId }: TablaPersonalProps) {
  const [correo, setCorreo] = useState("");
  const [rolAlta, setRolAlta] = useState<RolStaff>("operator");
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const [pendienteAlta, iniciarAlta] = useTransition();

  const [errorFila, setErrorFila] = useState<string | null>(null);
  const [filaProcesando, setFilaProcesando] = useState<string | null>(null);
  const [pendienteFila, iniciarFila] = useTransition();

  const idCorreo = useId();
  const idRolAlta = useId();

  const activos = personal.filter((m) => m.activo).length;
  const desactivados = personal.length - activos;

  function darAlta() {
    setErrorAlta(null);
    iniciarAlta(async () => {
      const resultado: ResultadoAdmin = await darDeAltaPersonal(correo, rolAlta);

      if (resultado?.error) {
        setErrorAlta(resultado.error);
        return;
      }

      // Solo se limpia en el EXITO: el correo rechazado se queda escrito para
      // corregirlo.
      setCorreo("");
      setRolAlta("operator");
    });
  }

  function cambiarRol(userId: string, rol: RolStaff) {
    setErrorFila(null);
    setFilaProcesando(userId);
    iniciarFila(async () => {
      const resultado = await cambiarRolPersonal(userId, rol);

      if (resultado?.error) {
        setErrorFila(resultado.error);
      }

      setFilaProcesando(null);
    });
  }

  function alternarActivo(m: MiembroPersonal) {
    setErrorFila(null);
    setFilaProcesando(m.userId);
    iniciarFila(async () => {
      const resultado = await cambiarActivoPersonal(m.userId, !m.activo);

      if (resultado?.error) {
        setErrorFila(resultado.error);
      }

      setFilaProcesando(null);
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Dar de alta a alguien</h2>

        {/* El texto NO cuenta el motivo tecnico -que la busqueda va sobre
            `alumnos.auth_user_id`, que el trigger llena al PEDIR el enlace-:
            lo que lee la persona es solo la consecuencia practica. */}
        <p className="text-muted-foreground text-sm">
          Solo puedes dar de alta a alguien que ya entró al sistema alguna vez: pídele que abra la
          página de acceso y pida su enlace con su correo @upc.edu.pe. Después, escribe ese correo acá
          abajo y dale de alta.
        </p>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div>
            <Label htmlFor={idCorreo}>Correo</Label>
            <Input
              id={idCorreo}
              type="email"
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              placeholder="nombre@upc.edu.pe"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor={idRolAlta}>Rol</Label>
            <Select value={rolAlta} onValueChange={(v) => setRolAlta(v as RolStaff)}>
              <SelectTrigger id={idRolAlta} className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">Operador</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="button" disabled={correo.trim() === "" || pendienteAlta} onClick={darAlta}>
            {pendienteAlta ? "Dando de alta…" : "Dar de alta"}
          </Button>
        </div>

        {errorAlta && (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
            {errorAlta}
          </p>
        )}
      </section>

      <section className="space-y-4">
        {/* DOS RECUENTOS Y NO UNO: `personal` trae tambien a quien esta
            desactivado, que es justo quien NO tiene acceso. Uno solo mentiria
            en cuanto hubiera un desactivado. */}
        <h2 className="font-display text-lg font-semibold">
          {plural(activos, "persona", "personas")} con acceso
          {desactivados > 0 && <> · {plural(desactivados, "desactivada", "desactivadas")}</>}
        </h2>

        {errorFila && (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
            {errorFila}
          </p>
        )}

        {personal.length === 0 ? (
          <p className="text-muted-foreground text-sm">Todavía no hay nadie dado de alta.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Primer correo</TableHead>
                  <TableHead>Acceso</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {personal.map((m) => {
                  // LA FILA DE QUIEN ESTA MIRANDO, sin sus dos controles.
                  // NO ES UN CONTROL: RLS SI deja al admin tocar su propia fila,
                  // y despues no puede revertirlo. Con UN SOLO administrador en
                  // produccion, ese clic deja a todo el personal sin panel.
                  // Esconder el boton evita pisarlo; el agujero por SQL directo
                  // sigue abierto. Ver COMPORTAMIENTO_MEDIDO.md §2.
                  const esUno = miUserId !== undefined && m.userId === miUserId;

                  return (
                    <TableRow key={m.userId}>
                      <TableCell className="font-medium">
                        {celdaCorreo(m)}
                        {m.alumno === null && (
                          <span className="text-muted-foreground block text-xs">
                            Esta cuenta no tiene ficha de alumno.
                          </span>
                        )}
                      </TableCell>

                      <TableCell>{celdaNombre(m)}</TableCell>

                      <TableCell>
                        {esUno ? (
                          <span className="text-muted-foreground text-sm">
                            {ETIQUETAS_ROL[m.rol]}. No puedes cambiar tu propio rol desde aquí.
                          </span>
                        ) : (
                          <Select
                            value={m.rol}
                            onValueChange={(v) => cambiarRol(m.userId, v as RolStaff)}
                            disabled={pendienteFila}
                          >
                            <SelectTrigger aria-label={`Cambiar el rol de ${celdaCorreo(m)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="operator">Operador</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant={m.activo ? "secondary" : "destructive"}>
                          {m.activo ? "Activo" : "Desactivado"}
                        </Badge>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {FORMATO_FECHA.format(new Date(m.registro))}
                      </TableCell>

                      {/* D-80/D-85: la fecha del PRIMER magic link, que la
                          escribe Supabase Auth y expone la migracion 31.

                          "Primer correo" y no "Acceso" ni "Desde": la tabla ya
                          tiene esas dos, y tres fechas con nombres parecidos se
                          leen mal.

                          EL GUION NO ES UN FALLO: es null cuando la cuenta no
                          paso por Auth. */}
                      <TableCell className="whitespace-nowrap">
                        {m.primerAcceso === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          FORMATO_FECHA.format(new Date(m.primerAcceso))
                        )}
                      </TableCell>

                      <TableCell>
                        {esUno ? (
                          <span className="text-muted-foreground text-sm">
                            No puedes cambiar tu propio acceso desde aquí.
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pendienteFila}
                            onClick={() => alternarActivo(m)}
                          >
                            {pendienteFila && filaProcesando === m.userId
                              ? "Guardando…"
                              : m.activo
                                ? "Desactivar"
                                : "Reactivar"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
