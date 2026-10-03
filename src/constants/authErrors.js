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
