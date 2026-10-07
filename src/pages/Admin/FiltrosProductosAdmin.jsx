import { Search, X, ImageOff } from "lucide-react";
import { ESTADOS } from "@/constants/estadoProducto";
import { TODOS, hayFiltros } from "./filtrarProductos";

const CHIPS = [{ clave: TODOS, etiqueta: "Todos" }, ...ESTADOS];

/**
 * Filtros de la lista de productos del panel.
 *
 * Las listas de categoría y marca salen del catálogo y no de las constantes:
 * ofrecer las 16 categorías cuando se usan 9 son 7 opciones que no devuelven
 * nada.
 */
const FiltrosProductosAdmin = ({
  filtros,
  onFiltro,
  onLimpiar,
  cuenta,
  categorias,
  marcas,
  visibles,
}) => {
  const cambiar = (campo) => (e) => onFiltro(campo, e.target.value);

  return (
    <div className="prodfiltros">
      <div className="prodfiltros-chips" role="group" aria-label="Filtrar por estado">
        {CHIPS.map((c) => (
          <button
            key={c.clave}
            type="button"
            className={`pedidos-chip ${filtros.estado === c.clave ? "activo" : ""}`}
            onClick={() => onFiltro("estado", c.clave)}
            aria-pressed={filtros.estado === c.clave}
          >
            {c.etiqueta}
            <span className="pedidos-chip-cuenta">{cuenta[c.clave] ?? 0}</span>
          </button>
        ))}

        {/* 323 productos no tienen foto: es la tarea de contenido más grande
            que queda, y este botón es cómo se recorre. */}
        <button
          type="button"
          className={`pedidos-chip ${filtros.sinFoto ? "activo" : ""}`}
          onClick={() => onFiltro("sinFoto", !filtros.sinFoto)}
          aria-pressed={filtros.sinFoto}
        >
          <ImageOff size={14} />
          Sin foto
        </button>
      </div>

      <div className="prodfiltros-campos">
        <div className="pedidos-buscador">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Nombre o código"
            aria-label="Buscar productos en el panel"
            value={filtros.texto}
            onChange={cambiar("texto")}
          />
        </div>

        <select
          className="prodfiltros-select"
          aria-label="Filtrar por categoría"
          value={filtros.categoria}
          onChange={cambiar("categoria")}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="prodfiltros-select"
          aria-label="Filtrar por marca"
          value={filtros.marca}
          onChange={cambiar("marca")}
        >
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <div className="prodfiltros-precio">
          <input
            type="number"
            min="0"
            placeholder="Precio desde"
            aria-label="Precio por unidad desde"
            value={filtros.precioMin}
            onChange={cambiar("precioMin")}
          />
          <input
            type="number"
            min="0"
            placeholder="hasta"
            aria-label="Precio por unidad hasta"
            value={filtros.precioMax}
            onChange={cambiar("precioMax")}
          />
        </div>

        {hayFiltros(filtros) && (
          <button
            type="button"
            className="boton boton-fantasma prodfiltros-limpiar"
            onClick={onLimpiar}
          >
            <X size={16} />
            Limpiar
          </button>
        )}
      </div>

      <p className="pedidos-cuenta">
        {visibles} {visibles === 1 ? "producto" : "productos"}
      </p>
    </div>
  );
};

export default FiltrosProductosAdmin;
