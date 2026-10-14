import { describe, it, expect } from "vitest";
import {
  aFormulario,
  aFirestore,
  PRODUCTO_VACIO,
} from "../../src/pages/Admin/mapearProducto";

// Un formulario como lo deja el modal: el unitario en `price` y las
// opcionales con su casilla.
const form = (extra = {}) => ({
  ...PRODUCTO_VACIO,
  codigo: "A12",
  name: "Torta 100 tiros",
  category: "Tortas",
  price: "8000",
  ...extra,
});

const conDisplayYBulto = form({
  presentaciones: {
    display: { activa: true, precio: "15000", unidades: "5" },
    bulto: { activa: true, precio: "140000", unidades: "50" },
  },
});

describe("aFirestore: borrar una presentación", () => {
  /*
    El bug que cubre: actualizarProducto usa setDoc con merge, y Firestore
    hace MERGE PROFUNDO de los mapas. Si al destildar el bulto se escribiera
    `presentaciones: {unitario, display}` sin la clave `bulto`, el merge
    conservaria el bulto que ya estaba en la base: el dueño creeria que lo
    quito y la tienda lo seguiria vendiendo.

    Por eso la clave tiene que viajar EXPLICITAMENTE en null.
  */
  it("escribe la presentación destildada como null, no la omite", () => {
    const sinBulto = form({
      presentaciones: {
        display: { activa: true, precio: "15000", unidades: "5" },
        bulto: { activa: false, precio: "", unidades: "" },
      },
    });

    const datos = aFirestore(sinBulto);

    expect("bulto" in datos.presentaciones).toBe(true);
    expect(datos.presentaciones.bulto).toBeNull();
  });

  it("también manda null la clave que nunca se tocó", () => {
    // Un producto nuevo sin display ni bulto: si las claves no viajan, un
    // producto que antes los tenia se los queda para siempre.
    const datos = aFirestore(form());
    expect(datos.presentaciones.display).toBeNull();
    expect(datos.presentaciones.bulto).toBeNull();
  });

  it("deja el campo viejo en null también", () => {
    const sinBulto = form({
      presentaciones: { bulto: { activa: false, precio: "", unidades: "" } },
    });
    expect(aFirestore(sinBulto).precioBulto).toBeNull();
  });

  it("una presentación tildada pero sin precio cuenta como no vendida", () => {
    const vacia = form({
      presentaciones: { display: { activa: true, precio: "", unidades: "" } },
    });
    expect(aFirestore(vacia).presentaciones.display).toBeNull();
  });
});

describe("aFirestore: lo que sí se guarda", () => {
  it("guarda precio y cantidad de cada presentación activa", () => {
    const datos = aFirestore(conDisplayYBulto);
    expect(datos.presentaciones.unitario).toEqual({ precio: 8000 });
    expect(datos.presentaciones.display).toEqual({
      precio: 15000,
      unidades: 5,
    });
    expect(datos.presentaciones.bulto).toEqual({
      precio: 140000,
      unidades: 50,
    });
  });

  it("escribe el nombre canonico y los precios del esquema viejo", () => {
    // Los precios sueltos siguen: son otro par legado, de antes de las
    // presentaciones, y todavia no se migraron.
    const datos = aFirestore(conDisplayYBulto);
    expect(datos.nombre).toBe("Torta 100 tiros");
    expect(datos.precioUnitario).toBe(8000);
    expect(datos.precioDisplay).toBe(15000);
  });

  it("la cantidad vacía queda en null, no en cero", () => {
    const sinCantidad = form({
      presentaciones: {
        display: { activa: true, precio: "15000", unidades: "" },
      },
    });
    expect(aFirestore(sinCantidad).presentaciones.display.unidades).toBeNull();
  });
});

