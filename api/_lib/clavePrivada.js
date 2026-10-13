/*
  La clave privada del service account viaja en una variable de entorno, y
  Vercel la normaliza distinto segun como se pegue: a veces con los \n
  literales del JSON y a veces con saltos reales. Las dos formas se aceptan
  para que nadie tenga que acordarse de cual era.

  Las comillas de los extremos tambien se sacan: es el error mas comun al
  copiar el valor desde el archivo JSON.
*/
export const normalizarClave = (valor) =>
  String(valor ?? "")
    .replace(/^"|"$/g, "")
    .replace(/\\n/g, "\n");
