import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PuffLoader } from "react-spinners";
import { useAuth } from "@/contexts/AuthContext";
import { obtenerComprasDeUsuario } from "@/services/firebase/comprasFirebase";
import { estadoDePedido, etiquetaDePedido } from "@/constants/estadoPedido";
import { formatearPrecio } from "@/utils/formatearPrecio";
import "./MisPedidos.css";

const renglonDe = (item) => {
  const nombre = item.nombre || item.name || "";
  const extras = [
    item.modeloEtiqueta,
    item.unidad && item.unidad !== "unitario" ? item.unidad : null,
  ].filter(Boolean);

  return `${item.cantidad}x ${nombre}${extras.length ? ` (${extras.join(", ")})` : ""}`;
};

/**
 * Los pedidos del comprador, con su estado.
 *
 * Vive en el perfil y no en el menú principal: son cinco lugares y están
 * ocupados, y "mis pedidos" es algo de la cuenta. Contacto se queda en el
 * menú porque es justo lo que necesita quien NO tiene cuenta.
 */
const MisPedidos = () => {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;

    obtenerComprasDeUsuario(user?.uid).then((p) => {
      // Si el componente se desmontó mientras cargaba, no se toca el estado.
      if (vigente) {
        setPedidos(p);
        setCargando(false);
      }
    });

    return () => {
      vigente = false;
    };
  }, [user?.uid]);

  if (cargando) {
    return (
      <section className="mis-pedidos">
        <h3>Mis pedidos</h3>
        <div className="mis-pedidos-cargando">
          <PuffLoader color="currentColor" size={32} aria-label="Cargando tus pedidos" />
        </div>
      </section>
    );
  }

  return (
    <section className="mis-pedidos">
      <h3>Mis pedidos</h3>

      {pedidos.length === 0 ? (
        <div className="mis-pedidos-vacio">
          <p>Todavía no hiciste ningún pedido.</p>
          <Link to="/products" className="boton boton-secundario">
            Ver el catálogo
          </Link>
        </div>
      ) : (
        <ul className="mis-pedidos-lista">
          {pedidos.map((p) => {
            const estado = estadoDePedido(p);

            return (
              <li key={p.id} className="mi-pedido">
                <div className="mi-pedido-cabecera">
                  <span className="mi-pedido-fecha">
                    {new Date(p.date).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className={`mi-pedido-estado estado-${estado}`}>
                    {etiquetaDePedido(estado)}
                  </span>
                </div>

                <ul className="mi-pedido-items">
                  {p.items?.map((item, i) => (
                    <li key={i}>{renglonDe(item)}</li>
                  ))}
                </ul>

                <div className="mi-pedido-pie">
                  <span className="mi-pedido-total">
                    {formatearPrecio(p.total) ?? "—"}
                  </span>
                  <span className="mi-pedido-id">N° {p.id}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default MisPedidos;
