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