describe("aFirestore: modelos", () => {
  const conModelos = form({
    conModelos: true,
    modelos: [
      {
        id: null,
        etiqueta: "3 pulgadas",
        precio: "8000",
        presentaciones: {
          display: { activa: true, precio: "15000", unidades: "5" },
        },
      },
      { id: null, etiqueta: "5 pulgadas", precio: "20000", presentaciones: {} },
    ],
  });

  it("genera el id a partir del nombre del modelo", () => {
    expect(aFirestore(conModelos).modelos.map((m) => m.id)).toEqual([
      "3-pulgadas",
      "5-pulgadas",
    ]);
  });

  it("CONSERVA el id de un modelo que ya lo tenía, aunque cambie el nombre", () => {
    // El id va en el carrito y en los pedidos: regenerarlo al renombrar
    // dejaria huerfano todo lo que lo referencia.
    const renombrado = form({
      conModelos: true,
      modelos: [
        {
          id: "tres",
          etiqueta: "3 pulgadas (chico)",
          precio: "8000",
          presentaciones: {},
        },
      ],
    });
    expect(aFirestore(renombrado).modelos[0].id).toBe("tres");
  });

  it("descarta un modelo sin nombre o sin precio", () => {
    const sucio = form({
      conModelos: true,
      modelos: [
        { id: null, etiqueta: "", precio: "8000", presentaciones: {} },
        { id: null, etiqueta: "Rojo", precio: "", presentaciones: {} },
        { id: null, etiqueta: "Verde", precio: "500", presentaciones: {} },
      ],
    });
    expect(aFirestore(sucio).modelos.map((m) => m.etiqueta)).toEqual(["Verde"]);
  });

  it("con modelos, los precios del producto van en null", () => {
    const datos = aFirestore(conModelos);
    expect(datos.precioUnitario).toBeNull();
    expect(datos.precioDisplay).toBeNull();
    expect(datos.price).toBeNull();
  });

  it("destildar 'por modelo' vacía la lista, no la deja escondida", () => {
    // Si el array no viajara vacio, un producto que tuvo modelos los
    // seguiria teniendo y la tienda pediria elegir uno.
    const sinModelos = form({
      conModelos: false,
      modelos: [{ id: "x", etiqueta: "X", precio: "1" }],
    });
    expect(aFirestore(sinModelos).modelos).toEqual([]);
  });
});

describe("aFormulario: leer un producto existente", () => {
  it("lee el esquema viejo", () => {
    const viejo = {
      codigo: "B1",
      nombre: "Petardo",
      categoria: "Petardos",
      precioUnitario: 300,
      precioBulto: 30000,
      fotoUrl: "https://x.test/f.jpg",
    };
    const f = aFormulario(viejo);
    expect(f.name).toBe("Petardo");
    expect(f.price).toBe(300);
    expect(f.category).toBe("Petardos");
    expect(f.image).toBe("https://x.test/f.jpg");
    expect(f.presentaciones.bulto.activa).toBe(true);
    expect(f.presentaciones.bulto.precio).toBe(30000);
  });

  it("destilda la presentación con el precio repetido del unitario", () => {
    // 171 productos lo tienen asi y la tienda los ignora: el formulario tiene
    // que mostrar lo que la tienda ofrece de verdad.
    const repetido = { codigo: "C1", precioUnitario: 500, precioDisplay: 500 };
    expect(aFormulario(repetido).presentaciones.display.activa).toBe(false);
  });

  it("guarda el código original para detectar el renombrado", () => {
    expect(aFormulario({ codigo: "X9" }).codigoOriginal).toBe("X9");
  });

  it("detecta que el producto tiene modelos", () => {
    const conMod = {
      codigo: "M1",
      modelos: [
        {
          id: "a",
          etiqueta: "Rojo",
          presentaciones: { unitario: { precio: 100 } },
        },
      ],
    };
    const f = aFormulario(conMod);
    expect(f.conModelos).toBe(true);
    expect(f.modelos[0]).toMatchObject({
      id: "a",
      etiqueta: "Rojo",
      precio: 100,
    });
  });
});

