import { UNIDADES } from "../../src/constants/unidades.js";

/*
  Valida la FORMA del cuerpo del POST, antes de tocar la base.

  Nada se convierte: una cantidad que llega como "2" se rechaza en vez de
  volverse 2. Este es el borde de confianza, y una coercion silenciosa aca es
  una puerta abierta mas abajo.
*/

const CLAVES = new Set(UNIDADES.map((u) => u.clave));
const MAX_ITEMS = 50;
const MAX_CANTIDAD = 999;

const esTexto = (v, max) =>
  typeof v === "string" && v.trim() !== "" && v.length <= max;

const esEntero = (v, min, max) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

const esNumero = (v, min) =>
  typeof v === "number" && Number.isFinite(v) && v >= min;

export const validarCuerpo = (cuerpo) => {
  const mal = (error) => ({ ok: false, error });

  if (!cuerpo || typeof cuerpo !== "object")
    return mal("El cuerpo no es un objeto.");

  if (!esTexto(cuerpo.idempotencia, 64)) {
    return mal("Falta el identificador del intento de compra.");
  }

  if (!Array.isArray(cuerpo.items))
    return mal("`items` tiene que ser una lista.");
  if (cuerpo.items.length === 0) return mal("El carrito esta vacio.");
  if (cuerpo.items.length > MAX_ITEMS) {
    return mal(`El carrito no puede tener mas de ${MAX_ITEMS} renglones.`);
  }

  const items = [];
  const vistos = new Set();

  for (const [i, it] of cuerpo.items.entries()) {
    const donde = `Renglon ${i + 1}`;

    if (!it || typeof it !== "object") return mal(`${donde}: no es un objeto.`);
    if (!esTexto(it.codigo, 100)) return mal(`${donde}: codigo invalido.`);
    if (!CLAVES.has(it.unidad)) return mal(`${donde}: unidad invalida.`);
    if (!esEntero(it.cantidad, 1, MAX_CANTIDAD)) {
      return mal(
        `${donde}: la cantidad tiene que ser un entero de 1 a ${MAX_CANTIDAD}.`,
      );
    }
    if (!esNumero(it.precioVisto, 0)) {
      return mal(`${donde}: el precio visto tiene que ser un numero.`);
    }

    const modelo =
      it.modelo === undefined || it.modelo === null ? null : it.modelo;
    if (modelo !== null && !esTexto(modelo, 100)) {
      return mal(`${donde}: modelo invalido.`);
    }

    /*
      El carrito del cliente nunca genera dos renglones con la misma clave:
      los suma. Que lleguen dos es senal de manipulacion o de un bug, y
      sumarlos dos veces seria peor que rechazar el pedido.
    */
    const clave = `${it.codigo}__${modelo ?? ""}__${it.unidad}`;
    if (vistos.has(clave)) return mal(`${donde}: renglon repetido.`);
    vistos.add(clave);

    items.push({
      codigo: it.codigo,
      unidad: it.unidad,
      modelo,
      cantidad: it.cantidad,
      precioVisto: it.precioVisto,
    });
  }

  const telefono =
    typeof cuerpo.telefono === "string" ? cuerpo.telefono : undefined;

  return {
    ok: true,
    datos: { idempotencia: cuerpo.idempotencia, items, telefono },
  };
};
