import { formatearPrecio } from "@/utils/formatearPrecio";
import "./Reconciliar.css";

/*
  Lo que ve el cliente cuando el servidor rechaza el carrito.

  Es el único momento en que la tienda le dice que lo que vio ya no vale, así
  que cada problema se explica en sus términos y no con un código de error.

  Los cuatro tipos tienen texto propio: uno sin texto mostraría un renglón
  vacío, que se lee como una falla de la tienda y no como una explicación.
*/
const TEXTOS = {
  precio_cambio: (p) => (
    <>
      pasó de <s>{formatearPrecio(p.antes)}</s> a{" "}
      <strong>{formatearPrecio(p.ahora)}</strong>
    </>
  ),
  no_disponible: () => <>ya no está disponible y lo sacamos del pedido</>,
  sin_presentacion: () => (
    <>ya no se vende en esa presentación y lo sacamos del pedido</>
  ),
  inexistente: () => <>ya no está en el catálogo y lo sacamos del pedido</>,
};

const Reconciliar = ({ problemas, onConfirmar, onCancelar }) => (
  <section className="reconciliar" role="alert">
    <h2>Cambió algo de tu pedido</h2>
    <p className="reconciliar-bajada">
      Revisá los cambios antes de enviarlo. Nada se envió todavía.
    </p>

    <ul className="reconciliar-lista">
      {problemas.map((p) => (
        <li key={`${p.codigo}-${p.tipo}`} className="reconciliar-item">
          <strong>{p.nombre || p.codigo}</strong>{" "}
          {(TEXTOS[p.tipo] ?? TEXTOS.inexistente)(p)}
        </li>
      ))}
    </ul>

    <div className="reconciliar-botones">
      <button type="button" className="boton boton-secundario" onClick={onCancelar}>
        Revisar el carrito
      </button>
      <button type="button" className="boton boton-primario" onClick={onConfirmar}>
        Seguir y enviar
      </button>
    </div>
  </section>
);

export default Reconciliar;
