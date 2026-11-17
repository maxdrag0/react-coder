import { useState, useEffect } from "react";

/*
  Un dato del perfil que se edita y se guarda por separado.

  Uno por campo y no un formulario único con un solo botón: son datos
  independientes —el teléfono, la dirección, la ciudad— y el que cambia uno
  no quiere revisar los otros dos. Además así cada uno dice lo suyo cuando
  algo no sirve, al lado del campo que lo tiene.

  Existe porque el perfil ya tenía esto escrito a mano para el teléfono, y
  repetirlo tres veces eran sesenta líneas iguales con otro `useState`.
*/
const CampoEditable = ({
  id,
  etiqueta,
  ayuda,
  okTexto,
  inicial = "",
  cargando = false,
  validar,
  normalizar = (v) => v,
  onGuardar,
  ...props
}) => {
  const [valor, setValor] = useState("");
  const [estado, setEstado] = useState({ error: "", listo: false });
  const [guardando, setGuardando] = useState(false);

  // El perfil llega después del primer render. No pisa lo que la persona
  // esté escribiendo.
  useEffect(() => {
    if (inicial) setValor((actual) => actual || inicial);
  }, [inicial]);

  const enviar = async (e) => {
    e.preventDefault();
    const error = validar(valor);
    if (error) return setEstado({ error, listo: false });

    setGuardando(true);
    try {
      await onGuardar(normalizar(valor));
      setEstado({ error: "", listo: true });
    } catch {
      setEstado({
        error: "No pudimos guardarlo. Probá de nuevo.",
        listo: false,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="info-group info-editable" onSubmit={enviar}>
      <label className="info-label" htmlFor={id}>
        {etiqueta}
      </label>
      <div className="info-value perfil-editable">
        <input
          id={id}
          className="campo-control"
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            setEstado({ error: "", listo: false });
          }}
          disabled={cargando}
          aria-invalid={estado.error ? true : undefined}
          {...props}
        />
        <button
          type="submit"
          className="boton boton-secundario"
          disabled={guardando || cargando}
        >
          {guardando ? "Guardando..." : "Guardar"}
        </button>
      </div>
      {estado.error && <small className="campo-error">{estado.error}</small>}
      {estado.listo && <small className="campo-ok">{okTexto}</small>}
      {!estado.error && !estado.listo && (
        <small className="campo-ayuda">{ayuda}</small>
      )}
    </form>
  );
};

export default CampoEditable;
