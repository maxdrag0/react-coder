import { Button } from "../Button/Button";
import "./Modal.css";

const Modal = ({ isOpen, onClose, onAccept, tittle, message }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{tittle}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <Button callback={onAccept}>Aceptar</Button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
