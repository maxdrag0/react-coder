import "./BarraStock.css";

const UMBRAL_BAJO = 10;

const BarraStock = ({ stock, maximo = 100 }) => {
  const unidades = Number.isFinite(stock) ? Math.max(0, stock) : 0;
  const porcentaje = Math.min(100, Math.round((unidades / maximo) * 100));

  const agotado = unidades === 0;
  const bajo = !agotado && unidades <= UMBRAL_BAJO;

  const texto = agotado
    ? "Sin stock"
    : bajo
      ? `Últimas ${unidades} unidades`
      : `${unidades} en stock`;

  return (
    <div className={`barra ${agotado ? "barra-agotada" : ""} ${bajo ? "barra-baja" : ""}`}>
      <div
        className="barra-pista"
        role="meter"
        aria-valuenow={unidades}
        aria-valuemin={0}
        aria-valuemax={maximo}
        aria-label="Stock disponible"
      >
        <div className="barra-relleno" style={{ width: `${porcentaje}%` }} />
      </div>
      <span className="barra-texto">{texto}</span>
    </div>
  );
};

export default BarraStock;
