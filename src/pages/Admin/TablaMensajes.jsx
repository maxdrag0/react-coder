import { useState } from "react";
import { CheckCircle, Circle, Trash2 } from "lucide-react";

/**
 * Una fila con estado propio porque la nota se escribe acá y se guarda al
 * salir del campo.
 */
const FilaMensaje = ({ mensaje, onAlternarLeido, onNota, onEliminar }) => {
  const [nota, setNota] = useState(mensaje.nota ?? "");

  const guardarNota = () => {
    if ((mensaje.nota ?? "") !== nota) onNota(mensaje.id, nota);
  };

  return (
    <tr className={mensaje.leido ? "" : "msg-unread"}>
      <td data-etiqueta="Estado">
        <button
          type="button"
          className={`msg-action-btn ${mensaje.leido ? "msg-leido" : "msg-pendiente"}`}
          onClick={() => onAlternarLeido(mensaje.id, mensaje.leido)}
          title={mensaje.leido ? "Marcar como no leído" : "Marcar como leído"}
        >
          {mensaje.leido ? <CheckCircle size={20} /> : <Circle size={20} />}
        </button>
      </td>

      <td data-etiqueta="Fecha">{new Date(mensaje.date).toLocaleString("es-AR")}</td>

      <td data-etiqueta="Contacto">
        <div className="admin-cliente">
          <strong>{mensaje.nombre}</strong>
          <span>{mensaje.email}</span>
          {(mensaje.direccion || mensaje.ciudad) && (
            <span>{[mensaje.direccion, mensaje.ciudad].filter(Boolean).join(", ")}</span>
          )}
        </div>
      </td>

      <td data-etiqueta="Mensaje" className="admin-celda-mensaje">
        {mensaje.mensaje}
      </td>

      <td data-etiqueta="Nota">
        <textarea
          className="admin-nota"
          rows={2}
          placeholder="Le respondí por mail..."
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={guardarNota}
          aria-label={`Nota del mensaje de ${mensaje.nombre}`}
        />
      </td>

      <td>
        <button
          type="button"
          className="msg-action-btn msg-borrar"
          onClick={() => onEliminar(mensaje.id)}
          title="Eliminar mensaje"
        >
          <Trash2 size={20} />
        </button>
      </td>
    </tr>
  );
};

/**
 * Los colores de los iconos iban en estilos inline que apuntaban a
 * --success-color, --text-secondary y --danger-color: tres tokens que no
 * existen en el sistema visual, así que los iconos quedaban sin color.
 * Ahora son clases.
 */
const TablaMensajes = ({ mensajes, onAlternarLeido, onNota, onEliminar }) => (
  <table className="admin-table">
    <thead>
      <tr>
        <th>Estado</th>
        <th>Fecha</th>
        <th>Contacto</th>
        <th>Mensaje</th>
        <th>Nota</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      {mensajes.map((mensaje) => (
        <FilaMensaje
          key={mensaje.id}
          mensaje={mensaje}
          onAlternarLeido={onAlternarLeido}
          onNota={onNota}
          onEliminar={onEliminar}
        />
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
