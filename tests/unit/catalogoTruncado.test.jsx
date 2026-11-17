// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  invalidarCatalogo,
  leerCatalogo,
} from "@/services/firebase/cacheCatalogo";

/*
  EL BUG: si el barrido del catálogo se corta a mitad —se cae la red, se
  agota la cuota diaria— obtenerProductos devolvía una página vacía
  indistinguible del final del catálogo. El bucle cortaba con lo que tenía y
  lo guardaba en el caché media hora, sin un error a la vista.

  Y desde que el filtro de categorías se deriva del catálogo cargado, eso no
  muestra una lista corta: BORRA categorías enteras del panel, en toda la
  tienda, porque el caché es uno solo.
*/
const PAGINA_UNO = Array.from({ length: 100 }, (_, i) => ({
  codigo: `${i}`,
  nombre: `Producto ${i}`,
  categoria: "Tortas",
}));

const obtenerProductos = vi.fn();

vi.mock("@/services/index.js", () => ({
  services: { firebase: { obtenerProductos: (...a) => obtenerProductos(...a) } },
}));

const { useProducts } = await import("@/hooks/useProducts");

beforeEach(() => {
  sessionStorage.clear();
  invalidarCatalogo();
  obtenerProductos.mockReset();
});

describe("useProducts: un catálogo cortado a mitad", () => {
  const seCorta = () => {
    obtenerProductos
      .mockResolvedValueOnce({ items: PAGINA_UNO, lastVisibleDoc: { id: "99" } })
      .mockResolvedValueOnce({ items: [], lastVisibleDoc: null, fallo: true });
  };

  it("no lo guarda en el caché", async () => {
    seCorta();
    const { result } = renderHook(() =>
      useProducts(undefined, { traerTodo: true }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(leerCatalogo(null)).toBeNull();
  });

  it("avisa que falló en vez de quedarse callado", async () => {
    seCorta();
    const { result } = renderHook(() =>
      useProducts(undefined, { traerTodo: true }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
  });

  it("vuelve a intentar en la navegación siguiente", async () => {
    // Si se hubiera cacheado, el reintento ni saldría: el caché vive media
    // hora y recargar no alcanza.
    seCorta();
    const primero = renderHook(() =>
      useProducts(undefined, { traerTodo: true }),
    );
    await waitFor(() => expect(primero.result.current.loading).toBe(false));

    obtenerProductos.mockReset().mockResolvedValue({
      items: PAGINA_UNO,
      lastVisibleDoc: null,
    });

    const segundo = renderHook(() =>
      useProducts(undefined, { traerTodo: true }),
    );
    await waitFor(() =>
      expect(segundo.result.current.items).toHaveLength(100),
    );
    expect(segundo.result.current.error).toBeNull();
  });

  it("el catálogo completo sí se guarda", async () => {
    obtenerProductos.mockResolvedValue({
      items: PAGINA_UNO,
      lastVisibleDoc: null,
    });
    const { result } = renderHook(() =>
      useProducts(undefined, { traerTodo: true }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(leerCatalogo(null)).toHaveLength(100);
  });
});
