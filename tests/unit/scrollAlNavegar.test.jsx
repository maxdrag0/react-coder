// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import ScrollArriba from "@/components/ScrollArriba/ScrollArriba";

/*
  EL BUG: entrar a un producto desde el catálogo caía al final de la página.
  React Router no toca el scroll al navegar, así que el navegador se queda
  donde estaba: si venís de bajar el listado, la ficha —que es más corta—
  abre mostrando el pie y hay que subir a mano para verla.
*/
const Pagina = ({ nombre }) => {
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();

  return (
    <div>
      <h1>{nombre}</h1>
      <Link to="/producto">Ir al producto</Link>
      <button type="button" onClick={() => navigate(-1)}>
        Volver
      </button>
      <button type="button" onClick={() => setParams({ q: "torta" })}>
        Buscar
      </button>
    </div>
  );
};

const montar = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <ScrollArriba />
      <Routes>
        <Route path="/" element={<Pagina nombre="Catálogo" />} />
        <Route path="/producto" element={<Pagina nombre="Producto" />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  window.scrollTo = vi.fn();
});

describe("ScrollArriba", () => {
  it("sube al entrar a otra página", async () => {
    const usuario = userEvent.setup();
    montar();
    window.scrollTo.mockClear();

    await usuario.click(screen.getByRole("link", { name: /ir al producto/i }));

    expect(screen.getByRole("heading", { name: "Producto" })).toBeTruthy();
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it("NO sube cuando solo cambia la búsqueda", async () => {
    // El buscador del catálogo escribe ?search= en cada tecla. Subir ahí
    // sacaría de la vista lo que la persona está mirando.
    const usuario = userEvent.setup();
    montar();
    window.scrollTo.mockClear();

    await usuario.click(screen.getByRole("button", { name: /buscar/i }));

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("NO sube con el botón de atrás", async () => {
    // Volver al listado tiene que volver a donde estabas, que es lo que el
    // navegador ya hace solo.
    const usuario = userEvent.setup();
    montar();
    await usuario.click(screen.getByRole("link", { name: /ir al producto/i }));
    window.scrollTo.mockClear();

    await usuario.click(screen.getByRole("button", { name: /volver/i }));

    expect(screen.getByRole("heading", { name: "Catálogo" })).toBeTruthy();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});

describe("App: la tienda lo usa", () => {
  it("está montado en App, adentro del router", async () => {
    const fuente = await import("node:fs").then((fs) =>
      fs.readFileSync("src/App.jsx", "utf8"),
    );
    expect(fuente).toContain("<ScrollArriba />");
  });
});
