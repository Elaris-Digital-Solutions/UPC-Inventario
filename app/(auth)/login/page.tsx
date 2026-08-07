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
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-upc-red text-2xl">
            Entrar
          </CardTitle>
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
