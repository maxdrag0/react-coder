import { formatearPrecio } from "../../utils/formatearPrecio";

const renglonDe = (item) => {
  const nombre = item.nombre || item.name || "";
  const unidad = item.unidad && item.unidad !== "unitario" ? ` (${item.unidad})` : "";
  return `${item.cantidad}x ${nombre}${unidad}`;
};

const TablaPedidos = ({ pedidos }) => (
  <table className="admin-table">
    <thead>
      <tr>
        <th>N° de orden</th>
        <th>Fecha</th>
        <th>Usuario</th>
        <th>Email</th>
        <th>Total</th>
        <th>Items</th>
      </tr>
    </thead>
    <tbody>
      {pedidos.map((pedido) => (
        <tr key={pedido.id}>
          <td data-etiqueta="N° de orden">{pedido.id}</td>
          <td data-etiqueta="Fecha">{new Date(pedido.date).toLocaleString("es-AR")}</td>
          <td data-etiqueta="Usuario">{pedido.buyer?.name || "—"}</td>
          <td data-etiqueta="Email">{pedido.buyer?.email || "—"}</td>
          <td data-etiqueta="Total">{formatearPrecio(pedido.total) ?? "—"}</td>
          <td>
            <ul className="admin-items-pedido">
              {pedido.items?.map((item, i) => (
                <li key={i}>{renglonDe(item)}</li>
              ))}
            </ul>
          </td>
        </tr>
      ))}
      {pedidos.length === 0 && (
        <tr>
          <td colSpan="6" className="empty-state">
            No hay pedidos registrados.
          </td>
        </tr>
      )}
    </tbody>
  </table>
);

export default TablaPedidos;
