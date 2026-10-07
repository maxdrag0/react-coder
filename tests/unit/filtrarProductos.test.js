import { describe, it, expect } from "vitest";
import {
  filtrarProductos,
  contarEstadosProducto,
  categoriasPresentes,
  marcasPresentes,
  hayFiltros,
  FILTROS_VACIOS,
} from "../../src/pages/Admin/filtrarProductos";
import { SIN_MARCA } from "../../src/constants/marcas";

const prod = (codigo, extra = {}) => ({
  codigo,
  nombre: `Producto ${codigo}`,
  categoria: "Petardos",
  precioUnitario: 1000,
  fotoUrl: "https://ejemplo.test/f.jpg",
  ...extra,
});

const ids = (r) => r.map((p) => p.codigo);
const f = (parcial) => ({ ...FILTROS_VACIOS, ...parcial });

describe("filtrarProductos: sin filtros", () => {
  it("devuelve todo", () => {
    const lista = [prod("A"), prod("B", { estado: "oculto" })];
    expect(filtrarProductos(lista, FILTROS_VACIOS)).toHaveLength(2);
  });

  it("incluye los ocultos: el panel los tiene que poder ver", () => {
    // Al contrario de la tienda, que los esconde.
    const lista = [prod("A", { estado: "oculto" })];
    expect(filtrarProductos(lista, FILTROS_VACIOS)).toHaveLength(1);
  });
});

describe("filtrarProductos: por estado", () => {
  const lista = [
    prod("A"), // sin campo: activo
    prod("B", { estado: "activo" }),
    prod("C", { estado: "sin_stock" }),
    prod("D", { estado: "oculto" }),
  ];

  it("filtra activos, incluyendo los que no tienen el campo", () => {
    expect(ids(filtrarProductos(lista, f({ estado: "activo" })))).toEqual(["A", "B"]);
  });

  it("filtra sin stock", () => {
    expect(ids(filtrarProductos(lista, f({ estado: "sin_stock" })))).toEqual(["C"]);
  });

  it("filtra ocultos", () => {
    expect(ids(filtrarProductos(lista, f({ estado: "oculto" })))).toEqual(["D"]);
  });
});

describe("filtrarProductos: por categoría y marca", () => {
  const lista = [
    prod("A", { categoria: "Petardos", marca: "Punto Austral" }),
    prod("B", { categoria: "Tortas", marca: "Cienfuegos" }),
    // Esquema viejo: `category` y sin marca. `categoria` va en undefined a
    // propósito, porque un producto real tiene uno de los dos, no los dos.
    prod("C", { categoria: undefined, category: "Tortas" }),
  ];

  it("filtra por categoría, leyendo los dos esquemas", () => {
    expect(ids(filtrarProductos(lista, f({ categoria: "Tortas" })))).toEqual(["B", "C"]);
  });

  it("filtra por marca", () => {
    expect(ids(filtrarProductos(lista, f({ marca: "Cienfuegos" })))).toEqual(["B"]);
  });

  it("filtra los que no tienen marca", () => {
    // 186 de 323 estan asi: el filtro sirve para ir completandolos.
    expect(ids(filtrarProductos(lista, f({ marca: SIN_MARCA })))).toEqual(["C"]);
  });
});

describe("filtrarProductos: por precio", () => {
  const lista = [
    prod("A", { precioUnitario: 100 }),
    prod("B", { precioUnitario: 5000 }),
    prod("C", { precioUnitario: 90000 }),
  ];

  it("filtra con un piso", () => {
    expect(ids(filtrarProductos(lista, f({ precioMin: 1000 })))).toEqual(["B", "C"]);
  });

  it("filtra con un techo", () => {
    expect(ids(filtrarProductos(lista, f({ precioMax: 10000 })))).toEqual(["A", "B"]);
  });

  it("filtra con los dos", () => {
    expect(
      ids(filtrarProductos(lista, f({ precioMin: 1000, precioMax: 10000 })))
    ).toEqual(["B"]);
  });

  it("incluye los extremos", () => {
    expect(
      ids(filtrarProductos(lista, f({ precioMin: 100, precioMax: 100 })))
    ).toEqual(["A"]);
  });

  it("EXCLUYE los que no tienen precio cuando hay un limite puesto", () => {
    // Al contrario de la tienda, que no los esconde. Aca el dueno esta
    // consultando por precio: algo sin precio no es una respuesta.
    const conSinPrecio = [...lista, prod("Z", { precioUnitario: 0 })];
    expect(ids(filtrarProductos(conSinPrecio, f({ precioMin: 1 })))).not.toContain("Z");
  });

  it("los incluye si no hay ningun limite puesto", () => {
    const conSinPrecio = [prod("Z", { precioUnitario: 0 })];
    expect(ids(filtrarProductos(conSinPrecio, FILTROS_VACIOS))).toEqual(["Z"]);
  });
});