describe("aFirestore: fotos", () => {
  const A = "https://ejemplo.test/a.jpg";
  const B = "https://ejemplo.test/b.jpg";

  it("guarda la lista completa", () => {
    expect(aFirestore(form({ fotos: [A, B] })).fotos).toEqual([A, B]);
  });

  it("escribe la primera suelta en fotoUrl", () => {
    // Es la que lee cualquier cosa que todavia no conozca `fotos`: los
    // scripts y el archivo semilla.
    const datos = aFirestore(form({ fotos: [A, B] }));
    expect(datos.fotoUrl).toBe(A);
    expect("image" in datos).toBe(false);
  });

  it("sin fotos deja fotoUrl en null, no en undefined", () => {
    // undefined hace que Firestore rechace la escritura entera.
    const datos = aFirestore(form({ fotos: [] }));
    expect(datos.fotos).toEqual([]);
    expect(datos.fotoUrl).toBeNull();
  });

  it("guarda la foto de cada modelo", () => {
    const conFotos = form({
      conModelos: true,
      modelos: [
        {
          id: "rojo",
          etiqueta: "Rojo",
          precio: "100",
          foto: A,
          presentaciones: {},
        },
        {
          id: "verde",
          etiqueta: "Verde",
          precio: "100",
          foto: "",
          presentaciones: {},
        },
      ],
    });
    const modelos = aFirestore(conFotos).modelos;
    expect(modelos[0].foto).toBe(A);
    // null y no omitida: el merge profundo de Firestore conservaria la vieja.
    expect(modelos[1].foto).toBeNull();
  });
});

describe("aFormulario: fotos", () => {
  it("lee la lista nueva", () => {
    const f = aFormulario({ codigo: "A1", fotos: ["https://x.test/1.jpg"] });
    expect(f.fotos).toEqual(["https://x.test/1.jpg"]);
  });

  it("lee la foto única del esquema viejo", () => {
    // Los 323 productos del catalogo estan asi.
    const f = aFormulario({
      codigo: "A1",
      fotoUrl: "https://x.test/vieja.jpg",
    });
    expect(f.fotos).toEqual(["https://x.test/vieja.jpg"]);
  });

  it("arranca sin archivos pendientes de subir", () => {
    expect(aFormulario({ codigo: "A1" }).archivosNuevos).toEqual([]);
  });

  it("lee la foto de cada modelo", () => {
    const conMod = {
      codigo: "M1",
      modelos: [
        {
          id: "a",
          etiqueta: "Rojo",
          foto: "https://x.test/rojo.jpg",
          presentaciones: { unitario: { precio: 100 } },
        },
      ],
    };
    expect(aFormulario(conMod).modelos[0].foto).toBe("https://x.test/rojo.jpg");
  });
});

describe("aFirestore: un solo idioma", () => {
  /*
    El panel escribia los dos: name Y nombre, category Y categoria. Con la
    migracion ya corrida eso la revierte de a un producto por vez, en silencio
    y justo sobre los que mas se tocan.

    Los campos de precio viejos (price, precioUnitario...) NO entran aca: son
    otro par legado, de antes de las presentaciones, y todavia no se migraron.
  */
  const guardado = () =>
    aFirestore({
      ...form(),
      name: "Torta 100 tiros",
      category: "Tortas",
      description: "Cien tiros",
      fotos: ["https://x/f.jpg"],
    });

  it("no escribe name", () => {
    expect("name" in guardado()).toBe(false);
  });

  it("no escribe category", () => {
    expect("category" in guardado()).toBe(false);
  });

  it("no escribe description", () => {
    expect("description" in guardado()).toBe(false);
  });

  it("no escribe image", () => {
    expect("image" in guardado()).toBe(false);
  });

  it("sigue escribiendo los canonicos", () => {
    const g = guardado();
    expect(g.nombre).toBe("Torta 100 tiros");
    expect(g.categoria).toBe("Tortas");
    expect(g.descripcion).toBe("Cien tiros");
    expect(g.fotoUrl).toBe("https://x/f.jpg");
  });
});
