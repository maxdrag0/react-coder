/*
  Los datos que faltan para poder atender el pedido. Solo se dibuja lo que el
  perfil todavía no tiene: a quien ya compró una vez no se le vuelve a
  preguntar nada.
*/
const Campo = ({ id, etiqueta, ayuda, error, valor, onCambio, ...props }) => (
  <div className="campo carrito-dato">
    <label htmlFor={id}>{etiqueta}</label>
    <input
      id={id}
      className="campo-control"
      value={valor}
      onChange={(e) => onCambio(e.target.value)}
      aria-invalid={error ? true : undefined}
      {...props}
    />
    <small className={error ? "campo-error" : "campo-ayuda"}>
      {error || ayuda}
    </small>
  </div>
);

const DatosEnvio = ({
  valores,
  errores,
  faltaTelefono,
  faltaDireccion,
  cambiar,
}) => (
  <div className="carrito-datos">
    {faltaTelefono && (
      <Campo
        id="carrito-telefono"
        etiqueta="Tu teléfono"
        type="tel"
        autoComplete="tel"
        placeholder="11 2345-6789"
        ayuda="Es por donde te contactamos para coordinar."
        valor={valores.telefono}
        error={errores.telefono}
        onCambio={(v) => cambiar("telefono", v)}
      />
    )}

    {faltaDireccion && (
      <>
        <Campo
          id="carrito-direccion"
          etiqueta="Dirección"
          type="text"
          autoComplete="street-address"
          placeholder="San Martín 742"
          ayuda="Calle y altura, con piso y depto si corresponde."
          valor={valores.direccion}
          error={errores.direccion}
          onCambio={(v) => cambiar("direccion", v)}
        />
        <Campo
          id="carrito-ciudad"
          etiqueta="Ciudad o localidad"
          type="text"
          autoComplete="address-level2"
          placeholder="Villa María"
          ayuda="La usamos para calcular el costo del envío."
          valor={valores.ciudad}
          error={errores.ciudad}
          onCambio={(v) => cambiar("ciudad", v)}
        />
      </>
    )}
  </div>
);

export default DatosEnvio;
