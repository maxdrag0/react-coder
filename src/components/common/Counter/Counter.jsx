import { Button } from "../Button/Button";
import "./Counter.css";
function Counter({ count, restar, sumar }) {
  return (
    <div className="counter-group">
      <Button callback={restar} className="boton-counter">
        -
      </Button>
      <div className="counter-display">{count}</div>
      <Button callback={sumar} className="boton-counter">
        +
      </Button>
    </div>
  );
}

export { Counter };
