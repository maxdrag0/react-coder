import { PuffLoader } from "react-spinners";
import { useState, useEffect, useMemo } from "react";
import {
  useParams,
  useSearchParams,
  useNavigate,
  Link,
} from "react-router-dom";
import { Search } from "lucide-react";
import ItemListContainer from "../../components/ItemListContainer/ItemListContainer";
import FiltrosProductos from "../../components/FiltrosProductos/FiltrosProductos";
import { useProducts } from "../../hooks/useProducts";
import { precioMinimo } from "../../constants/unidades";
import { SIN_MARCA } from "../../constants/marcas";
import { seMuestra } from "../../constants/estadoProducto";
import {
  categoriasConProductos,
  deLaCategoria,
} from "../../constants/categoriasConProductos";
import "./Products.css";

const coincideTexto = (item, busqueda) => {
  if (!busqueda) return true;
  const q = busqueda.toLowerCase();
  return (
    (item.nombre || "").toLowerCase().includes(q) ||
    (item.categoria || "").toLowerCase().includes(q) ||
    (item.marca || "").toLowerCase().includes(q)
  );
};

// Un producto sin precio no se oculta por el filtro de precio.
// Con modelos se mira el piso del rango: el producto entra si su modelo mas
// barato entra.
const coincidePrecio = (item, tope) => {
  const precio = precioMinimo(item);
  return precio === null || precio <= tope;
};

const marcaDe = (item) => item.marca || SIN_MARCA;

function Products() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [localSearch, setLocalSearch] = useState(urlSearch);

  /*
    El catálogo entero de una, SIN pedirle la categoría a Firestore.

    Dos razones. El filtro corre en el cliente, así que con paginado el
    buscador solo veía la primera página. Y el panel de filtros tiene que
    saber qué categorías tienen algo cargado para no ofrecer las que no:
    pidiendo una sola categoría no hay manera de saberlo.

    No cuesta lecturas: pega en la misma entrada de caché que llena la
    portada, así que moverse entre categorías pasó de una vuelta al catálogo
    por categoría a una sola por sesión.
  */
  const { items, loading } = useProducts(undefined, { traerTodo: true });

  // Un producto oculto no existe para la tienda: se va antes de calcular
  // marcas, precio máximo y conteos, para que no infle ningún número.
  const visibles = useMemo(() => items.filter(seMuestra), [items]);

  /*
    Las categorías del panel salen del catálogo y no de la constante: de las
    dieciséis se usan menos de la mitad, así que ofrecerlas todas llenaba el
    filtro de opciones que llevan a "No encontramos nada".

    La elegida va igual aunque esté vacía, para que el panel pueda marcarla
    como activa mientras la cabecera muestra ese nombre.
  */
  const categorias = useMemo(
    () => categoriasConProductos(visibles, category),
    [visibles, category],
  );

  /*
    Lo que mira esta página. El filtro por categoría pasó al cliente junto
    con los demás, así que las marcas, el precio máximo y los conteos se
    calculan sobre el rubro que se está mirando y no sobre todo el catálogo.
  */
  const enCategoria = useMemo(
    () => deLaCategoria(visibles, category),
    [visibles, category],
  );

  const [marcasElegidas, setMarcasElegidas] = useState([]);
  const [topePrecio, setTopePrecio] = useState(null);

  useEffect(() => {
    setLocalSearch(urlSearch);
  }, [urlSearch]);

  const marcas = useMemo(() => {
    const vistas = new Set(enCategoria.map(marcaDe));
    return [...vistas].sort((a, b) =>
      a === SIN_MARCA ? 1 : b === SIN_MARCA ? -1 : a.localeCompare(b),
    );
  }, [enCategoria]);

  const precioMax = useMemo(() => {
    const precios = enCategoria.map(precioMinimo).filter((p) => p !== null);
    return precios.length ? Math.max(...precios) : 0;
  }, [enCategoria]);

  const tope = topePrecio ?? precioMax;

  const filtrados = useMemo(
    () =>
      enCategoria.filter(
        (item) =>
          coincideTexto(item, localSearch) &&
          coincidePrecio(item, tope) &&
          (marcasElegidas.length === 0 ||
            marcasElegidas.includes(marcaDe(item))),
      ),
    [enCategoria, localSearch, marcasElegidas, tope],
  );

  // El conteo por marca aplica los demás filtros pero NO el de marca: así
  // cada casilla dice cuántos productos suma si la tildás, que es lo que
  // uno quiere saber antes de tildarla.
  const conteoMarcas = useMemo(() => {
    const cuenta = {};
    for (const item of enCategoria) {
      if (!coincideTexto(item, localSearch)) continue;
      if (!coincidePrecio(item, tope)) continue;
      const marca = marcaDe(item);
      cuenta[marca] = (cuenta[marca] ?? 0) + 1;
    }
    return cuenta;
  }, [enCategoria, localSearch, tope]);

  const cambiarBusqueda = (e) => {
    const valor = e.target.value;
    setLocalSearch(valor);
    setSearchParams(valor ? { search: valor } : {}, { replace: true });
  };

  const alternarMarca = (marca) =>
    setMarcasElegidas((actual) =>
      actual.includes(marca)
        ? actual.filter((m) => m !== marca)
        : [...actual, marca],
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
          <Search
            size={18}
            className="productos-buscador-icono"
            aria-hidden="true"
          />
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
            categorias={categorias}
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
              <PuffLoader
                color="currentColor"
                aria-label="Cargando productos"
              />
              <p>Cargando productos...</p>
            </div>
          ) : (
            <>
              <p className="productos-cuenta">
                {filtrados.length}{" "}
                {filtrados.length === 1 ? "producto" : "productos"}
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
