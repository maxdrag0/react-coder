// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  leerCatalogo,
  guardarCatalogo,
  invalidarCatalogo,
} from "@/services/firebase/cacheCatalogo";

const PRODUCTOS = [{ codigo: "1", nombre: "Torta" }];

beforeEach(() => {
  sessionStorage.clear();
  invalidarCatalogo();
});

afterEach(() => vi.useRealTimers());

describe("cacheCatalogo", () => {
  it("devuelve null cuando no hay nada guardado", () => {
    expect(leerCatalogo(null)).toBeNull();
  });

  it("devuelve lo guardado", () => {
    guardarCatalogo(null, PRODUCTOS);
    expect(leerCatalogo(null)).toEqual(PRODUCTOS);
  });

  it("separa el caché por categoría", () => {
    guardarCatalogo("Tortas", PRODUCTOS);
    expect(leerCatalogo("Tortas")).toEqual(PRODUCTOS);
    expect(leerCatalogo("Petardos")).toBeNull();
  });

  it("sobrevive a recargar la página vía sessionStorage", () => {
    guardarCatalogo(null, PRODUCTOS);
    invalidarCatalogo.memoriaSolo?.();
    // Simula una pestaña nueva leyendo el almacenamiento, sin memoria previa.
    const crudo = sessionStorage.getItem("catalogo:__todas__");
    expect(JSON.parse(crudo).items).toEqual(PRODUCTOS);
  });

  it("vence después de media hora", () => {
    vi.useFakeTimers();
    guardarCatalogo(null, PRODUCTOS);
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(leerCatalogo(null)).toBeNull();
  });

  it("sigue vigente antes de media hora", () => {
    vi.useFakeTimers();
    guardarCatalogo(null, PRODUCTOS);
    vi.advanceTimersByTime(20 * 60 * 1000);
    expect(leerCatalogo(null)).toEqual(PRODUCTOS);
  });

  it("invalidar lo borra todo", () => {
    guardarCatalogo(null, PRODUCTOS);
    guardarCatalogo("Tortas", PRODUCTOS);
    invalidarCatalogo();
    expect(leerCatalogo(null)).toBeNull();
    expect(leerCatalogo("Tortas")).toBeNull();
  });

  it("ignora un caché corrupto en vez de romper", () => {
    sessionStorage.setItem("catalogo:__todas__", "no es json");
    expect(leerCatalogo(null)).toBeNull();
  });

  it("ignora un caché que no es un arreglo", () => {
    sessionStorage.setItem(
      "catalogo:__todas__",
      JSON.stringify({ items: { truco: true }, guardadoEn: Date.now() })
    );
    expect(leerCatalogo(null)).toBeNull();
  });
});
