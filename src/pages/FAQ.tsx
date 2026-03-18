import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const faqs = [
  {
    question: "¿Con cuánta anticipación puedo hacer una reserva?",
    answer: "Puedes reservar equipos a partir del día domingo a las 00:00 para cualquier día de esa misma semana (hasta el domingo siguiente). No se aceptan reservas para fechas posteriores al domingo de la semana en curso.",
  },
  {
    question: "¿Por cuánto tiempo máximo puedo reservar un equipo?",
    answer: "El tiempo máximo de reserva por equipo es de 4 horas continuas, dependiendo del tipo de dispositivo y su disponibilidad.",
  },
  {
    question: "¿Qué sucede si devuelvo el equipo tarde?",
    answer: "Las devoluciones tardías son penalizadas estrictamente. Si devuelves un equipo fuera de tu horario establecido, no se te permitirá realizar nuevas reservas durante un mes calendario.",
  },
  {
    question: "¿Puedo cancelar mi reserva?",
    answer: "Sí, ahora puedes cancelar tu reserva confirmada desde tu panel de usuario antes de la hora programada.",
  },
  {
    question: "¿Qué sucede si no retiro mi dispositivo reservado a tiempo?",
    answer: "Si no retiras tu dispositivo reservado a tiempo por dos ocasiones consecutivas, recibirás una penalización de no poder solicitar préstamos por 15 días calendario.",
  },
  {
    question: "¿Qué ocurre si el equipo presenta fallas o daños?",
    answer: "Si al recibir el equipo notas algún daño físico o falla de software, repórtalo inmediatamente al personal encargado de inventario. No te preocupes por los costos, los daños de los equipos están cubiertos por un seguro institucional.",
  },
];

const FAQ = () => {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f7]">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-hero px-4 py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(354_72%_50%/0.2),transparent_70%)]" />
        <div className="relative mx-auto max-w-4xl">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/80">
            SOPORTE Y AYUDA
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            Preguntas Frecuentes
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/80">
            Encuentra información rápida sobre el proceso de reserva, uso y devolución de los equipos de la universidad.
          </p>
        </div>
      </section>

      {/* Accordion Content */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-b border-gray-100 last:border-0">
                <AccordionTrigger className="text-left font-semibold text-gray-900 transition-colors hover:text-primary py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
