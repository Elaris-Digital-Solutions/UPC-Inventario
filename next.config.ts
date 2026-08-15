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

  // Las fotos del catalogo viven en Cloudinary: product_images.secure_url
  // guarda URLs de res.cloudinary.com, y es el UNICO host -medido el
  // 2026-08-08 contra el proyecto real, sobre las 34 imagenes-.
  //
  // next/image BLOQUEA cualquier host remoto que no este declarado aca. Y el
  // fallo es del mismo genero que los cinco de la tanda 1: no lo ve
  // `typecheck`, no lo ve `lint` y no lo ve `build`, porque no es un error de
  // lo que el codigo dice sino de a que se conecta. Aparece cuando el
  // navegador pide la imagen, o mas exacto: cuando el optimizador de imagenes
  // de Next -que corre en el servidor y va a buscarla el mismo- se niega a
  // pedirla.
  //
  // pathname '/**' y no una ruta concreta: el `folder` de Cloudinary es
  // configurable por entorno y acotarlo aca romperia el dia que alguien lo
  // cambie, sin ganar nada -el host ya es la frontera que importa-.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  // Tres cabeceras de seguridad que NO dependen de la peticion -a diferencia
  // de la CSP con nonce, que si depende de cada peticion y por eso vive en
  // proxy.ts y no aca-.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Sin `preload`: esa lista solo se sale con meses de espera, y este
          // proyecto todavia no tiene dominio ni despliegue. Comprometerse
          // antes de tenerlo es firmar por otro.
          //
          // Solo en produccion: el entorno local se prueba por
          // http://127.0.0.1:3000 y el navegador ignora HSTS sobre http, asi
          // que mandarla en desarrollo no haria dano directo -pero un HSTS
          // con includeSubDomains que un navegador llegue a recordar para
          // 127.0.0.1 deja la maquina sin poder abrir NADA local por http, y
          // eso se arregla a mano en la configuracion del navegador. Riesgo
          // asimetrico: no mandarla en desarrollo no cuesta nada, y mandarla
          // puede costar caro.
          //
          // Esta cabecera NO se pudo verificar por su efecto en este
          // proyecto, porque no hay despliegue ni https todavia. Se verifica
          // leyendo la respuesta con las herramientas del navegador el dia
          // que haya un entorno con TLS real, no antes.
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
