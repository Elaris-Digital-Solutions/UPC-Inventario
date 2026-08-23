import { createHash } from 'node:crypto';

// El calculo PURO de la firma de una subida a Cloudinary. Cierra P0-4: en el
// sistema Vite el secreto viajaba al navegador con prefijo `VITE_`.
//
// ESTE ARCHIVO NO DECIDE NADA SOBRE PERMISOS y no conoce ninguna sesion: firma lo
// que le den con el secreto que le den. Quien decide SI hay que firmar es
// app/api/cloudinary/firma/route.ts.
//
// SIN LA DEPENDENCIA `cloudinary`: el SDK oficial trae el cliente de subida
// entero, y aqui no se sube nada -sube el NAVEGADOR, directo-. Hacen falta estas
// dos funciones y nada mas.

// Los tres parametros que Cloudinary NO incluye en la firma. `file` es el binario
// -firmarlo obligaria a tenerlo en el servidor, que es justo lo que este diseño
// evita-; `api_key` y `resource_type` van en la peticion pero fuera del calculo.
const FUERA_DE_LA_FIRMA = new Set(['file', 'api_key', 'resource_type']);

// Los parametros ORDENADOS ALFABETICAMENTE, como `clave=valor` unidos por `&`.
//
// LOS VACIOS SE DESCARTAN: un parametro que no se manda tampoco se firma. Firmar
// `folder=` sin mandarlo daria otra firma, y el fallo se veria como "credenciales
// invalidas", mandando a buscar el problema en el secreto, que estaria bien.
export function cadenaAFirmar(params: Record<string, string | number>): string {
  return Object.keys(params)
    .filter((clave) => !FUERA_DE_LA_FIRMA.has(clave))
    .filter((clave) => String(params[clave]) !== '')
    .sort()
    .map((clave) => `${clave}=${params[clave]}`)
    .join('&');
}

// SHA-1 de la cadena con el `api_secret` PEGADO AL FINAL, sin separador. Ese
// detalle lo fija una prueba con vector fijo: si alguien mete un '&', el hash
// cambia y la prueba lo dice.
//
// `async` aunque `createHash` sea sincrono, a proposito: la alternativa natural
// en un runtime web es `crypto.subtle.digest`, que SI es asincrona.
//
// SHA-1 AQUI NO ES UNA DEBILIDAD, y conviene decirlo antes de que alguien lo
// "arregle": no se hashea una contraseña ni se firma algo que un atacante pueda
// elegir. Es el algoritmo que Cloudinary exige, asi que cambiarlo no lo hace mas
// seguro, lo hace incompatible. Lo que protege el secreto es que nunca sale del
// servidor.
export async function firmar(
  params: Record<string, string | number>,
  apiSecret: string,
): Promise<string> {
  return createHash('sha1')
    .update(cadenaAFirmar(params) + apiSecret)
    .digest('hex');
}
