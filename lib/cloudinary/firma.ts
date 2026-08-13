import { createHash } from 'node:crypto';

// El calculo PURO de la firma de una subida a Cloudinary. Cierra P0-4, que era
// el ultimo defecto critico abierto de la auditoria: en el sistema Vite el
// secreto viajaba al navegador con prefijo `VITE_`.
//
// ESTE ARCHIVO NO DECIDE NADA SOBRE PERMISOS y no conoce ninguna sesion. Firma
// lo que le den con el secreto que le den. Quien decide SI hay que firmar es
// app/api/cloudinary/firma/route.ts, y ese archivo lleva escrito por que la
// decision vive alli y no en RLS.
//
// SIN LA DEPENDENCIA `cloudinary`. El SDK oficial trae el cliente de subida
// entero, y aca no se sube nada: sube el NAVEGADOR, directo contra Cloudinary,
// con la firma que este modulo calcula. Lo unico que hace falta son estas dos
// funciones.
//
// IMPORTS: `node:crypto` es del runtime de Node, no del alias `@/`, asi que
// Vitest lo resuelve sin problema. La regla de los imports relativos aplica a
// los modulos DEL PROYECTO, que es lo que Vitest no sabe resolver.

// Los tres parametros que Cloudinary NO incluye en la firma. `file` es el
// binario -- firmarlo obligaria a tenerlo en el servidor, que es justo lo que
// este diseño evita --; `api_key` y `resource_type` van en la peticion pero
// fuera del calculo.
const FUERA_DE_LA_FIRMA = new Set(['file', 'api_key', 'resource_type']);

// La cadena que se firma: los parametros ORDENADOS ALFABETICAMENTE por clave,
// como `clave=valor`, unidos por `&`.
//
// LOS VACIOS SE DESCARTAN, y no es una comodidad: un parametro que no se manda
// tampoco se firma. Si se firmara `folder=` y la peticion no llevara `folder`,
// Cloudinary calcularia otra firma y rechazaria la subida -- un fallo que se
// vería como "credenciales invalidas" y mandaria a buscar el problema en el
// secreto, que estaria bien.
export function cadenaAFirmar(params: Record<string, string | number>): string {
  return Object.keys(params)
    .filter((clave) => !FUERA_DE_LA_FIRMA.has(clave))
    .filter((clave) => String(params[clave]) !== '')
    .sort()
    .map((clave) => `${clave}=${params[clave]}`)
    .join('&');
}

// SHA-1 de la cadena con el `api_secret` PEGADO AL FINAL, sin ningun
// separador. El detalle del separador esta fijado por una prueba con vector
// fijo: si alguien mete un '&' ahi, el hash cambia y la prueba lo dice.
//
// `async` aunque `createHash` sea sincrono. Es a proposito: la firma es una
// operacion criptografica y la alternativa natural en un runtime web seria
// `crypto.subtle.digest`, que SI es asincrona. Devolver una promesa desde el
// principio deja cambiar de implementacion sin tocar a ningun llamador.
//
// SHA-1 aca NO es una debilidad, y conviene dejarlo escrito antes de que
// alguien lo "arregle": no se esta hasheando una contraseña ni firmando algo
// que un atacante pueda elegir a placer. Es el algoritmo que Cloudinary exige
// para validar la peticion de subida, asi que cambiarlo no lo hace mas seguro,
// lo hace incompatible. Lo que protege el secreto es que nunca sale del
// servidor.
export async function firmar(
  params: Record<string, string | number>,
  apiSecret: string,
): Promise<string> {
  return createHash('sha1')
    .update(cadenaAFirmar(params) + apiSecret)
    .digest('hex');
}
