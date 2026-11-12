import { describe, it, expect } from "vitest";
import {
  aProductoNuevo,
  aActualizacion,
  modelosActualizados,
  planDeAplicacion,
} from "@/constants/desdeLista";

/*
  El tablero de la lista de precios decide qué productos subir; esto traduce
  esa decisión a documentos de Firestore.

  Las dos reglas que importan y que cuidan los tests:

  1. Una ACTUALIZACIÓN toca los precios y nada más. El producto publicado
     tiene fotos, descripción, estado y contador de compras que la lista no
     conoce: escribirlos los perdería.
  2. Un producto NUEVO nace oculto. 260 productos sin foto en la portada es
     peor que no tenerlos.
*/

const item = (extra = {}) => ({
  accion: "crear",
  codigo: "202",
  idDoc: "202",
  webId: null,
  nombre: "Petardo Rompeportones",
  nombreLista: "PETARDO ROMPEPORTONES - superestruendo",
  marca: "Punto Austral",
  categoria: "Petardos",
  subcategoria: null,
  duracion: null,
  unidad: 860,
  display: { precio: 43000, unidades: 50 },
  bulto: { precio: 430000, unidades: 500 },
  modelos: null,
  editado: { nombre: false, marca: false, codigo: false, categoria: false },
  ...extra,
});

describe("aProductoNuevo", () => {
  it("arma las tres presentaciones con sus cantidades", () => {
    const p = aProductoNuevo(item());
    expect(p.presentaciones).toEqual({
      unitario: { precio: 860 },
      display: { precio: 43000, unidades: 50 },
      bulto: { precio: 430000, unidades: 500 },
    });
  });

  it("escribe en null la presentación que no se vende, no la omite", () => {
    /*
      Mismo motivo que el panel: actualizarProducto usa merge y Firestore hace
      merge PROFUNDO de los mapas, así que una clave ausente conservaría la
      que ya estaba.
    */
    const p = aProductoNuevo(item({ display: null, bulto: null }));
    expect("display" in p.presentaciones).toBe(true);
    expect(p.presentaciones.display).toBeNull();
    expect(p.presentaciones.bulto).toBeNull();
  });

  it("nace oculto", () => {
    expect(aProductoNuevo(item()).estado).toBe("oculto");
  });

  it("nace activo solo si se pide", () => {
    expect(aProductoNuevo(item(), { activo: true }).estado).toBe("activo");
  });

  it("nace sin fotos y con el contador en cero", () => {
    const p = aProductoNuevo(item());
    expect(p.fotos).toEqual([]);
    expect(p.fotoUrl).toBeNull();
    expect(p.compras).toBe(0);
  });

  it("guarda el nombre de la lista como descripción", () => {
    // El nombre del PDF trae la descripción pegada; es lo único que hay.
    expect(aProductoNuevo(item()).descripcion).toBe(
      "PETARDO ROMPEPORTONES - superestruendo",
    );
  });

  it("no escribe ningún campo del esquema viejo", () => {
    const p = aProductoNuevo(item());
    for (const campo of [
      "name",
      "category",
      "description",
      "image",
      "price",
      "precioUnitario",
    ]) {
      expect(campo in p).toBe(false);
    }
  });
});

