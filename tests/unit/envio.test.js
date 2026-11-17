import { describe, it, expect } from "vitest";
import {
  limpiarTexto,
  errorDeDireccion,
  errorDeCiudad,
  faltaEnvio,
} from "@/utils/envio";

describe("limpiarTexto", () => {
  it("saca los espacios de los bordes y junta los del medio", () => {
    expect(limpiarTexto("  San Martín   742  ")).toBe("San Martín 742");
  });

  it("con nada devuelve cadena vacía", () => {
    expect(limpiarTexto(undefined)).toBe("");
    expect(limpiarTexto(null)).toBe("");
  });
});

describe("errorDeDireccion", () => {
  it("acepta una dirección normal", () => {
    expect(errorDeDireccion("San Martín 742")).toBeNull();
  });

  it("acepta una dirección rural, sin número de puerta", () => {
    // "Ruta 5 km 12" es una dirección de verdad en el interior. Exigir
    // altura rechazaría a los clientes que más lejos viven.
    expect(errorDeDireccion("Ruta 5 km 12, entre los silos")).toBeNull();
  });

  it("acepta piso y departamento", () => {
    expect(errorDeDireccion("Av. Rivadavia 1234 piso 3 depto B")).toBeNull();
  });

  it("pide la dirección cuando está vacía", () => {
    expect(errorDeDireccion("")).toMatch(/direcci[oó]n/i);
    expect(errorDeDireccion("   ")).toMatch(/direcci[oó]n/i);
  });

  it("rechaza algo demasiado corto para ser una dirección", () => {
    expect(errorDeDireccion("S/N")).toBeTruthy();
  });

  it("rechaza lo que no tiene ni una letra", () => {
    // Un número solo no sirve para llegar a ninguna parte.
    expect(errorDeDireccion("1234567")).toBeTruthy();
  });

  it("rechaza un texto larguísimo", () => {
    expect(errorDeDireccion("a".repeat(200))).toBeTruthy();
  });
});

describe("errorDeCiudad", () => {
  it("acepta una ciudad", () => {
    expect(errorDeCiudad("Villa María")).toBeNull();
  });

  it("acepta un nombre corto", () => {
    // Hay pueblos de dos letras y no es asunto nuestro discutirlos.
    expect(errorDeCiudad("Oro")).toBeNull();
  });

  it("pide la ciudad cuando está vacía", () => {
    expect(errorDeCiudad("")).toMatch(/ciudad|localidad/i);
  });

  it("rechaza lo que no tiene ni una letra", () => {
    expect(errorDeCiudad("1234")).toBeTruthy();
  });

  it("rechaza un texto larguísimo", () => {
    expect(errorDeCiudad("a".repeat(100))).toBeTruthy();
  });
});

describe("faltaEnvio", () => {
  it("dice que no falta nada cuando el perfil tiene las dos cosas", () => {
    expect(faltaEnvio({ direccion: "San Martín 742", ciudad: "Córdoba" })).toBe(
      false,
    );
  });

  it("falta si no hay perfil todavía", () => {
    expect(faltaEnvio(null)).toBe(true);
  });

  it("falta si tiene la dirección pero no la ciudad", () => {
    expect(faltaEnvio({ direccion: "San Martín 742" })).toBe(true);
  });

  it("falta si lo guardado no sirve", () => {
    // Un perfil viejo con la dirección en blanco no cuenta como cargada.
    expect(faltaEnvio({ direccion: "  ", ciudad: "Córdoba" })).toBe(true);
  });
});