describe("filtrarProductos: sin foto", () => {
  it("deja solo los que no tienen imagen", () => {
    // 323 productos del catalogo no tienen foto: es la tarea de contenido
    // mas grande que queda y este filtro es como se recorre.
    const lista = [
      prod("A"),
      prod("B", { fotoUrl: "" }),
      prod("C", { fotoUrl: null, image: "" }),
    ];
    expect(ids(filtrarProductos(lista, f({ sinFoto: true })))).toEqual(["B", "C"]);
  });

  it("acepta `image` del esquema nuevo como foto valida", () => {
    const lista = [prod("A", { fotoUrl: "", image: "https://x.test/i.jpg" })];
    expect(filtrarProductos(lista, f({ sinFoto: true }))).toEqual([]);
  });
});

describe("filtrarProductos: por texto", () => {
  it("busca por nombre y por codigo", () => {
    const lista = [prod("ABC"), prod("XYZ", { nombre: "Cohete grande" })];
    expect(ids(filtrarProductos(lista, f({ texto: "cohete" })))).toEqual(["XYZ"]);
    expect(ids(filtrarProductos(lista, f({ texto: "abc" })))).toEqual(["ABC"]);
  });

  it("ignora mayusculas y espacios de sobra", () => {
    expect(ids(filtrarProductos([prod("A")], f({ texto: "  PRODUCTO A " })))).toEqual([
      "A",
    ]);
  });
});

describe("filtrarProductos: varios filtros juntos", () => {
  it("los aplica todos", () => {
    const lista = [
      prod("A", { categoria: "Tortas", precioUnitario: 5000, estado: "activo" }),
      prod("B", { categoria: "Tortas", precioUnitario: 90000, estado: "activo" }),
      prod("C", { categoria: "Tortas", precioUnitario: 5000, estado: "oculto" }),
    ];
    expect(
      ids(
        filtrarProductos(
          lista,
          f({ estado: "activo", categoria: "Tortas", precioMax: 10000 })
        )
      )
    ).toEqual(["A"]);
  });
});

describe("contarEstadosProducto", () => {
  it("cuenta cada estado y el total", () => {
    const lista = [prod("A"), prod("B", { estado: "oculto" }), prod("C", { estado: "oculto" })];
    const cuenta = contarEstadosProducto(lista);
    expect(cuenta.activo).toBe(1);
    expect(cuenta.oculto).toBe(2);
    expect(cuenta.sin_stock).toBe(0);
    expect(cuenta.todos).toBe(3);
  });
});

describe("categoriasPresentes y marcasPresentes", () => {
  it("solo ofrecen lo que existe en el catalogo, ordenado", () => {
    // Ofrecer las 16 categorias cuando se usan 9 son 7 opciones que no
    // devuelven nada.
    const lista = [
      prod("A", { categoria: "Tortas" }),
      prod("B", { categoria: "Bengalas" }),
      prod("C", { categoria: "Tortas" }),
    ];
    expect(categoriasPresentes(lista)).toEqual(["Bengalas", "Tortas"]);
  });

  it("marcasPresentes pone 'Sin marca' al final", () => {
    const lista = [
      prod("A", { marca: "Punto Austral" }),
      prod("B"),
      prod("C", { marca: "Cienfuegos" }),
    ];
    expect(marcasPresentes(lista)).toEqual([
      "Cienfuegos",
      "Punto Austral",
      SIN_MARCA,
    ]);
  });
});

describe("hayFiltros", () => {
  it("es falso con los filtros vacios", () => {
    expect(hayFiltros(FILTROS_VACIOS)).toBe(false);
  });

  it("es verdadero con cualquiera puesto", () => {
    expect(hayFiltros(f({ texto: "a" }))).toBe(true);
    expect(hayFiltros(f({ estado: "oculto" }))).toBe(true);
    expect(hayFiltros(f({ precioMin: 1 }))).toBe(true);
    expect(hayFiltros(f({ sinFoto: true }))).toBe(true);
  });
});