describe("aProductoNuevo con modelos", () => {
  const conModelos = item({
    codigo: "250",
    idDoc: "250",
    nombre: "Bengala de humo",
    modelos: ["Rojo", "Azul"],
    unidad: 3050,
    display: { precio: 15250, unidades: 5 },
    bulto: null,
  });

  it("el producto no tiene precio propio", () => {
    // El precio vive en cada modelo: un lector que no sepa de modelos no
    // tiene que encontrar un precio que no se puede comprar.
    expect(aProductoNuevo(conModelos).presentaciones).toEqual({
      unitario: null,
      display: null,
      bulto: null,
    });
  });

  it("cada modelo lleva las presentaciones de la lista", () => {
    const p = aProductoNuevo(conModelos);
    expect(p.modelos).toHaveLength(2);
    expect(p.modelos[0]).toEqual({
      id: "rojo",
      etiqueta: "Rojo",
      presentaciones: {
        unitario: { precio: 3050 },
        display: { precio: 15250, unidades: 5 },
        bulto: null,
      },
      foto: null,
    });
  });

  it("los ids de modelo no se repiten", () => {
    const p = aProductoNuevo(item({ modelos: ["Rojo", "Rojo", "Azul"] }));
    const ids = p.modelos.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("aActualizacion", () => {
  it("sin ediciones, toca solo las presentaciones", () => {
    const campos = aActualizacion(item({ accion: "actualizar", webId: "202" }));
    expect(Object.keys(campos)).toEqual(["presentaciones"]);
  });

  it("nunca toca fotos, estado, descripción ni el contador", () => {
    const campos = aActualizacion(
      item({
        accion: "actualizar",
        webId: "202",
        editado: { nombre: true, marca: true, codigo: true, categoria: true },
      }),
    );
    for (const campo of [
      "fotos",
      "fotoUrl",
      "estado",
      "descripcion",
      "compras",
      "videoUrl",
    ]) {
      expect(campo in campos).toBe(false);
    }
  });

  it("actualiza el nombre solo si se editó", () => {
    const sin = aActualizacion(item({ accion: "actualizar", webId: "202" }));
    expect("nombre" in sin).toBe(false);

    const con = aActualizacion(
      item({
        accion: "actualizar",
        webId: "202",
        nombre: "Petardo Rompeportones Grande",
        editado: {
          nombre: true,
          marca: false,
          codigo: false,
          categoria: false,
        },
      }),
    );
    expect(con.nombre).toBe("Petardo Rompeportones Grande");
  });

  it("la marca editada a vacío se escribe en null, no se omite", () => {
    const campos = aActualizacion(
      item({
        accion: "actualizar",
        webId: "202",
        marca: "",
        editado: {
          nombre: false,
          marca: true,
          codigo: false,
          categoria: false,
        },
      }),
    );
    expect(campos.marca).toBeNull();
  });
});

describe("modelosActualizados", () => {
  const existentes = [
    {
      id: "rojo",
      etiqueta: "Rojo",
      foto: "https://x/r.jpg",
      presentaciones: {},
    },
    { id: "azul", etiqueta: "Azul", foto: null, presentaciones: {} },
  ];
  const pres = { unitario: { precio: 3050 }, display: null, bulto: null };

  it("conserva el id y la foto de los modelos que ya existían", () => {
    /*
      El id del modelo está en los carritos y en los pedidos ya hechos:
      regenerarlo dejaría huérfano todo lo que lo referencia. Y la foto por
      color es trabajo que la lista no tiene.
    */
    const m = modelosActualizados(existentes, ["Rojo", "Azul"], pres);
    expect(m.map((x) => x.id)).toEqual(["rojo", "azul"]);
    expect(m[0].foto).toBe("https://x/r.jpg");
  });

  it("le pone precio nuevo a todos", () => {
    const m = modelosActualizados(existentes, ["Rojo"], pres);
    expect(m[0].presentaciones).toEqual(pres);
  });

  it("agrega el modelo que la lista trae y la web no tenía", () => {
    const m = modelosActualizados(existentes, ["Rojo", "Naranja"], pres);
    expect(m.map((x) => x.etiqueta)).toEqual(["Rojo", "Naranja"]);
    expect(m[1].id).toBe("naranja");
    expect(m[1].foto).toBeNull();
  });

  it("deja afuera el modelo que no se eligió", () => {
    const m = modelosActualizados(existentes, ["Rojo"], pres);
    expect(m.map((x) => x.etiqueta)).toEqual(["Rojo"]);
  });
});

describe("planDeAplicacion", () => {
  const entrada = {
    a: item({ accion: "crear", idDoc: "202" }),
    b: item({ accion: "actualizar", idDoc: "1605", webId: "1605" }),
    c: item({ accion: "renombrar", idDoc: "1699", webId: "1690" }),
    d: item({ accion: "borrar", idDoc: "2302", webId: "2302" }),
    e: item({ accion: "nada", idDoc: "999" }),
  };

  it("separa cada acción", () => {
    const plan = planDeAplicacion(entrada);
    expect(plan.crear.map((x) => x.idDoc)).toEqual(["202"]);
    expect(plan.actualizar.map((x) => x.idDoc)).toEqual(["1605"]);
    expect(plan.renombrar.map((x) => x.idDoc)).toEqual(["1699"]);
    expect(plan.borrar.map((x) => x.webId)).toEqual(["2302"]);
  });

  it("ignora lo que no hay que tocar", () => {
    const plan = planDeAplicacion(entrada);
    const total =
      plan.crear.length +
      plan.actualizar.length +
      plan.renombrar.length +
      plan.borrar.length;
    expect(total).toBe(4);
  });

  it("avisa cuando dos filas escribirían el mismo documento", () => {
    // El código es el id del documento: dos filas con el mismo código se
    // pisan, y en el PDF hay 34 códigos repetidos.
    const plan = planDeAplicacion({
      a: item({ accion: "crear", idDoc: "1605" }),
      b: item({ accion: "crear", idDoc: "1605", nombre: "Otro" }),
    });
    expect(plan.choques).toEqual([{ idDoc: "1605", cuantos: 2 }]);
  });

  it("sin choques la lista viene vacía", () => {
    expect(planDeAplicacion(entrada).choques).toEqual([]);
  });
});
