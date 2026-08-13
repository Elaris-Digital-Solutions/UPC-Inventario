'use client';

// Pantalla de acceso por magic link.
//
// Este formulario NO comprueba el dominio del correo a proposito. Las dos
// puertas de verdad son el enganche `before_user_created` (D-32) y el trigger
// `handle_new_auth_user` (D-9), las dos en la base de datos. Comprobarlo aqui
// tambien seria replicar la autorizacion, que el diseno prohibe, y ademas
// dejaria de ejercitarse la puerta real: si alguien apagara el enganche desde
// el dashboard, con el filtro puesto aqui nadie se enteraria. El mensaje que
// ve el usuario sale del servidor, que es la unica fuente de verdad.

import { useState, type FormEvent } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Estado = "idle" | "enviando" | "enviado";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEstado("enviando");
    setError(null);

    const supabase = createClient();

    // No se pasa `emailRedirectTo`: la plantilla de correo apunta a
    // `{{ .SiteURL }}/auth/confirm` con el `token_hash`, asi que el destino ya
    // esta fijado del lado del servidor y no depende de un parametro que viaje
    // en la peticion. Menos superficie: ningun valor controlable por quien
    // pide el enlace decide a donde va el enlace.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Tiene que ser true: si no, nadie podria entrar la primera vez. A
        // quien se cuele por aqui sin ser de la UPC lo para el enganche antes
        // de crear la cuenta, no este formulario.
        shouldCreateUser: true,
      },
    });

    if (error) {
      setError(error.message);
      setEstado("idle");
      return;
    }

    setEstado("enviado");
  }

  function handleReintentar() {
    setEstado("idle");
    setError(null);
  }

  return (
    <main className="container flex flex-1 flex-col items-center justify-center py-16">
      {/* La tarjeta de acceso, recuperada el 2026-08-13. El Vite ponia la
          llama de la UPC DENTRO de la tarjeta, con el titulo y la bajada
          centrados debajo (MIGRATION_GUIDE/src/pages/Login.tsx:63-67). Aqui
          era un titulo rojo alineado a la izquierda sin ninguna marca, en una
          tarjeta que ademas flotaba sin peso.
          `[--card-spacing:--spacing(8)]`: el Vite le daba `p-8` a esta
          tarjeta en concreto -mas aire que a las del catalogo-, y con el
          token se cambia el relleno de cabecera y contenido a la vez en vez
          de parchear cada hijo. */}
      <Card className="w-full max-w-md [--card-spacing:--spacing(8)]">
        {/* `justify-items-center` y no `items-center`: CardHeader es un grid,
            asi que `items-center` alinea en el eje de bloque -vertical- y deja
            el logo pegado a la izquierda. El eje en linea es `justify-items`. */}
        <CardHeader className="justify-items-center text-center">
          <Image
            src="/upc-logo.png"
            alt=""
            width={600}
            height={600}
            priority
            className="mb-2 h-14 w-auto"
          />
          {/* Sin `font-display`: el titulo de la tarjeta de acceso iba en
              Montserrat en el original -`text-2xl font-bold`,
              MIGRATION_GUIDE/src/pages/Login.tsx:65-, no en Playfair. La
              serif es de los titulos de pagina y de seccion. */}
          <CardTitle className="text-2xl font-bold">Entrar</CardTitle>
          <CardDescription>
            Se entra con el correo institucional: sin contraseña, con un
            enlace de acceso que llega a tu correo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {estado === "enviado" ? (
            // Se muestra el mismo mensaje exista o no la cuenta detras de ese
            // correo, para no revelar que direcciones estan registradas.
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Revisa tu correo: te enviamos un enlace de acceso. Es de un
                solo uso y caduca en una hora.
              </p>
              <Button
                type="button"
                variant="link"
                onClick={handleReintentar}
                className="h-auto p-0 text-sm"
              >
                Usar otra dirección
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">
                  Correo institucional
                </label>
                <Input
                  id="email"
                  // `name` no lo usa el camino normal -React lee el valor del
                  // estado-, pero decide COMO falla esto cuando no hay
                  // JavaScript: sin manejador, el navegador hace un envio
                  // nativo, y sin `name` ese envio no lleva nada, asi que
                  // recarga /login identico y el fallo es mudo. Con `name`
                  // queda `?email=...` en la URL, que es un rastro. Costo una
                  // hora de diagnostico el 2026-08-07 (D-33).
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nombre@upc.edu.pe"
                />
              </div>
              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={estado === "enviando"}
                className="w-full"
              >
                {estado === "enviando" ? "Enviando..." : "Enviar enlace"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      {/*
        No hay boton de Microsoft: Q-16, el acceso al tenant de Entra ID de la
        universidad fue denegado. Un boton deshabilitado seria una promesa que
        esta pantalla no puede cumplir.
      */}
    </main>
  );
}
