// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CartContext } from "@/contexts/cart/CartContext";
import ItemDetails from "@/components/ItemDetails/ItemDetails";

const addToCart = vi.fn();

const SIMPLE = {
  codigo: "A12",
  nombre: "Torta 100 tiros",
  presentaciones: {
    unitario: { precio: 8000 },
    display: { precio: 15000, unidades: 5 },
  },
};

const CON_MODELOS = {
  codigo: "M100",
  nombre: "Mortero",
  modelos: [
    {
      id: "tres",
      etiqueta: "3 pulgadas",
      presentaciones: { unitario: { precio: 8000 } },
    },
    {
      id: "cinco",
      etiqueta: "5 pulgadas",
      presentaciones: {
        unitario: { precio: 20000 },
        bulto: { precio: 180000, unidades: 10 },
      },
    },
  ],
};

const montar = (item) =>
  render(
    <MemoryRouter>
      <CartContext.Provider value={{ addToCart }}>
        <ItemDetails item={item} />
      </CartContext.Provider>
    </MemoryRouter>,
  );

const sumar = () => screen.getByRole("button", { name: "+" });
const agregar = () =>
  screen.getByRole("button", { name: /agregar al carrito/i });
const selectorModelo = () => screen.getByRole("combobox", { name: /modelo/i });

beforeEach(() => addToCart.mockReset());

