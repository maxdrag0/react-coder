/*
  Direccion y ciudad del envio.

  El negocio es "me llega el pedido y te contacto para coordinar el pago y el
  envio". El telefono resuelve el contacto; esto resuelve el envio: sin la
  direccion hay que escribirle de nuevo a cada persona para preguntarsela,
  y eso pasa UNA VEZ POR PEDIDO.

  La validacion es deliberadamente suelta, igual que la del telefono:
  rechazar una direccion valida es peor que aceptar una rara, porque el dueno
  la va a leer igual antes de despachar. Solo frena lo que no puede ser una
  direccion. En el interior "Ruta 5 km 12" es una direccion completa, asi que
  no se exige altura; y hay pueblos con nombres de tres letras.
*/

const DIRECCION_MINIMA = 5;
const DIRECCION_MAXIMA = 120;
const CIUDAD_MINIMA = 2;
const CIUDAD_MAXIMA = 60;

// Una letra, de cualquier alfabeto: "1234" no es una direccion ni una ciudad.
const tieneLetras = (valor) => /\p{L}/u.test(valor);

/** Sin espacios en los bordes y sin espacios repetidos en el medio. */
export const limpiarTexto = (valor) =>
  String(valor ?? "")
    .trim()
    .replace(/\s+/g, " ");

/** Mensaje para mostrar al lado del campo, o null si esta bien. */
export const errorDeDireccion = (valor) => {
  const d = limpiarTexto(valor);
  if (d === "") return "Necesitamos tu dirección para el envío.";
  if (!tieneLetras(d) || d.length < DIRECCION_MINIMA) {
    return "Escribí la calle y la altura, como San Martín 742.";
  }
  if (d.length > DIRECCION_MAXIMA) {
    return `Son demasiados caracteres (máximo ${DIRECCION_MAXIMA}).`;
  }
  return null;
};

/** Mensaje para mostrar al lado del campo, o null si esta bien. */
export const errorDeCiudad = (valor) => {
  const c = limpiarTexto(valor);
  if (c === "") return "Necesitamos la ciudad o localidad del envío.";
  if (!tieneLetras(c) || c.length < CIUDAD_MINIMA) {
    return "Escribí el nombre de la ciudad o localidad.";
  }
  if (c.length > CIUDAD_MAXIMA) {
    return `Son demasiados caracteres (máximo ${CIUDAD_MAXIMA}).`;
  }
  return null;
};

/**
 * Si hay que pedirle los datos de envio a esta persona. Mira lo GUARDADO:
 * un perfil con la direccion en blanco no cuenta como cargada.
 */
export const faltaEnvio = (perfil) =>
  errorDeDireccion(perfil?.direccion) !== null ||
  errorDeCiudad(perfil?.ciudad) !== null;
