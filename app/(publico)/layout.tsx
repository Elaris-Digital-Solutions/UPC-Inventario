import { Cabecera } from "@/components/cabecera";
import { Pie } from "@/components/pie";

// Grupo de las pantallas PUBLICAS: la landing y la FAQ. No comprueba nada -no
// hay nada que comprobar-, solo les pone la cabecera y el pie compartidos.
//
// Existe para que esa cabecera NO viva en el layout raiz. Ahi arriba cualquier
// lectura de sesion volveria dinamicas todas las rutas, y aunque esta cabecera
// no lea sesion, poner una en la raiz obligaria a que la del alumno se sumara
// en vez de sustituirla: saldrian dos.
//
// Tipo escrito a mano y no LayoutProps<"/">: los layouts de un grupo entre
// parentesis no ocupan segmento de URL, asi que Next no los genera en
// LayoutRoutes. Es la correccion 37 de la tanda 1, y aqui vuelve a aplicar.
export default function PublicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Cabecera />
      {children}
      <Pie />
    </>
  );
}
