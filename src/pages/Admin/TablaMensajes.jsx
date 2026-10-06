import { CheckCircle, Circle, Trash2 } from "lucide-react";

/**
 * Los colores de los iconos iban en estilos inline que apuntaban a
 * --success-color, --text-secondary y --danger-color: tres tokens que no
 * existen en el sistema visual, así que los iconos quedaban sin color.
 * Ahora son clases.
 */
const TablaMensajes = ({ mensajes, onAlternarLeido, onEliminar }) => (
  <table className="admin-table">
    <thead>
      <tr>
        <th>Estado</th>
        <th>Fecha</th>
        <th>Nombre</th>
        <th>Email</th>
        <th>Mensaje</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      {mensajes.map((msg) => (
        <tr key={msg.id} className={msg.leido ? "" : "msg-unread"}>
          <td data-etiqueta="Estado">
            <button
              type="button"
              className={`msg-action-btn ${msg.leido ? "msg-leido" : "msg-pendiente"}`}
              onClick={() => onAlternarLeido(msg.id, msg.leido)}
              title={msg.leido ? "Marcar como no leído" : "Marcar como leído"}
            >
              {msg.leido ? <CheckCircle size={20} /> : <Circle size={20} />}
            </button>
          </td>
          <td data-etiqueta="Fecha">{new Date(msg.date).toLocaleString("es-AR")}</td>
          <td data-etiqueta="Nombre">{msg.nombre}</td>
          <td data-etiqueta="Email">{msg.email}</td>
          <td data-etiqueta="Mensaje" className="admin-celda-mensaje">
            {msg.mensaje}
          </td>
          <td>
            <button
              type="button"
              className="msg-action-btn msg-borrar"
              onClick={() => onEliminar(msg.id)}
              title="Eliminar mensaje"
            >
              <Trash2 size={20} />
            </button>
          </td>
        </tr>
      ))}
      {mensajes.length === 0 && (
        <tr>
          <td colSpan="6" className="empty-state">
            No hay mensajes registrados.
          </td>
        </tr>
      )}
    </tbody>
  </table>
);

export default TablaMensajes;
