import { Search } from "lucide-react";
import { ESTADOS_PEDIDO } from "@/constants/estadoPedido";
import { ABIERTOS, TODOS } from "./filtrarPedidos";

// "Abiertos" primero y por defecto: lo que el dueño quiere saber al entrar es
// qué le falta hacer, no la lista histórica completa.
const CHIPS = [
  { clave: ABIERTOS, etiqueta: "Abiertos" },
  ...ESTADOS_PEDIDO,
  { clave: TODOS, etiqueta: "Todos" },
];

const FiltrosPedidos = ({ estado, onEstado, texto, onTexto, cuenta, visibles }) => (
  <div className="pedidos-filtros">
    <div className="pedidos-chips" role="group" aria-label="Filtrar por estado">
      {CHIPS.map((c) => (
        <button
          key={c.clave}
          type="button"
          className={`pedidos-chip ${estado === c.clave ? "activo" : ""}`}
          onClick={() => onEstado(c.clave)}
          aria-pressed={estado === c.clave}
        >
          {c.etiqueta}
          <span className="pedidos-chip-cuenta">{cuenta[c.clave] ?? 0}</span>
        </button>
      ))}
    </div>

    <div className="pedidos-buscador">
      <Search size={16} aria-hidden="true" />
      <input
        type="search"
        placeholder="Nombre, email, teléfono, N° de orden o producto"
        aria-label="Buscar pedidos"
        value={texto}
        onChange={(e) => onTexto(e.target.value)}
      />
    </div>

    <p className="pedidos-cuenta">
      {visibles} {visibles === 1 ? "pedido" : "pedidos"}
    </p>
  </div>
);

export default FiltrosPedidos;
