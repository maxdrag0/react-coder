const formateador = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Devuelve el precio formateado, o null si no hay un precio que mostrar.
 * Devolver null y no "" permite que quien lo use decida no renderizar la fila
 * entera: hay productos sin precio de display ni de bulto, y una fila vacía
 * se lee como un error.
 */
export const formatearPrecio = (valor) => {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) {
    return null;
  }
  return formateador.format(valor).replace(/\s/g, "");
};

/** Como formatearPrecio pero siempre devuelve texto, incluido el cero. */
export const formatearTotal = (valor) =>
  // El \s lleva backslash: sin el borraba la letra "s" en vez del espacio, y
  // el total del carrito quedaba con un espacio que el resto de la app no
  // tiene. Intl mete un espacio duro entre el signo y el numero.
  formateador.format(Number.isFinite(valor) ? valor : 0).replace(/\s/g, "");
