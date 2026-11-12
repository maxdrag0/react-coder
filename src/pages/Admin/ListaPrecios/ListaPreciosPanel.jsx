import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import FilaLista from "./FilaLista";
import { useListaPrecios } from "./useListaPrecios";
import "./ListaPrecios.css";

/*
  Subir la lista del proveedor y pasarla al catalogo.

  El PDF se lee ENTERO EN EL NAVEGADOR: son precios de costo y no tienen por
  que salir de la maquina.

  Lo que ya esta publicado arranca marcado con exactamente las presentaciones
  que vende hoy, y lo nuevo arranca sin marcar. Subir 260 productos de una no
  es lo que nadie quiere; actualizar los precios de los que ya vende, si.
*/

const FILTROS = [
  ["todos", "Todos"],
  ["web", "Ya en la web"],
  ["nuevos", "Sin publicar"],
  ["elegidos", "Elegidos"],
  ["atencion", "Para revisar"],
];

function ListaPreciosPanel({ productos, onAplicado }) {
  const lista = useListaPrecios(productos, { alTerminar: onAplicado });
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [activos, setActivos] = useState(false);

  const visibles = useMemo(() => {
    const aguja = busqueda.trim().toLowerCase();

    return lista.filas.filter((fila) => {
      const elegido = lista.elegidos.get(fila.id);
      if (!elegido) return false;

      if (aguja) {
        const texto = `${elegido.nombre} ${elegido.codigo}`.toLowerCase();
        if (!texto.includes(aguja)) return false;
      }

      if (filtro === "web") return Boolean(fila.web);
      if (filtro === "nuevos") return !fila.web;
      if (filtro === "elegidos") {
        return lista.acciones.get(fila.id) !== "nada";
      }
      if (filtro === "atencion") return fila.avisos.length > 0 || fila.repetido;
      return true;
    });
  }, [lista.filas, lista.elegidos, lista.acciones, filtro, busqueda]);

  if (lista.filas.length === 0) {
    return (
      <section className="lp-vacio">
        <h3>Subir la lista del proveedor</h3>
        <p>
          Elegí el PDF de la lista y lo leo acá mismo, en tu navegador: el
          archivo no se sube a ningún lado. Te muestro qué productos ya tenés
          publicados, cuánto cambió el precio de cada uno, y cuáles son nuevos.
        </p>

        <label className="boton boton-primario lp-subir">
          <Upload size={16} aria-hidden="true" />
          {lista.leyendo ? "Leyendo…" : "Elegir el PDF"}
          <input
            type="file"
            accept="application/pdf,.pdf"
            hidden
            disabled={lista.leyendo}
            onChange={(e) => lista.leerArchivo(e.target.files?.[0])}
          />
        </label>

        {lista.error && <p className="lp-error">{lista.error}</p>}

        <p className="lp-nota">
          Tiene que ser un PDF con el texto adentro, que es como lo manda el
          proveedor. Un PDF escaneado es una foto: no tiene texto que leer.
        </p>
      </section>
    );
  }

  const { resumen, resultado } = lista;

  return (
    <section className="lp">
      <header className="lp-barra">
        <div className="lp-barra-alto">
          <div>
            <h3>{lista.archivo}</h3>
            <p>
              {lista.filas.length} productos en la lista ·{" "}
              {lista.filas.filter((f) => f.web).length} ya están en la tienda y
              arrancan marcados
            </p>
          </div>

          <div className="lp-marcador">
            <div>
              <b>{resumen.crear}</b>
              <span>a crear</span>
            </div>
            <div>
              <b>{resumen.actualizar + resumen.renombrar}</b>
              <span>a actualizar</span>
            </div>
            <div>
              <b>{resumen.borrar}</b>
              <span>a borrar</span>
            </div>
          </div>
        </div>

        <div className="lp-controles">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código"
            aria-label="Buscar"
          />

          {FILTROS.map(([clave, etiqueta]) => (
            <button
              key={clave}
              type="button"
              className="lp-chip"
              aria-pressed={filtro === clave}
              onClick={() => setFiltro(clave)}
            >
              {etiqueta}
            </button>
          ))}

          <label className="lp-activos">
            <input
              type="checkbox"
              checked={activos}
              onChange={(e) => setActivos(e.target.checked)}
            />
            Publicar los nuevos
          </label>

          <button
            type="button"
            className="boton boton-primario"
            disabled={
              lista.aplicando ||
              resumen.total === 0 ||
              resumen.choques.length > 0
            }
            onClick={() => lista.aplicar({ activos })}
          >
            {lista.aplicando
              ? "Aplicando…"
              : `Aplicar ${resumen.total} cambios`}
          </button>

          <button
            type="button"
            className="boton boton-secundario"
            onClick={lista.limpiar}
          >
            Cancelar
          </button>
        </div>
      </header>

      {!activos && resumen.crear > 0 && (
        <p className="lp-aviso">
          Los {resumen.crear} productos nuevos van a quedar{" "}
          <strong>ocultos</strong>, porque la lista no trae fotos. Subiles la
          imagen y publicalos desde Productos.
        </p>
      )}

      {resumen.choques.length > 0 && (
        <p className="lp-aviso lp-aviso-malo">
          <strong>No se puede aplicar.</strong> Estos códigos los escriben dos
          filas distintas, y la segunda pisaría a la primera:{" "}
          {resumen.choques.map((c) => c.id).join(", ")}. Elegí una sola, o
          cambiale el código a la otra.
        </p>
      )}

      {lista.sueltas.length > 0 && (
        <p className="lp-aviso">
          <strong>
            {lista.sueltas.length} filas quedaron fuera de la tabla.
          </strong>{" "}
          El PDF las dibuja con otras coordenadas y no sé a qué columna va cada
          dato. Cargalas a mano desde Productos:{" "}
          {lista.sueltas.map((s) => s.join(" · ")).join(" / ")}
        </p>
      )}

      {lista.sinCruce.length > 0 && (
        <p className="lp-aviso">
          <strong>
            {lista.sinCruce.length} productos publicados no están en esta lista
          </strong>{" "}
          ({lista.sinCruce.map((s) => s.nombre).join(", ")}). No se tocan. Si
          alguno sí está y no lo encontré, escribile su código a la fila que le
          corresponda y pasa a ser una actualización.
        </p>
      )}

      {resultado && (
        <p
          className={`lp-aviso ${resultado.fallaron.length > 0 ? "lp-aviso-malo" : "lp-aviso-bien"}`}
        >
          <strong>Listo.</strong> {resultado.crear} creados,{" "}
          {resultado.actualizar + resultado.renombrar} actualizados,{" "}
          {resultado.borrar} borrados.
          {resultado.fallaron.length > 0 && (
            <>
              {" "}
              Fallaron {resultado.fallaron.length}:{" "}
              {resultado.fallaron.map((f) => f.codigo).join(", ")}.
            </>
          )}
        </p>
      )}

      {lista.error && <p className="lp-aviso lp-aviso-malo">{lista.error}</p>}

      <div className="lp-filas">
        {visibles.map((fila) => (
          <FilaLista
            key={fila.id}
            fila={fila}
            elegido={lista.elegidos.get(fila.id)}
            accion={lista.acciones.get(fila.id) ?? "nada"}
            onAlternar={lista.alternar}
            onAlternarFila={lista.alternarFila}
            onBorrar={lista.alternarBorrar}
            onEditar={lista.editar}
          />
        ))}

        {visibles.length === 0 && (
          <p className="lp-nota">Ningún producto coincide con el filtro.</p>
        )}
      </div>
    </section>
  );
}

export default ListaPreciosPanel;
