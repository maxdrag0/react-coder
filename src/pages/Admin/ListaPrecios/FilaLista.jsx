import { CATEGORIES } from "../../../constants/categories";
import { variacion } from "../../../constants/cruzarLista";
import { formatearPrecio } from "../../../utils/formatearPrecio";

/*
  Una fila de la lista del proveedor.

  Los tres precios de la derecha son botones: lo que esta prendido es lo que
  se va a subir. El cartel de accion dice que le va a pasar al producto, y no
  se elige aparte: pedir la accion Y las presentaciones son dos formas de
  decir lo mismo, y se desincronizan.
*/

const RUBROS = Object.values(CATEGORIES);

const ETIQUETAS = { unidad: "Unidad", display: "Display", bulto: "Bulto" };
const CLAVE_WEB = { unidad: "unitario", display: "display", bulto: "bulto" };

const precioDe = (fila, tipo) =>
  tipo === "unidad"
    ? fila.pUnidad
    : tipo === "display"
      ? fila.pDisplay
      : fila.pBulto;

const cuantas = (fila, tipo) =>
  tipo === "unidad" ? 1 : tipo === "display" ? fila.porDisplay : fila.porBulto;

function Precio({ fila, tipo, puesto, onClick }) {
  const precio = precioDe(fila, tipo);

  if (!precio) {
    return (
      <button type="button" className="lp-precio" disabled>
        <span className="lp-precio-rotulo">{ETIQUETAS[tipo]}</span>
        <span className="lp-precio-monto">—</span>
        <span className="lp-precio-cant">sin precio</span>
      </button>
    );
  }

  const unidades = cuantas(fila, tipo);

  return (
    <button
      type="button"
      className="lp-precio"
      aria-pressed={puesto}
      onClick={onClick}
    >
      <span className="lp-precio-rotulo">{ETIQUETAS[tipo]}</span>
      <span className="lp-precio-monto">{formatearPrecio(precio)}</span>
      <span className="lp-precio-cant">
        {unidades ? `${unidades} un.` : "cantidad desconocida"}
      </span>
    </button>
  );
}

function EnLaWeb({ fila }) {
  if (!fila.web) return null;

  const partes = [];
  for (const tipo of ["unidad", "display", "bulto"]) {
    const vive = fila.web.vende[CLAVE_WEB[tipo]];
    if (!vive) continue;
    const nuevo = precioDe(fila, tipo);
    const pct = variacion(vive.precio, nuevo);
    partes.push(
      <span key={tipo} className="lp-delta">
        {ETIQUETAS[tipo].toLowerCase()}: {formatearPrecio(vive.precio)} →{" "}
        {nuevo ? (
          <>
            {formatearPrecio(nuevo)} <b>{pct > 0 ? `+${pct}%` : `${pct}%`}</b>
          </>
        ) : (
          <b>la lista no lo cotiza</b>
        )}
      </span>,
    );
  }

  return (
    <div className="lp-web">
      <span className="lp-web-rotulo">En la web</span>
      <span className="lp-web-nombre">{fila.web.nombre}</span>
      {partes}
      <span className="lp-web-lista" title="Como lo nombra la lista">
        en la lista: {fila.nombre}
      </span>
    </div>
  );
}

function FilaLista({
  fila,
  elegido,
  accion,
  onAlternar,
  onAlternarFila,
  onBorrar,
  onEditar,
}) {
  const disponibles = ["unidad", "display", "bulto"].filter((t) =>
    precioDe(fila, t),
  );
  const puestas = disponibles.filter((t) => elegido[t]).length;

  // Una diferencia muy grande con el precio publicado casi siempre es un
  // error de carga, no un aumento.
  const vUnidad = fila.web?.vende?.unitario
    ? variacion(fila.web.vende.unitario.precio, fila.pUnidad)
    : null;
  const saltoGrande = vUnidad !== null && Math.abs(vUnidad) >= 40;
  const atencion = fila.avisos.length > 0 || saltoGrande;

  return (
    <article
      className="lp-fila"
      data-elegida={puestas > 0 ? "si" : "no"}
      data-atencion={atencion ? "si" : "no"}
    >
      <div className="lp-check">
        <input
          type="checkbox"
          checked={puestas > 0}
          ref={(el) => {
            if (el)
              el.indeterminate = puestas > 0 && puestas < disponibles.length;
          }}
          onChange={(e) => onAlternarFila(fila, e.target.checked)}
          aria-label={`Subir ${elegido.nombre || elegido.codigo}`}
        />
      </div>

      <input
        className="lp-campo lp-campo-codigo"
        value={elegido.codigo}
        onChange={(e) => onEditar(fila.id, "codigo", e.target.value)}
        aria-label="Código"
      />

      <input
        className="lp-campo lp-campo-nombre"
        value={elegido.nombre}
        placeholder="Escribí el nombre"
        onChange={(e) => onEditar(fila.id, "nombre", e.target.value)}
        aria-label="Nombre"
      />

      <div className="lp-meta">
        <span className={`lp-accion lp-accion-${accion}`}>
          {accion === "renombrar" ? "cambia el código" : accion}
        </span>

        <input
          className="lp-campo lp-campo-marca"
          value={elegido.marca}
          placeholder="Sin marca"
          onChange={(e) => onEditar(fila.id, "marca", e.target.value)}
          aria-label="Marca"
        />

        <select
          className="lp-campo"
          value={elegido.categoria ?? ""}
          onChange={(e) => onEditar(fila.id, "categoria", e.target.value)}
          aria-label="Categoría"
        >
          {RUBROS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {fila.subcategoria && (
          <span className="lp-dato">{fila.subcategoria}</span>
        )}
        {fila.duracion && <span className="lp-dato">{fila.duracion}s</span>}

        {fila.repetido && (
          <span
            className="lp-sello lp-sello-repe"
            title={`La lista trae el código ${fila.codigo} ${fila.repetido} veces. Es un solo producto en la tienda: si subís los dos, el segundo pisa al primero.`}
          >
            código {fila.codigo} ×{fila.repetido}
          </span>
        )}

        {/* Esta fila arrancó apagada porque otra con el mismo código coincide
            mejor con lo que ya vende el producto. */}
        {fila.duplicada && (
          <span className="lp-dato lp-dato-gemela">
            apagada: gana la otra fila con este código
          </span>
        )}

        {saltoGrande && (
          <span className="lp-sello lp-sello-aviso">
            diferencia de {vUnidad > 0 ? `+${vUnidad}` : vUnidad}%: revisalo
          </span>
        )}

        {fila.avisos.map((aviso) => (
          <span key={aviso} className="lp-sello lp-sello-aviso">
            {aviso}
          </span>
        ))}

        {fila.web && (
          <button
            type="button"
            className="lp-borrar"
            aria-pressed={elegido.borrar}
            onClick={() => onBorrar(fila.id)}
          >
            borrar de la web
          </button>
        )}
      </div>

      <EnLaWeb fila={fila} />

      <div className="lp-precios">
        {["unidad", "display", "bulto"].map((tipo) => (
          <Precio
            key={tipo}
            fila={fila}
            tipo={tipo}
            puesto={Boolean(elegido[tipo])}
            onClick={() => onAlternar(fila.id, tipo)}
          />
        ))}
      </div>
    </article>
  );
}

export default FilaLista;
