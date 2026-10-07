import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { formatearPrecio } from "../../utils/formatearPrecio";
import { paraWhatsapp } from "../../utils/telefono";
import { ESTADOS_PEDIDO, estadoDePedido } from "../../constants/estadoPedido";

const renglonDe = (item) => {
  const nombre = item.nombre || item.name || "";
  const unidad = item.unidad && item.unidad !== "unitario" ? ` (${item.unidad})` : "";
  return `${item.cantidad}x ${nombre}${unidad}`;
};

/**
 * Una fila con estado propio porque la nota se escribe acá y se guarda al
 * salir del campo: un botón de guardar por fila sería un botón por pedido.
 */
const FilaPedido = ({ pedido, onEstado, onNota }) => {
  const [nota, setNota] = useState(pedido.nota ?? "");
  const estado = estadoDePedido(pedido);
  const telefono = pedido.buyer?.telefono;
  const whatsapp = paraWhatsapp(telefono);

  // Solo escribe si cambió: salir del campo sin tocarlo no tiene que
  // generar una escritura en Firestore.
  const guardarNota = () => {
    if ((pedido.nota ?? "") !== nota) onNota(pedido.id, nota);
  };

  return (
    <tr className={`admin-pedido-${estado}`}>
      <td data-etiqueta="N° de orden">
        <code className="admin-orden-id">{pedido.id}</code>
      </td>

      <td data-etiqueta="Fecha">{new Date(pedido.date).toLocaleString("es-AR")}</td>

      <td data-etiqueta="Cliente">
        <div className="admin-cliente">
          <strong>{pedido.buyer?.name || "—"}</strong>
          <span>{pedido.buyer?.email || "—"}</span>
          {telefono ? (
            whatsapp ? (
              <a
                className="admin-whatsapp"
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={14} />
                {telefono}
              </a>
            ) : (
              <span>{telefono}</span>
            )
          ) : (
            // Los pedidos hechos antes de que el teléfono fuera obligatorio
            // no lo tienen, y por eso no se pueden atender.
            <em className="admin-sin-telefono">sin teléfono</em>
          )}
        </div>
      </td>

      <td data-etiqueta="Total">{formatearPrecio(pedido.total) ?? "—"}</td>

      <td data-etiqueta="Items">
        <ul className="admin-items-pedido">
          {pedido.items?.map((item, i) => (
            <li key={i}>{renglonDe(item)}</li>
          ))}
        </ul>
      </td>

      <td data-etiqueta="Estado">
        <select
          className="admin-estado-select"
          value={estado}
          onChange={(e) => onEstado(pedido.id, e.target.value)}
          aria-label={`Estado del pedido ${pedido.id}`}
        >
          {ESTADOS_PEDIDO.map((e) => (
            <option key={e.clave} value={e.clave}>
              {e.etiqueta}
            </option>
          ))}
        </select>
      </td>

      <td data-etiqueta="Nota">
        <textarea
          className="admin-nota"
          rows={2}
          placeholder="Llamar después de las 18..."
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={guardarNota}
          aria-label={`Nota del pedido ${pedido.id}`}
        />
      </td>
    </tr>
  );
};

const TablaPedidos = ({ pedidos, onEstado, onNota }) => (
  <table className="admin-table">
    <thead>
      <tr>
        <th>N° de orden</th>
        <th>Fecha</th>
        <th>Cliente</th>
        <th>Total</th>
        <th>Items</th>
        <th>Estado</th>
        <th>Nota</th>
      </tr>
    </thead>
    <tbody>
      {pedidos.map((pedido) => (
        <FilaPedido
          key={pedido.id}
          pedido={pedido}
          onEstado={onEstado}
          onNota={onNota}
        />
      ))}
      {pedidos.length === 0 && (
        <tr>
          <td colSpan="7" className="empty-state">
            No hay pedidos registrados.
          </td>
        </tr>
      )}
    </tbody>
  </table>
);

export default TablaPedidos;
