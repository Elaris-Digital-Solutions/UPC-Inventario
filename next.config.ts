import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 bloquea por defecto las peticiones cross-origin a los recursos de
  // desarrollo (/_next/*) y considera `localhost` el unico origen propio: el
  // hostname con el que se inicializo el servidor. Documentado en
  // node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/allowedDevOrigins.md
  //
  // Este proyecto se prueba SIEMPRE por 127.0.0.1, y no es un capricho: el
  // `site_url` del stack local es 127.0.0.1 y el navegador guarda las cookies
  // por host, asi que abrir la aplicacion en `localhost` deja la sesion en el
  // origen equivocado. Las dos restricciones chocan, y esta linea es la unica
  // forma de satisfacer las dos.
  //
  // Sin ella, los chunks de JavaScript responden 403 SOLO a un navegador -que
  // manda cabecera `Origin`- y no a curl, que no la manda. React no hidrata,
  // los formularios dejan de tener manejador y el envio se convierte en un
  // GET nativo que no va a ninguna parte. Sin un solo error en el servidor.
  //
  // Solo tiene efecto en `next dev`.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
