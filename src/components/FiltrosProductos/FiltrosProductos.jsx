import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES } from "@/constants/categories";
import { formatearPrecio } from "@/utils/formatearPrecio";
import { SIN_MARCA } from "@/constants/marcas";
import "./FiltrosProductos.css";

const CATEGORIAS = Object.values(CATEGORIES).sort((a, b) => a.localeCompare(b));

const porcentaje = (valor, min, max) =>
  max > min ? `${((valor - min) / (max - min)) * 100}%` : "100%";

/**
 * Panel de filtros. En escritorio es una columna a la izquierda; en celular
 * se abre desde un botón y ocupa la pantalla, que es lo que se espera en un
 * teléfono y evita comerle la mitad del alto al listado.
 */
const FiltrosProductos = ({
  categoria,
  onCategoria,
  marcas,
  marcasElegidas,
  onMarca,
  conteoMarcas = {},
  precioMin,
  precioMax,
  rango,
  onRango,
  cantidad,
  onLimpiar,
}) => {
  const [abierto, setAbierto] = useState(false);

  const hayFiltros =
    Boolean(categoria) || marcasElegidas.length > 0 || rango[1] < precioMax;

  return (
    <>
      <button
        type="button"
        className="boton boton-secundario filtros-abrir"
        onClick={() => setAbierto(true)}
        aria-expanded={abierto}
      >
        <SlidersHorizontal size={18} />
        Filtros
        {hayFiltros && <span className="filtros-punto" aria-label="con filtros activos" />}
      </button>

      <div className={`filtros ${abierto ? "filtros-abiertos" : ""}`}>
        <div className="filtros-cabecera">
          <h2>Filtros</h2>
          <button
            type="button"
            className="boton boton-fantasma filtros-cerrar"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar filtros"
          >
            <X size={20} />
          </button>
        </div>

        <fieldset className="filtro-grupo">
          <legend>Categoría</legend>
          <ul className="filtro-lista">
            <li>
              <button
                type="button"
                className={`filtro-opcion ${!categoria ? "activa" : ""}`}
                onClick={() => onCategoria(null)}
                aria-pressed={!categoria}
              >
                Todas
              </button>
            </li>
            {CATEGORIAS.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  className={`filtro-opcion ${categoria === c ? "activa" : ""}`}
                  onClick={() => onCategoria(c)}
                  aria-pressed={categoria === c}
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
        </fieldset>

        {marcas.length > 0 && (
          <fieldset className="filtro-grupo">
            <legend>Marca</legend>
            <ul className="filtro-lista">
              {marcas.map((m) => {
                // El conteo ignora el filtro de marca: cada casilla dice
                // cuántos productos suma si la tildás. En cero se apaga en
                // vez de desaparecer, para no mover la lista al escribir.
                const cuenta = conteoMarcas[m] ?? 0;
                return (
                  <li key={m}>
                    <label
                      className={`filtro-check ${cuenta === 0 ? "filtro-check-vacia" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={marcasElegidas.includes(m)}
                        onChange={() => onMarca(m)}
                      />
                      <span className="filtro-check-texto">
                        {m === SIN_MARCA ? <em>{m}</em> : m}
                      </span>
                      <span className="filtro-cuenta">{cuenta}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}

        <fieldset className="filtro-grupo">
          <legend>Precio</legend>
          <label className="solo-lectores" htmlFor="filtro-precio">
            Precio máximo por unidad
          </label>
          <input
            id="filtro-precio"
            className="filtro-precio"
            type="range"
            min={precioMin}
            max={precioMax}
            step={Math.max(1, Math.round((precioMax - precioMin) / 100))}
            value={rango[1]}
            onChange={(e) => onRango([precioMin, Number(e.target.value)])}
            aria-valuetext={formatearPrecio(rango[1]) ?? "$0"}
            style={{ "--relleno": porcentaje(rango[1], precioMin, precioMax) }}
          />
          <p className="filtro-rango">
            Hasta <strong>{formatearPrecio(rango[1]) ?? "$0"}</strong> por unidad
          </p>
        </fieldset>

        <div className="filtros-pie">
          {hayFiltros && (
            <button type="button" className="boton boton-fantasma" onClick={onLimpiar}>
              Limpiar filtros
            </button>
          )}
          <button
            type="button"
            className="boton boton-primario filtros-ver"
            onClick={() => setAbierto(false)}
          >
            Ver {cantidad} {cantidad === 1 ? "producto" : "productos"}
          </button>
        </div>
      </div>

      {abierto && (
        <div className="filtros-fondo" onClick={() => setAbierto(false)} aria-hidden="true" />
      )}
    </>
  );
};

export default FiltrosProductos;
