// Las tres formas en que se compra pirotecnia. El multiplicador es
// informativo: se calcula desde los precios reales del producto cuando se
// puede, porque no todos los productos usan la misma relación.
export const UNIDADES = [
  { clave: "unitario", etiqueta: "Unidad", campo: "precioUnitario" },
  { clave: "display", etiqueta: "Display", campo: "precioDisplay" },
  { clave: "bulto", etiqueta: "Bulto", campo: "precioBulto" },
];

export const precioDe = (item, clave) => {
  const campo = UNIDADES.find((u) => u.clave === clave)?.campo;
  const valor = item?.[campo];
  if (typeof valor === "number" && valor > 0) return valor;
  // El esquema viejo usa `price` para el unitario.
  if (clave === "unitario" && typeof item?.price === "number") return item.price;
  return null;
};

// Cuántas unidades entran en un display o un bulto, deducido de los precios.
export const multiplicadorDe = (item, clave) => {
  if (clave === "unitario") return null;
  const unitario = precioDe(item, "unitario");
  const precio = precioDe(item, clave);
  if (!unitario || !precio) return null;
  const n = Math.round(precio / unitario);
  return n > 1 ? n : null;
};

export const unidadesDisponibles = (item) =>
  UNIDADES.filter((u) => precioDe(item, u.clave) !== null);
