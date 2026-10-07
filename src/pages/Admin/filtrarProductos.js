import { ESTADOS, estadoDe } from "@/constants/estadoProducto";
import { precioMinimo } from "@/constants/unidades";
import { SIN_MARCA } from "@/constants/marcas";

/*
  Filtro de la lista de productos del panel. Aparte del componente porque es
  la unica logica real de esa pantalla y asi se prueba sin renderizar.

  Dos diferencias a proposito con el filtro de la tienda:

  - Los ocultos SE VEN. La tienda los esconde; el panel es donde se los
    vuelve a activar, asi que esconderlos ahi los volveria inalcanzables.
  - Un producto sin precio SE EXCLUYE cuando hay un limite de precio puesto.
    En la tienda no se esconde, porque ahi el filtro de precio es una ayuda
    para mirar; aca el dueno esta consultando por precio y algo sin precio no
    es una respuesta.
*/

export const TODOS = "todos";

export const FILTROS_VACIOS = {
  texto: "",
  estado: TODOS,
  categoria: "",
  marca: "",
  precioMin: "",
  precioMax: "",
  sinFoto: false,
};

const categoriaDe = (p) => p.categoria || p.category || "";
const marcaDe = (p) => p.marca || SIN_MARCA;
const nombreDe = (p) => p.nombre || p.name || "";
const tieneFoto = (p) => Boolean(p.fotoUrl || p.image);

const numero = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const filtrarProductos = (productos, filtros = FILTROS_VACIOS) => {
  const q = (filtros.texto ?? "").trim().toLowerCase();
  const min = numero(filtros.precioMin);
  const max = numero(filtros.precioMax);

  return productos.filter((p) => {
    if (filtros.estado && filtros.estado !== TODOS && estadoDe(p) !== filtros.estado) {
      return false;
    }

    if (filtros.categoria && categoriaDe(p) !== filtros.categoria) return false;
    if (filtros.marca && marcaDe(p) !== filtros.marca) return false;
    if (filtros.sinFoto && tieneFoto(p)) return false;

    if (min !== null || max !== null) {
      // El piso del rango: un producto con modelos no tiene precio propio.
      const precio = precioMinimo(p);
      if (precio === null) return false;
      if (min !== null && precio < min) return false;
      if (max !== null && precio > max) return false;
    }

    if (q) {
      const texto = `${p.codigo ?? ""} ${nombreDe(p)}`.toLowerCase();
      if (!texto.includes(q)) return false;
    }

    return true;
  });
};

export const contarEstadosProducto = (productos) => {
  const cuenta = { [TODOS]: productos.length };
  for (const e of ESTADOS) cuenta[e.clave] = 0;
  for (const p of productos) cuenta[estadoDe(p)]++;
  return cuenta;
};

/*
  Las listas de los selectores salen del catalogo y no de las constantes:
  ofrecer las 16 categorias cuando se usan 9 son 7 opciones que no devuelven
  nada.
*/
export const categoriasPresentes = (productos) =>
  [...new Set(productos.map(categoriaDe).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

export const marcasPresentes = (productos) =>
  [...new Set(productos.map(marcaDe))].sort((a, b) =>
    // "Sin marca" al final: es un cajon, no una marca.
    a === SIN_MARCA ? 1 : b === SIN_MARCA ? -1 : a.localeCompare(b)
  );

export const hayFiltros = (filtros) =>
  Boolean(
    filtros.texto ||
      (filtros.estado && filtros.estado !== TODOS) ||
      filtros.categoria ||
      filtros.marca ||
      filtros.precioMin !== "" ||
      filtros.precioMax !== "" ||
      filtros.sinFoto
  );
