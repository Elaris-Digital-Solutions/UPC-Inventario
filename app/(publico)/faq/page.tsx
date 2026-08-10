// Pagina de preguntas frecuentes. ESTATICA a proposito: no hace ninguna
// consulta a la base, ni siquiera a la configuracion. Server Component
// normal, sin async, para que se sirva desde el prerender.
//
// Los numeros de aqui abajo estan escritos a mano, medidos contra la
// configuracion real el 2026-08-08: horario 08:00-22:00 hora de Lima,
// bloques de 30 minutos, ventana de reserva de 7 dias movil, una reserva por
// equipo y por dia. La duracion maxima NO se escribe como un numero unico:
// es un limite por equipo, no global. Hoy todos los equipos coinciden en el
// mismo valor, pero escribir ese numero aqui prometeria una regla que no es
// la real -la regla real vive en la ficha de cada equipo-.
//
// Esa mano tiene un costo, y se acepta con el costo dicho por delante: si
// alguien cambia el horario o la ventana desde la configuracion del
// sistema, esta pagina se queda desactualizada y nadie se entera, porque
// nada la vuelve a comparar contra la base. Se acepta porque hoy esa
// configuracion no tiene interfaz de administracion -llega en la tanda 3-, y
// porque una FAQ que consulta la base deja de ser estatica, que es
// justamente lo que la hace barata de servir.
//
// CUANDO LA TANDA 3 LE DE INTERFAZ AL ADMIN PARA CAMBIAR ESA CONFIGURACION,
// HAY QUE VOLVER AQUI Y COMPROBAR SI ESTOS NUMEROS SIGUEN SIENDO CIERTOS.

import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Preguntas frecuentes · UPC-Inventario",
  description:
    "Cómo entrar, cuándo y por cuánto tiempo reservar equipos, en qué sedes, y qué pasa si cancelas o no te presentas.",
};

type Pregunta = {
  pregunta: string;
  respuesta: string;
};

type SeccionFaq = {
  titulo: string;
  preguntas: Pregunta[];
};

