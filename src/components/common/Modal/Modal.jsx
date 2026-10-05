import { useEffect, useRef } from "react";
import "./Modal.css";

const ENFOCABLES =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

// `tittle` está mal escrito desde el original. Se mantiene para no tocar a sus
// consumidores; renombrarlo es trabajo del subproyecto E.
const Modal = ({
  isOpen,
  onClose,
  onAccept,
  tittle,
  message,
  textoAceptar = "Entendido",
  acciones = null,
}) => {
  const caja = useRef(null);
  const previo = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    previo.current = document.activeElement;
    caja.current?.focus();

    const alTeclear = (e) => {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;

      const items = caja.current?.querySelectorAll(ENFOCABLES);
      if (!items?.length) return;

      const primero = items[0];
      const ultimo = items[items.length - 1];

      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", alTeclear);
    const devolverFocoA = previo.current;

    return () => {
      document.removeEventListener("keydown", alTeclear);
      devolverFocoA?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-fondo" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        tabIndex={-1}
        ref={caja}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-titulo">{tittle}</h2>
        <div className="modal-cuerpo">{message}</div>
        <div className="modal-acciones">
          <button type="button" className="boton boton-secundario" onClick={onAccept}>
            {textoAceptar}
          </button>
          {acciones}
        </div>
      </div>
    </div>
  );
};

export default Modal;
