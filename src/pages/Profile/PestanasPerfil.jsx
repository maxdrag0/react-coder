/*
  Las dos solapas del perfil: los datos y los pedidos.

  Antes era todo una sola página —datos, preferencias, la lista entera de
  pedidos con sus renglones y, al final de todo, cerrar sesión—, así que con
  unos pocos pedidos había que scrollear para hacer cualquier cosa.

  Dos y no cinco: lo que se viene a hacer acá es mirar los pedidos o corregir
  un dato. El resto son pestañas vacías.
*/
const PestanasPerfil = ({ actual, onCambiar, secciones }) => (
  <div className="perfil-pestanas" role="tablist" aria-label="Secciones">
    {secciones.map((s) => (
      <button
        key={s.clave}
        type="button"
        role="tab"
        id={`perfil-tab-${s.clave}`}
        aria-selected={actual === s.clave}
        aria-controls={`perfil-panel-${s.clave}`}
        className={`perfil-pestana ${actual === s.clave ? "activa" : ""}`}
        onClick={() => onCambiar(s.clave)}
      >
        {s.etiqueta}
      </button>
    ))}
  </div>
);

export default PestanasPerfil;
