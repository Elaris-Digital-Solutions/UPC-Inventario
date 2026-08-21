import { Antetitulo, TituloSeccion } from "@/components/antetitulo";
import { TablaHorariosSede } from "@/components/admin/tabla-horarios-sede";
import { leerSlotMinutes } from "@/lib/admin/consultas";
import { listarHorariosPorSede } from "@/lib/admin/horarios";

// /admin/horarios, Tarea 8 de la F3-T4 (D-74, D-75, D-76).
//
// Server Component: las dos lecturas se hacen aca y las tablas viven en un
// Client Component que recibe los datos ya traidos. Misma reparticion que
// app/(personal)/admin/dias/page.tsx.
//
// SIN cabecera ni pie propios: app/(personal)/layout.tsx y
// app/(personal)/admin/layout.tsx -que exige rol `admin`- ya los montan.
//
// LA PANTALLA QUE ESTA TANDA HACE FALTA QUE EXISTA ANTES DEL `db push`, y
// conviene decirlo aqui: `staff_shifts` nace VACIA en produccion, y con ella
// vacia la rejilla no ofrece ni una franja. El `db push` no es el ultimo paso;
// el ultimo es cargar horarios y turnos desde aca.
export default async function HorariosPage() {
  const [sedes, slotMinutos] = await Promise.all([listarHorariosPorSede(), leerSlotMinutes()]);

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
      </div>
    </main>
  );
}
