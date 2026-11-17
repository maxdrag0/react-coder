// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { invalidarCatalogo } from "@/services/firebase/cacheCatalogo";

/*
  EL BUG: la portada y el pie de página se montan en el mismo render y los
  dos piden el catálogo completo. El caché se escribe cuando la consulta
  TERMINA, así que en la primera visita ninguno veía nada y salían las dos:
  el doble de lecturas de Firestore por sesión.
*/
const CATALOGO = [
  { codigo: "1", nombre: "Torta", categoria: "Tortas" },
  { codigo: "2", nombre: "Bengala", categoria: "Bengalas" },
];

const obtenerProductos = vi.fn(async () => ({
  items: CATALOGO,
  lastVisibleDoc: null,
}));

vi.mock("@/services/index.js", () => ({
  services: {
    firebase: { obtenerProductos: (...a) => obtenerProductos(...a) },
  },
}));

const { useProducts } = await import("@/hooks/useProducts");

beforeEach(() => {
  sessionStorage.clear();
  invalidarCatalogo();
  obtenerProductos.mockClear();
});

describe("useProducts: una sola vuelta al catálogo", () => {
  it("dos consumidores montados a la vez hacen una sola consulta", async () => {
    const uno = renderHook(() => useProducts(undefined, { traerTodo: true }));
    const dos = renderHook(() => useProducts(undefined, { traerTodo: true }));

    await waitFor(() => expect(uno.result.current.loading).toBe(false));
    await waitFor(() => expect(dos.result.current.loading).toBe(false));

    expect(obtenerProductos).toHaveBeenCalledTimes(1);
    expect(uno.result.current.items).toEqual(CATALOGO);
    expect(dos.result.current.items).toEqual(CATALOGO);
  });

  it("el segundo que llega después lee del caché y no consulta", async () => {
    const uno = renderHook(() => useProducts(undefined, { traerTodo: true }));
    await waitFor(() => expect(uno.result.current.loading).toBe(false));

    const dos = renderHook(() => useProducts(undefined, { traerTodo: true }));
    await waitFor(() => expect(dos.result.current.items).toEqual(CATALOGO));

    expect(obtenerProductos).toHaveBeenCalledTimes(1);
  });
});
