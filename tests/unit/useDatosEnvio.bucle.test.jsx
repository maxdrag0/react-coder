// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { useDatosEnvio } from "@/pages/Carrito/useDatosEnvio";

/*
  EL BUG: el efecto que prellena el formulario depende de `perfil` y escribía
  siempre un objeto nuevo en el estado. Con un padre que arma el perfil en
  cada render —que es lo que hace `usePerfil: () => ({ perfil: {...} })`— eso
  es render → efecto → render → efecto, para siempre.

  No era solo un problema de los tests: cualquier consumidor que construya el
  objeto al vuelo cuelga la página. Y el precio de colgarse acá fue caro: el
  worker de vitest se comía la memoria hasta morir, vitest quedaba esperando
  a un proceso que ya no existía, y la suite entera parecía trabada sin un
  solo test en rojo.
*/
const TOPE = 50;

describe("useDatosEnvio: no se renderiza en bucle", () => {
  it("se estabiliza aunque el perfil sea un objeto nuevo en cada render", () => {
    let renders = 0;
    const estable = { telefono: "1123456789" };

    const Sonda = () => {
      renders++;
      // Pasado el tope deja de crear objetos nuevos: sin este freno, un
      // bucle infinito tira el proceso en vez de fallar el test.
      const perfil = renders > TOPE ? estable : { telefono: "1123456789" };
      useDatosEnvio({ perfil, activo: true, guardarPerfil: vi.fn() });
      return null;
    };

    render(<Sonda />);

    expect(renders).toBeLessThan(5);
  });
});
