// Las credenciales invalidas comparten UN mensaje a proposito: distinguir
// "ese email no existe" de "la contrasenia es incorrecta" convierte el
// formulario en un detector de cuentas registradas.
const CREDENCIAL_INVALIDA = "El email o la contraseña no son correctos.";

const MENSAJES = {
  "auth/email-already-in-use": "Ese email ya tiene una cuenta. Probá iniciar sesión.",
  "auth/invalid-email": "Ese email no tiene un formato válido.",
  "auth/weak-password": "La contraseña es demasiado débil. Usá al menos 8 caracteres.",
  "auth/user-not-found": CREDENCIAL_INVALIDA,
  "auth/wrong-password": CREDENCIAL_INVALIDA,
  "auth/invalid-credential": CREDENCIAL_INVALIDA,
  "auth/too-many-requests": "Demasiados intentos. Esperá unos minutos y volvé a probar.",
  "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de terminar.",
  "auth/network-request-failed": "No pudimos conectarnos. Revisá tu conexión.",
};

export const mensajeDeError = (codigo) =>
  MENSAJES[codigo] ?? "No pudimos completar la operación. Probá de nuevo en un momento.";

// Estos codigos hablan del pedido, no de la cuenta, asi que mostrarlos no
// revela si el email esta registrado.
const ERRORES_DEL_PEDIDO = {
  "auth/invalid-email": "Ese email no tiene un formato válido.",
  "auth/missing-email": "Escribí tu email.",
  "auth/network-request-failed": "No pudimos conectarnos. Revisá tu conexión.",
  "auth/too-many-requests": "Demasiados intentos. Esperá unos minutos y volvé a probar.",
};

// Decide que mostrar cuando falla un reset de contrasenia.
// Devuelve el mensaje de error, o null si hay que mostrar la confirmacion
// generica. `auth/user-not-found` devuelve null a proposito: decirle a la
// persona que ese email no tiene cuenta convertiria el formulario en un
// detector de cuentas registradas.
//
// Lo que NO se puede hacer es tragar todos los errores y decir "te enviamos
// un link": a quien escribio mal el email, o se le cayo la red, lo deja
// esperando un mail que nunca se pidio y encerrado afuera de su cuenta.
export const mensajeDeErrorDeReset = (codigo) => ERRORES_DEL_PEDIDO[codigo] ?? null;
