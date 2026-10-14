import { describe, it, expect } from "vitest";
import { PARES, planDe } from "../../scripts/campos.mjs";

describe("planDe: lo que hay que mover", () => {
  it("copia el campo viejo al canonico cuando el canonico no esta", () => {
    const p = planDe({ name: "Torta 100 tiros" });
    expect(p.asignar).toEqual({ nombre: "Torta 100 tiros" });
    expect(p.borrar).toEqual(["name"]);
  });

  it("borra el viejo aunque el canonico ya tenga el mismo valor", () => {
    const p = planDe({ nombre: "Torta", name: "Torta" });
    expect(p.asignar).toEqual({});
    expect(p.borrar).toEqual(["name"]);
  });

  it("mueve los cuatro pares de una", () => {
    const p = planDe({
      name: "Torta",
      category: "Tortas",
      description: "Cien tiros",
      image: "https://x/f.jpg",
    });
    expect(p.asignar).toEqual({
      nombre: "Torta",
      categoria: "Tortas",
      descripcion: "Cien tiros",
      fotoUrl: "https://x/f.jpg",
    });
    expect(p.borrar.sort()).toEqual([
      "category",
      "description",
      "image",
      "name",
    ]);
  });
});

describe("planDe: lo que NO toca", () => {
  it("un documento ya limpio no genera cambios", () => {
    const p = planDe({ nombre: "Torta", categoria: "Tortas" });
    expect(p.asignar).toEqual({});
    expect(p.borrar).toEqual([]);
    expect(p.hayCambios).toBe(false);
  });

  it("NO elige cuando los dos tienen valores distintos", () => {
    /*
      Quedarse con uno en silencio pierde el otro, y no hay forma de saber
      cual es el bueno: puede que alguien haya corregido el nombre en el
      panel viejo y no en el nuevo. Eso lo decide una persona.
    */
    const p = planDe({ nombre: "Torta 100 tiros", name: "Torta cien tiros" });
    expect(p.asignar).toEqual({});
    expect(p.borrar).toEqual([]);
    expect(p.conflictos).toEqual([
      {
        campo: "nombre",
        canonico: "Torta 100 tiros",
        viejo: "Torta cien tiros",
      },
    ]);
  });

  it("un conflicto en un campo no frena a los otros", () => {
    const p = planDe({
      nombre: "Torta 100 tiros",
      name: "otro",
      category: "Tortas",
    });
    expect(p.asignar).toEqual({ categoria: "Tortas" });
    expect(p.borrar).toEqual(["category"]);
    expect(p.conflictos).toHaveLength(1);
  });

  it("un viejo vacio no pisa nada ni cuenta como conflicto", () => {
    // El panel viejo escribia "" en los campos que el admin dejaba en blanco.
    const p = planDe({ nombre: "Torta", name: "" });
    expect(p.asignar).toEqual({});
    expect(p.conflictos).toEqual([]);
    expect(p.borrar).toEqual(["name"]);
  });

  it("no inventa el canonico si el viejo esta vacio y el canonico no esta", () => {
    const p = planDe({ name: "   " });
    expect(p.asignar).toEqual({});
    expect(p.borrar).toEqual(["name"]);
  });

  it("deja en paz los campos que no son de ningun par", () => {
    const p = planDe({
      codigo: "A12",
      marca: "Punto Austral",
      estado: "activo",
    });
    expect(p.hayCambios).toBe(false);
  });
});

describe("PARES", () => {
  it("son los cuatro que el panel viejo escribia en ingles", () => {
    expect(PARES).toEqual([
      ["nombre", "name"],
      ["categoria", "category"],
      ["descripcion", "description"],
      ["fotoUrl", "image"],
    ]);
  });
});
