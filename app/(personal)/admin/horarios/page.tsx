import { Antetitulo, TituloSeccion } from "@/components/antetitulo";
import { TablaHorariosSede } from "@/components/admin/tabla-horarios-sede";
import { TablaTurnos } from "@/components/admin/tabla-turnos";
import { leerSlotMinutes } from "@/lib/admin/consultas";
import { listarHorariosPorSede, listarTurnos } from "@/lib/admin/horarios";
import { listarPersonal } from "@/lib/admin/personal";

// /admin/horarios, Tareas 8 y 9 de la F3-T4 (D-74, D-75, D-76, D-92, D-93).
//
// Server Component: las cuatro lecturas se hacen aca y las tablas viven en
// Client Components que reciben los datos ya traidos. Misma reparticion que
// app/(personal)/admin/dias/page.tsx.
//
// SIN cabecera ni pie propios: app/(personal)/layout.tsx y
// app/(personal)/admin/layout.tsx -que exige rol `admin`- ya los montan.
//
// LA PANTALLA QUE HACE FALTA QUE EXISTA ANTES DEL `db push`, y conviene decirlo
// aqui: `staff_shifts` nace VACIA en produccion, y con ella vacia la rejilla no
// ofrece ni una franja. El `db push` no es el ultimo paso; el ultimo es cargar
// horarios y turnos desde aca.
export default async function HorariosPage() {
  const [sedes, slotMinutos, turnos, personal] = await Promise.all([
    listarHorariosPorSede(),
    leerSlotMinutes(),
    listarTurnos(),
    listarPersonal(),
  ]);

  // SOLO EL PERSONAL ACTIVO, y de CUALQUIER rol (D-93). La baja de personal
  // desactiva y nunca borra, asi que sin este filtro el desplegable ofreceria a
  // quien ya no trabaja aqui. Los turnos VIEJOS de esa persona no se tocan: la
  // tabla los sigue mostrando.
  const activos = personal
    .filter((p) => p.activo)
    .map((p) => ({
      userId: p.userId,
      // El nombre puede faltar por DOS causas distintas y ninguna es rara:
      // `alumnos.nombre` es nulable, y puede no haber fila de `alumnos` en
      // absoluto -`staff_members.user_id` referencia `auth.users`, no
      // `alumnos`-. El correo es el respaldo y el `userId` el ultimo: perder de
      // vista a un miembro del personal es peor que mostrarlo sin nombre.
      nombre:
        p.alumno?.nombre && p.alumno.apellido
          ? `${p.alumno.nombre} ${p.alumno.apellido}`
          : (p.alumno?.email ?? p.userId),
      rol: p.rol,
    }));

  return (
    <main className="container py-8">
      <div className="mb-6">
        <Antetitulo>Administración</Antetitulo>
        <TituloSeccion como="h1">Horarios y turnos</TituloSeccion>
        <p className="text-muted-foreground text-sm">
          El horario de cada sede es el techo: marca hasta dónde se puede atender cada día. Un día
          sin horario está cerrado y no ofrece ninguna franja. Lo que el alumno ve de verdad es la
          parte de ese horario que algún turno cubre.
        </p>
      </div>

      <div className="space-y-8">
        {sedes.map((sede) => (
          <TablaHorariosSede key={sede.id} sede={sede} slotMinutos={slotMinutos} />
        ))}

        <TablaTurnos
          turnos={turnos}
          personal={activos}
          sedes={sedes.map((s) => ({ id: s.id, nombre: s.nombre }))}
        />
      </div>
    </main>
  );
}
