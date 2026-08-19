"use client";

// El alta y la tabla de /admin/personal (Task 9 de la tanda 3B, D-52 y D-53).
// Misma idea que PanelDias (components/admin/panel-dias.tsx): el formulario
// de alta y la lista comparten estado -- dar de alta a alguien tiene que
// hacer aparecer la fila nueva sin recargar --, asi que van en un solo Client
// Component en vez de repartirse en dos hermanos que igual necesitarian un
// padre comun con ese mismo estado.
//
// SIN <form action={...}> Y SIN useActionState, igual que
// FormularioEditarProducto (components/admin/formulario-editar-producto.tsx):
// React RESETEA un <form action> cuando la accion TERMINA, tambien cuando
// devuelve error, y eso ya costo perder un formulario entero en esta misma
// tanda (ver el comentario de ese archivo). El alta se dispara con
// useTransition sobre un onClick, con los campos controlados por useState, asi
// que un correo mal escrito que la accion rechaza SIGUE en pantalla para
// corregirlo -- no hay reset de por medio que pueda borrarlo.
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

// `registro` (created_at) es un instante -- `timestamptz`, no una fecha civil
// como `disabled_days.date` --, asi que se formatea en America/Lima, igual
// criterio que FORMATO_FECHA_HORA de components/admin/tabla-reservas.tsx.
// Solo dia: "desde cuando" no necesita la hora.
const FORMATO_FECHA = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// El correo de un miembro, o su user_id cuando no hay fila en `alumnos` --
// ver el comentario de MiembroPersonal.alumno en lib/admin/filtros.ts: puede
// pasar con una cuenta de personal de otro dominio.
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
  // El sub de quien tiene la sesion abierta, leido por page.tsx con
  // getClaims(). `string | undefined` porque asi sale de
  // `data?.claims.sub` -- en la practica siempre llega, porque
  // app/(personal)/layout.tsx ya redirige a quien no tiene sesion antes de
  // que esta pantalla se pinte, pero el tipo no promete eso y no se le miente
  // con un `!`.
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

      // Solo se limpia en el EXITO. El correo que la accion rechazo se queda
      // escrito para corregirlo -- no hay ningun reset automatico de por
      // medio que pueda borrarlo primero.
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

        {/* EL TEXTO DE PANTALLA, en tuteo. NO cuenta el motivo tecnico -- que
            staff_members.user_id referencia auth.users, que la aplicacion
            solo ve los esquemas public y graphql_public (supabase/config.toml)
            y que por eso esta pantalla busca sobre alumnos.auth_user_id, la
            columna que el trigger handle_new_auth_user
            (supabase/migrations/20260805194424_alumno_provisioning.sql:26-37)
            llena al PEDIR el enlace de acceso, no al abrirlo --. Eso queda
            aca, en el comentario; lo que lee la persona es solo la
            consecuencia practica. */}
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
        {/* DOS RECUENTOS Y NO UNO, con plural() los dos: `personal` trae
            tambien a quien esta desactivado, y esa gente es justo la que NO
            tiene acceso. Un solo "{n} con acceso" contando el array entero
            mentiria en cuanto hubiera un desactivado -- mismo genero que
            "1 activas", que es por lo que existe plural(). */}
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
                  //
                  // ESTO NO ES UN CONTROL: quien decide de verdad es RLS, y RLS
                  // SI deja al admin tocar su propia fila. MEDIDO hoy
                  // 2026-08-13 por PostgREST contra el stack local -- ver el
                  // comentario de cambiarRolPersonal() y
                  // cambiarActivoPersonal() en lib/admin/acciones.ts, que
                  // repite esta misma comprobacion en el servidor --:
                  //
                  //   - El admin desactivandose a si mismo: HTTP 200 CON LA
                  //     FILA de vuelta. RLS lo permite.
                  //   - Ese mismo admin, despues, intentando reactivarse:
                  //     HTTP 200 con CUERPO VACIO `[]`. private.is_admin()
                  //     exige `activo` y ya no lo esta, asi que la politica lo
                  //     deja fuera en silencio.
                  //
                  // Sigue viendo su propia fila en esta tabla -- por eso
                  // veria el problema -- pero no podria arreglarlo desde
                  // aca. Con UN SOLO administrador en produccion, ese clic
                  // deja a todo el personal sin panel y sin nadie que pueda
                  // revertirlo desde la aplicacion. Esconder el boton evita
                  // pisar ese caso; el agujero por SQL directo SIGUE ABIERTO,
                  // esto no lo cierra.
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

                      {/*
                        D-80 / D-85: la fecha del PRIMER magic link, que no la
                        guarda este proyecto -- la escribe Supabase Auth al
                        PEDIRLO -- y que la migracion 31 expone.

                        SE LLAMA "Primer correo" Y NO "Acceso" NI "Desde" a
                        proposito: esta tabla ya tiene esas dos, y "Desde" es
                        ademas otra fecha -- cuando se le dio de alta como
                        personal --. Tres fechas con nombres parecidos se leen
                        mal.

                        EL GUION NO ES UN FALLO: `primerAcceso` es null cuando
                        la cuenta no paso por Auth -- una fila de personal
                        insertada por SQL directo -- o cuando quien mira no es
                        admin, que aqui no puede pasar porque el layout lo para
                        antes.
                      */}
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
