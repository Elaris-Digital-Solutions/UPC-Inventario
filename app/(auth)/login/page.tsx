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

import { useCallback, useState, type FormEvent } from "react";
import Image from "next/image";

import { Turnstile } from "@/components/auth/turnstile";
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

// H-9. Sin esta variable -local, CI, y produccion hasta configurarla- no hay
// widget ni token y el login funciona como antes. ⚠ EL ORDEN DEL DESPLIEGUE
// IMPORTA: el CAPTCHA se enciende en Supabase DESPUES de publicar este codigo
// con la variable puesta; al reves, nadie puede pedir su enlace.
const SITE_KEY_TURNSTILE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Cada token sirve UNA vez: tras un intento fallido se remonta el widget con
  // otra `key` para que pida uno nuevo.
  const [intento, setIntento] = useState(0);

  // Estable, o el efecto del widget lo volveria a pintar en cada render.
  const avisarFallo = useCallback(() => {
    setError("No se pudo cargar la verificación anti-bots. Recarga la página.");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEstado("enviando");
    setError(null);

    const supabase = createClient();

    // SIN `emailRedirectTo`: el destino ya lo fija la plantilla de correo del
    // lado del servidor, asi que ningun valor controlable por quien pide el
    // enlace decide a donde va el enlace.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // True o nadie podria entrar la primera vez. A quien no sea de la UPC lo
        // para el enganche antes de crear la cuenta, no este formulario.
        shouldCreateUser: true,
        ...(captchaToken === null ? {} : { captchaToken }),
      },
    });

    // Gastado, haya salido bien o mal.
    setCaptchaToken(null);

    if (error) {
      setError(error.message);
      setEstado("idle");
      setIntento((n) => n + 1);
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
            // El MISMO mensaje exista o no la cuenta: no se revela que
            // direcciones estan registradas.
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Revisa tu correo: te enviamos un enlace de acceso. Es de un
                solo uso y caduca a los 15 minutos.
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
                  // `name` no lo usa el camino normal, pero decide COMO falla
                  // esto sin JavaScript: el navegador hace un envio nativo, y sin
                  // `name` recarga /login identico y el fallo es MUDO. Con el
                  // queda `?email=` en la URL, que es un rastro (D-33).
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
              {SITE_KEY_TURNSTILE && (
                <Turnstile
                  key={intento}
                  siteKey={SITE_KEY_TURNSTILE}
                  onToken={setCaptchaToken}
                  onFallo={avisarFallo}
                />
              )}
              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={
                  estado === "enviando" ||
                  (SITE_KEY_TURNSTILE !== undefined && captchaToken === null)
                }
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
