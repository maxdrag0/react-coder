import { PuffLoader } from "react-spinners";
import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { Search } from "lucide-react";
import ItemListContainer from "../../components/ItemListContainer/ItemListContainer";
import FiltrosProductos from "../../components/FiltrosProductos/FiltrosProductos";
import { useProducts } from "../../hooks/useProducts";
import { precioDe } from "../../constants/unidades";
import { SIN_MARCA } from "../../constants/marcas";
import "./Products.css";

const coincideTexto = (item, busqueda) => {
  if (!busqueda) return true;
  const q = busqueda.toLowerCase();
  return (
    (item.nombre || item.name || "").toLowerCase().includes(q) ||
    (item.categoria || item.category || "").toLowerCase().includes(q) ||
    (item.marca || "").toLowerCase().includes(q)
  );
};

// Un producto sin precio no se oculta por el filtro de precio.
const coincidePrecio = (item, tope) => {
  const precio = precioDe(item, "unitario");
  return precio === null || precio <= tope;
};

const marcaDe = (item) => item.marca || SIN_MARCA;

function Products() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [localSearch, setLocalSearch] = useState(urlSearch);

  // El catálogo entero de una: el filtro corre en el cliente, así que con
  // paginado el buscador solo veía la primera página. Traerlo completo
  // también hace que filtrar sea instantáneo mientras se escribe.
  const { items, loading } = useProducts(category, { traerTodo: true });

  const [marcasElegidas, setMarcasElegidas] = useState([]);
  const [topePrecio, setTopePrecio] = useState(null);

  useEffect(() => {
    setLocalSearch(urlSearch);
  }, [urlSearch]);

  const marcas = useMemo(() => {
    const vistas = new Set(items.map(marcaDe));
    return [...vistas].sort((a, b) =>
      a === SIN_MARCA ? 1 : b === SIN_MARCA ? -1 : a.localeCompare(b)
    );
  }, [items]);

  const precioMax = useMemo(() => {
    const precios = items
      .map((i) => precioDe(i, "unitario"))
      .filter((p) => p !== null);
    return precios.length ? Math.max(...precios) : 0;
  }, [items]);

  const tope = topePrecio ?? precioMax;

  const filtrados = useMemo(
    () =>
      items.filter(
        (item) =>
          coincideTexto(item, localSearch) &&
          coincidePrecio(item, tope) &&
          (marcasElegidas.length === 0 || marcasElegidas.includes(marcaDe(item)))
      ),
    [items, localSearch, marcasElegidas, tope]
  );

  // El conteo por marca aplica los demás filtros pero NO el de marca: así
  // cada casilla dice cuántos productos suma si la tildás, que es lo que
  // uno quiere saber antes de tildarla.
  const conteoMarcas = useMemo(() => {
    const cuenta = {};
    for (const item of items) {
      if (!coincideTexto(item, localSearch)) continue;
      if (!coincidePrecio(item, tope)) continue;
      const marca = marcaDe(item);
      cuenta[marca] = (cuenta[marca] ?? 0) + 1;
    }
    return cuenta;
  }, [items, localSearch, tope]);

  const cambiarBusqueda = (e) => {
    const valor = e.target.value;
    setLocalSearch(valor);
    setSearchParams(valor ? { search: valor } : {}, { replace: true });
  };

  const alternarMarca = (marca) =>
    setMarcasElegidas((actual) =>
      actual.includes(marca)
        ? actual.filter((m) => m !== marca)
        : [...actual, marca]
    );

  const limpiar = () => {
    setMarcasElegidas([]);
    setTopePrecio(null);
    setLocalSearch("");
    navigate("/products", { replace: true });
  };

  return (
    <div className="productos contenedor">
      <header className="productos-cabecera">
        <h1>{category || "Todos los productos"}</h1>

        <div className="productos-buscador">
          <Search size={18} className="productos-buscador-icono" aria-hidden="true" />
          <input
            type="search"
            className="campo-control"
            placeholder="Buscar por nombre, categoría o marca"
            aria-label="Buscar productos en el catálogo"
            value={localSearch}
            onChange={cambiarBusqueda}
          />
        </div>
      </header>

      <div className="productos-cuerpo">
        <aside className="productos-panel">
          <FiltrosProductos
            categoria={category ?? null}
            onCategoria={(c) =>
              navigate(c ? `/products/${encodeURIComponent(c)}` : "/products")
            }
            marcas={marcas}
            marcasElegidas={marcasElegidas}
            onMarca={alternarMarca}
            conteoMarcas={conteoMarcas}
            precioMin={0}
            precioMax={precioMax}
            rango={[0, tope]}
            onRango={([, max]) => setTopePrecio(max)}
            cantidad={filtrados.length}
            onLimpiar={limpiar}
          />
        </aside>

        <div className="productos-resultado">
          {loading && items.length === 0 ? (
            <div className="productos-cargando">
              <PuffLoader color="currentColor" aria-label="Cargando productos" />
              <p>Cargando productos...</p>
            </div>
          ) : (
            <>
              <p className="productos-cuenta">
                {filtrados.length} {filtrados.length === 1 ? "producto" : "productos"}
              </p>

              {filtrados.length > 0 ? (
                <ItemListContainer items={filtrados} />
              ) : (
                <div className="productos-vacio">
                  <h2>No encontramos nada</h2>
                  <p>Probá con otra palabra o sacá algún filtro.</p>
                  <Link
                    to="/products"
                    className="boton boton-secundario"
                    onClick={limpiar}
                  >
                    Ver todo el catálogo
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Products;