// Contenido medido contra la configuracion real el 2026-08-08 (ver el
// comentario de cabecera de este archivo). Vive como datos y no como JSX
// repetido para que agregar o corregir una pregunta sea editar una fila, no
// duplicar marcado.
const SECCIONES: SeccionFaq[] = [
  {
    titulo: "Quién puede reservar",
    preguntas: [
      {
        pregunta: "¿Necesito crear una cuenta?",
        respuesta:
          "No. No hay registro. Entras con tu correo institucional @upc.edu.pe y recibes un enlace de acceso en ese buzón; al abrirlo ya estás dentro. La primera vez se te piden nombre, apellido y carrera.",
      },
      {
        pregunta: "¿Puedo entrar con otro correo?",
        respuesta:
          "No. Solo se acepta el correo @upc.edu.pe. Cualquier otro dominio se rechaza al pedir el enlace.",
      },
      {
        pregunta: "¿Por qué un enlace por correo y no una contraseña?",
        respuesta:
          "Porque abrir el correo en tu buzón UPC ya demuestra que la cuenta es tuya, así no hay ninguna contraseña que se te pueda olvidar ni filtrar.",
      },
    ],
  },
  {
    titulo: "Cuándo y por cuánto tiempo",
    preguntas: [
      {
        pregunta: "¿En qué horario puedo reservar?",
        respuesta: "De 08:00 a 22:00, hora de Lima.",
      },
      {
        pregunta: "¿En bloques de cuánto tiempo?",
        respuesta:
          "De 30 minutos. Una reserva dura 30, 60, 90 minutos, y así sucesivamente: siempre un múltiplo de 30.",
      },
      {
        pregunta: "¿Cuál es el máximo que puedo reservar?",
        respuesta:
          "Depende del equipo. Cada equipo tiene su propio límite y lo ves en su ficha, así que no hay un número único para todo el catálogo.",
      },
      {
        pregunta: "¿Con cuánta anticipación puedo reservar?",
        respuesta:
          "Hasta 7 días por delante, contados desde este momento. La ventana se mueve contigo, día a día: no queda fija a una fecha de la semana.",
      },
      {
        pregunta: "¿Puedo reservar el mismo equipo dos veces el mismo día?",
        respuesta:
          "No. Es una reserva por equipo y por día. Sí puedes reservar equipos distintos el mismo día.",
      },
    ],
  },
  {
    titulo: "Dónde",
    preguntas: [
      {
        pregunta: "¿En qué sedes puedo reservar?",
        respuesta:
          "En Monterrico y en San Miguel. Eliges la sede al buscar en el catálogo, y solo se te muestran los equipos que hay en esa sede.",
      },
      {
        pregunta: "¿Puedo recoger en una sede lo que reservé en otra?",
        respuesta:
          "No. El equipo que reservas es el de esa sede, y ahí se recoge.",
      },
    ],
  },
  {
    titulo: "Cancelar y no presentarse",
    preguntas: [
      {
        pregunta: "¿Puedo cancelar una reserva?",
        respuesta:
          "Sí, mientras no te hayan entregado el equipo, y se te pide un motivo. Una vez entregado ya no se puede cancelar: lo que corresponde es devolverlo.",
      },
      {
        pregunta: "¿Qué pasa si no recojo lo que reservé?",
        // "pierdes el acceso" y no "quedas bloqueado": el participio concuerda
        // en genero con quien lee, y aqui no se sabe cual es. La forma verbal
        // no marca ninguno.
        respuesta:
          "A la segunda vez en 90 días, pierdes el acceso durante 15 días. Una sola vez no bloquea nada.",
      },
      {
        pregunta: "¿Y si me llevo el equipo y no lo devuelvo?",
        respuesta: "Bloqueo permanente, y hay que resolverlo con el personal.",
      },
      {
        pregunta: "¿Por qué existen estas reglas?",
        respuesta:
          "Porque un equipo reservado y no recogido es un equipo que nadie más pudo usar.",
      },
    ],
  },
  {
    titulo: "El día de la reserva",
    preguntas: [
      {
        pregunta: "¿Qué llevo el día de la reserva?",
        respuesta:
          "Tu carné o identificación, a la sede que elegiste y dentro de tu franja horaria.",
      },
      {
        pregunta: "¿Puedo extender la reserva?",
        respuesta:
          "No desde la plataforma. Si necesitas más tiempo, consúltalo en el mostrador.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <main className="container flex-1 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl sm:text-5xl">
          Preguntas frecuentes
        </h1>
        <p className="text-muted-foreground mt-4 max-w-prose text-lg">
          Todo lo que necesitas saber antes de tu primera reserva.
        </p>

        {SECCIONES.map((seccion, index) => (
          <section key={seccion.titulo} className="mt-12">
            {index > 0 && <Separator className="mb-12" />}
            <h2 className="font-display text-2xl sm:text-3xl">
              {seccion.titulo}
            </h2>
            <div className="mt-6 space-y-6">
              {seccion.preguntas.map((item) => (
                <div key={item.pregunta}>
                  <h3 className="text-lg font-semibold">{item.pregunta}</h3>
                  <p className="text-muted-foreground mt-1">
                    {item.respuesta}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Llamada discreta: nada de la caja destacada de la landing. Quien
            llego hasta aca ya esta leyendo, no hace falta convencerlo con
            un bloque grande. */}
        {/* El cierre invita a entrar, asi que la linea de arriba tiene que
            llevar ahi. "¿No encontraste lo que buscabas?" seguido de un boton
            de acceso no encaja: si no encontro la respuesta, entrar no se la
            da. Se pregunta por lo que el boton si resuelve. */}
        <section className="border-border/60 mt-16 border-t pt-12 text-center">
          <p className="text-muted-foreground">
            ¿Ya sabes qué equipo necesitas?
          </p>
          <Button asChild size="lg" className="mt-4">
            <Link href="/login">Entrar con mi correo UPC</Link>
          </Button>
          <p className="mt-4 text-sm">
            <Link
              href="/"
              className="text-primary underline-offset-4 hover:underline"
            >
              Volver al inicio
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
