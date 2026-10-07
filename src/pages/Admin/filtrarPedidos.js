import { ESTADOS_PEDIDO, estadoDePedido, estaAbierto } from "@/constants/estadoPedido";

/*
  Filtro de la pestana de pedidos. Vive aparte del componente porque es la
  unica logica real de esa pantalla y asi se puede probar sin renderizar.

  "abiertos" no es un estado de la base: es el atajo que el dueno va a usar
  casi siempre, que es "que me falta hacer".
*/

export const ABIERTOS = "abiertos";
export const TODOS = "todos";

const textoDe = (pedido) =>
  [
    pedido.id,
    pedido.buyer?.name,
    pedido.buyer?.email,
    pedido.buyer?.telefono,
    pedido.nota,
    // Tambien los productos: alguien llama diciendo "pedi una torta" y no
    // el numero de orden.
    ...(pedido.items ?? []).map((i) => i.nombre || i.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const coincideEstado = (pedido, estado) => {
  if (!estado || estado === TODOS) return true;
  if (estado === ABIERTOS) return estaAbierto(pedido);
  return estadoDePedido(pedido) === estado;
};

export const filtrarPedidos = (pedidos, { estado, texto } = {}) => {
  const q = (texto ?? "").trim().toLowerCase();

  return pedidos.filter((pedido) => {
    if (!coincideEstado(pedido, estado)) return false;
    if (!q) return true;
    return textoDe(pedido).includes(q);
  });
};

/** Cuántos hay en cada estado, para mostrarlo en los chips del filtro. */
export const contarPorEstado = (pedidos) => {
  const cuenta = { [TODOS]: pedidos.length, [ABIERTOS]: 0 };
  for (const e of ESTADOS_PEDIDO) cuenta[e.clave] = 0;

  for (const pedido of pedidos) {
    cuenta[estadoDePedido(pedido)]++;
    if (estaAbierto(pedido)) cuenta[ABIERTOS]++;
  }

  return cuenta;
};
