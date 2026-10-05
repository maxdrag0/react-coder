// Las tres formas en que se compra pirotecnia.
export const UNIDADES = [
  { clave: "unitario", etiqueta: "Unidad", campo: "precioUnitario" },
  { clave: "display", etiqueta: "Display", campo: "precioDisplay" },
  { clave: "bulto", etiqueta: "Bulto", campo: "precioBulto" },
];

const esPrecio = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;

export const precioDe = (item, clave) => {
  const campo = UNIDADES.find((u) => u.clave === clave)?.campo;
  if (esPrecio(item?.[campo])) return item[campo];
  // El esquema viejo usa `price` para el unitario. La guarda importa: el
  // panel escribe Number("") === 0 cuando el campo queda vacío.
  if (clave === "unitario" && esPrecio(item?.price)) return item.price;
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

/**
 * Los niveles que son de verdad una forma distinta de comprar.
 *
 * En el catálogo, 178 de 323 productos tienen `precioDisplay` igual al
 * unitario y 48 tienen `precioBulto` igual: son valores por defecto, no
 * unidades reales. Ofrecerlos duplicaba la fila de precio en la card y
 * mostraba dos opciones idénticas en el selector — y quien elegía "Display"
 * pagaba una unidad mientras el pedido decía Display, así que el dueño
 * despachaba un display.
 */
export const unidadesDisponibles = (item) => {
  const unitario = precioDe(item, "unitario");

  return UNIDADES.filter((u) => {
    const precio = precioDe(item, u.clave);
    if (precio === null) return false;
    if (u.clave === "unitario") return true;
    return unitario === null || precio !== unitario;
  });
};
