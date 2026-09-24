"use client";

// El CAPTCHA de /login (H-9): Cloudflare Turnstile, verificado DENTRO de
// Supabase Auth -Attack Protection-, no por este codigo. Aqui solo se consigue
// el token que `signInWithOtp` le manda a Supabase.
//
// POR QUE HACE FALTA: pedir un magic link sale del navegador directo a
// supabase.co, y el tope de correos por hora es uno para todo el proyecto.
// Sin CAPTCHA, cualquiera lo agota con correos inventados y nadie entra esa hora.
//
// EL SCRIPT SE INSERTA A MANO y no con <Script>: esta pagina es un Client
// Component y no puede leer el nonce. La CSP lleva `strict-dynamic`, asi que un
// script insertado por codigo que ya tiene el nonce hereda la confianza
// (lib/seguridad/csp.ts). `render=explicit` porque el widget se pinta cuando
// este componente lo pide, no al cargar.
import { useEffect, useRef } from "react";

type OpcionesTurnstile = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (contenedor: HTMLElement, opciones: OpcionesTurnstile) => string;
      remove: (widgetId: string) => void;
    };
  }
}

// UNA carga por pagina, aunque el widget se monte varias veces: tras un error
// el login lo remonta para pedir un token nuevo, y cada token sirve una vez.
let carga: Promise<void> | null = null;

function cargarTurnstile(): Promise<void> {
  carga ??= new Promise<void>((resolver, rechazar) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolver();
    script.onerror = () => {
      // Se olvida la promesa para que el siguiente montaje lo reintente.
      carga = null;
      rechazar(new Error("No cargo el script de Turnstile"));
    };
    document.head.appendChild(script);
  });
  return carga;
}

type TurnstileProps = {
  siteKey: string;
  // `null` cuando el token caduca o el widget falla: el boton vuelve a esperar.
  onToken: (token: string | null) => void;
  onFallo: () => void;
};

export function Turnstile({ siteKey, onToken, onFallo }: TurnstileProps) {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    let widgetId: string | undefined;

    cargarTurnstile().then(
      () => {
        if (!vivo || !contenedor.current || !window.turnstile) {
          return;
        }
        widgetId = window.turnstile.render(contenedor.current, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(null),
          "error-callback": () => {
            onToken(null);
            onFallo();
          },
        });
      },
      () => {
        if (vivo) {
          onFallo();
        }
      },
    );

    return () => {
      vivo = false;
      if (widgetId !== undefined) {
        window.turnstile?.remove(widgetId);
      }
    };
  }, [siteKey, onToken, onFallo]);

  return <div ref={contenedor} />;
}