describe("ItemDetails: el cartel dice la cantidad que se agregó", () => {
  it("dice 3 cuando se agregaron 3", async () => {
    /*
      El bug: setCount(1) corre en el mismo handler que abre el modal y React
      agrupa las actualizaciones, asi que al pintarse el modal `count` ya valia
      1. El cartel decia "1 unidad de compra" sin importar lo que se agregara.
    */
    const usuario = userEvent.setup();
    montar(SIMPLE);

    await usuario.click(sumar());
    await usuario.click(sumar());
    await usuario.click(agregar());

    expect(screen.getByText(/3 unidades de compra/)).toBeInTheDocument();
  });

  it("dice 1 en singular cuando se agregó una", async () => {
    const usuario = userEvent.setup();
    montar(SIMPLE);
    await usuario.click(agregar());
    expect(screen.getByText(/1 unidad de compra/)).toBeInTheDocument();
  });

  it("manda al carrito la cantidad correcta", async () => {
    const usuario = userEvent.setup();
    montar(SIMPLE);
    await usuario.click(sumar());
    await usuario.click(agregar());
    expect(addToCart).toHaveBeenCalledWith(SIMPLE, 2, "unitario", null);
  });

  it("deja el contador en 1 para la próxima compra", async () => {
    const usuario = userEvent.setup();
    montar(SIMPLE);
    await usuario.click(sumar());
    await usuario.click(agregar());
    // El cartel dice 2 pero el contador volvio a 1: son dos cosas distintas.
    expect(screen.getByText(/2 unidades de compra/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});

describe("ItemDetails: el selector de modelo", () => {
  it("es un select y no una lista de opciones", () => {
    // Un producto con diez colores llenaba la pantalla con radios y empujaba
    // el precio y el boton de comprar abajo del todo.
    montar(CON_MODELOS);
    expect(selectorModelo()).toBeInTheDocument();
    expect(screen.queryAllByRole("radio", { name: /pulgadas/ })).toHaveLength(
      0,
    );
  });

  it("arranca con el primer modelo elegido", () => {
    montar(CON_MODELOS);
    expect(selectorModelo()).toHaveValue("tres");
  });

  it("NO muestra el precio al lado de cada modelo", () => {
    // El precio vive en el selector de unidad, que es donde se decide cuanto
    // se paga. Repetirlo en los dos lugares hacia dudar de cual manda.
    montar(CON_MODELOS);
    within(selectorModelo())
      .getAllByRole("option")
      .forEach((o) => expect(o.textContent).not.toMatch(/\$/));
  });

  it("con un solo modelo no muestra el selector", () => {
    // Elegir entre una opcion no es elegir.
    montar({
      codigo: "X1",
      nombre: "Bengala",
      modelos: [
        {
          id: "rojo",
          etiqueta: "Rojo",
          presentaciones: { unitario: { precio: 100 } },
        },
      ],
    });
    expect(screen.queryByRole("combobox", { name: /modelo/i })).toBeNull();
  });

  it("al cambiar de modelo manda ese modelo al carrito", async () => {
    const usuario = userEvent.setup();
    montar(CON_MODELOS);
    await usuario.selectOptions(selectorModelo(), "cinco");
    await usuario.click(agregar());

    expect(addToCart).toHaveBeenCalledWith(
      CON_MODELOS,
      1,
      expect.any(String),
      expect.objectContaining({ id: "cinco" }),
    );
  });

  it("el cartel nombra el modelo agregado", async () => {
    const usuario = userEvent.setup();
    montar(CON_MODELOS);
    await usuario.selectOptions(selectorModelo(), "cinco");
    await usuario.click(agregar());

    // Acotado al modal: "5 pulgadas" tambien esta en el selector.
    const cartel = screen.getByRole("dialog");
    expect(within(cartel).getByText(/5 pulgadas/)).toBeInTheDocument();
  });

  it("corrige la unidad al cambiar a un modelo que no la tiene", async () => {
    // El de 5 pulgadas tiene bulto y el de 3 no: elegir bulto y volver al de
    // 3 dejaria una unidad que ese modelo no vende.
    const usuario = userEvent.setup();
    montar(CON_MODELOS);

    await usuario.selectOptions(selectorModelo(), "cinco");
    await usuario.click(screen.getByRole("radio", { name: /Bulto/ }));
    await usuario.selectOptions(selectorModelo(), "tres");
    await usuario.click(agregar());

    expect(addToCart).toHaveBeenCalledWith(
      CON_MODELOS,
      1,
      "unitario",
      expect.objectContaining({ id: "tres" }),
    );
  });
});

describe("ItemDetails: la descripcion que repite el nombre", () => {
  /*
    Buena parte del catalogo trae la descripcion igual al nombre con un punto
    al final ("Bengala de humo" / "Bengala de humo."). Mostrarla deja el
    titulo escrito dos veces seguidas, que se lee como un error de la tienda.
  */
  it("no muestra una descripcion que solo agrega un punto", () => {
    montar({ ...SIMPLE, descripcion: "Torta 100 tiros." });
    expect(screen.queryByText("Torta 100 tiros.")).toBeNull();
  });

  it("tampoco si solo cambia por mayusculas o espacios", () => {
    montar({ ...SIMPLE, descripcion: "  TORTA 100 TIROS  " });
    expect(screen.queryByText(/^\s*TORTA 100 TIROS\s*$/)).toBeNull();
  });

  it("muestra una descripcion que SI aporta algo", () => {
    montar({ ...SIMPLE, descripcion: "Cien tiros de colores, 45 segundos." });
    expect(
      screen.getByText("Cien tiros de colores, 45 segundos."),
    ).toBeInTheDocument();
  });
});

describe("ItemDetails: el orden de los modelos", () => {
  const colores = {
    codigo: "H02",
    nombre: "Bengala de humo",
    modelos: [
      {
        id: "verde",
        etiqueta: "Verde",
        presentaciones: { unitario: { precio: 8000 } },
      },
      {
        id: "azul",
        etiqueta: "Azul",
        presentaciones: { unitario: { precio: 8000 } },
      },
      {
        id: "rojo",
        etiqueta: "Rojo",
        presentaciones: { unitario: { precio: 8000 } },
      },
    ],
  };

  it("los lista alfabeticamente, no en el orden de carga", () => {
    // El orden en que el admin los cargo no significa nada para el que
    // compra: buscar "Verde" en una lista de diez colores sin orden es
    // leerlos todos.
    montar(colores);
    const opciones = [...screen.getByLabelText(/elegí el modelo/i).options];
    expect(opciones.map((o) => o.textContent)).toEqual([
      "Azul",
      "Rojo",
      "Verde",
    ]);
  });

  it("ordena los numeros como numeros, no como texto", () => {
    // "10 pulgadas" tiene que ir despues de "2 pulgadas", no antes.
    montar({
      codigo: "M1",
      nombre: "Mortero",
      modelos: [
        {
          id: "diez",
          etiqueta: "10 pulgadas",
          presentaciones: { unitario: { precio: 1 } },
        },
        {
          id: "dos",
          etiqueta: "2 pulgadas",
          presentaciones: { unitario: { precio: 1 } },
        },
      ],
    });
    const opciones = [...screen.getByLabelText(/elegí el modelo/i).options];
    expect(opciones.map((o) => o.textContent)).toEqual([
      "2 pulgadas",
      "10 pulgadas",
    ]);
  });

  it("arranca con el primero del orden nuevo", () => {
    montar(colores);
    expect(screen.getByLabelText(/elegí el modelo/i)).toHaveValue("azul");
  });
});
