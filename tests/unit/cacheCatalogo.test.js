// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  leerCatalogo,
  guardarCatalogo,
  invalidarCatalogo,
  traerUnaVez,
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

  it("no guarda un catálogo vacío", () => {
    /*
      EL BUG QUE CUBRE: la consulta por categoría filtraba por un campo
      borrado y devolvía cero productos. Eso se guardaba en el caché, así que
      aun después de arreglar la consulta la categoría seguía viéndose vacía
      media hora más, y una recarga no alcanzaba porque el caché vive en
      sessionStorage.

      Vacío nunca es una respuesta que valga la pena recordar: o es un error
      que ya se arregló, o es una categoría sin nada, y volver a preguntar
      cuesta una lectura.
    */
    guardarCatalogo("Tortas", []);
    expect(leerCatalogo("Tortas")).toBeNull();
  });

  it("un vacío no pisa lo que ya había", () => {
    guardarCatalogo("Tortas", PRODUCTOS);
    guardarCatalogo("Tortas", []);
    expect(leerCatalogo("Tortas")).toEqual(PRODUCTOS);
  });

  it("ignora una entrada guardada con un formato anterior", () => {
    /*
      EL BUG QUE CUBRE, y ya pasó dos veces: el caché vive en sessionStorage
      y sobrevive al deploy. Cuando se arregló la consulta por categoría, la
      categoría se siguió viendo vacía media hora. Y cuando el catálogo
      empezó a entregar el id del documento, las entradas viejas siguieron
      devolviendo el código con barra, así que la Torta Minerva siguió
      cayendo en "esta página no existe" aunque el arreglo ya estuviera
      cargado — y recargar no alcanzaba.

      Una entrada sin versión es de antes de esta regla: se descarta.
    */
    sessionStorage.setItem(
      "catalogo:__todas__",
      JSON.stringify({
        items: [{ codigo: "2302/MI" }],
        guardadoEn: Date.now(),
      }),
    );
    expect(leerCatalogo(null)).toBeNull();
  });

  it("lo que guarda hoy se puede volver a leer", () => {
    // La versión no puede invalidar lo que el propio código acaba de escribir.
    guardarCatalogo(null, PRODUCTOS);
    const crudo = JSON.parse(sessionStorage.getItem("catalogo:__todas__"));
    expect(crudo.version).toBeTypeOf("number");
    expect(leerCatalogo(null)).toEqual(PRODUCTOS);
  });

  it("ignora un caché corrupto en vez de romper", () => {
    sessionStorage.setItem("catalogo:__todas__", "no es json");
    expect(leerCatalogo(null)).toBeNull();
  });

  it("ignora un caché que no es un arreglo", () => {
    sessionStorage.setItem(
      "catalogo:__todas__",
      JSON.stringify({ items: { truco: true }, guardadoEn: Date.now() }),
    );
    expect(leerCatalogo(null)).toBeNull();
  });
});

/*
  EL BUG QUE CUBRE: la portada y el pie de página se montan juntos y los dos
  piden el catálogo completo. Con el caché vacío —la primera visita— ninguno
  ve nada guardado todavía, así que salían DOS barridos del catálogo en
  paralelo y las dos escribían la misma entrada. Con 31 productos son 62
  lecturas por sesión en vez de 31; con el catálogo entero cargado, 640.
*/
describe("traerUnaVez", () => {
  const diferido = () => {
    let resolver, rechazar;
    const promesa = new Promise((res, rej) => {
      resolver = res;
      rechazar = rej;
    });
    return { promesa, resolver, rechazar };
  };

  it("dos pedidos a la vez comparten una sola consulta", async () => {
    const { promesa, resolver } = diferido();
    const traer = vi.fn(() => promesa);

    const ambos = Promise.all([
      traerUnaVez(null, traer),
      traerUnaVez(null, traer),
    ]);
    resolver(PRODUCTOS);

    expect(await ambos).toEqual([PRODUCTOS, PRODUCTOS]);
    expect(traer).toHaveBeenCalledTimes(1);
  });

  it("no mezcla categorías distintas", async () => {
    const traer = vi.fn(async (c) => [c]);
    const [todas, tortas] = await Promise.all([
      traerUnaVez(null, () => traer("todas")),
      traerUnaVez("Tortas", () => traer("Tortas")),
    ]);

    expect(todas).toEqual(["todas"]);
    expect(tortas).toEqual(["Tortas"]);
    expect(traer).toHaveBeenCalledTimes(2);
  });

  it("cuando termina, el siguiente vuelve a preguntar", async () => {
    // No es un caché: de eso se encarga guardarCatalogo. Solo evita que dos
    // pedidos simultáneos salgan dos veces.
    const traer = vi.fn(async () => PRODUCTOS);
    await traerUnaVez(null, traer);
    await traerUnaVez(null, traer);
    expect(traer).toHaveBeenCalledTimes(2);
  });

  it("el error llega a los dos y no queda pegado", async () => {
    const { promesa, rechazar } = diferido();
    const falla = vi.fn(() => promesa);

    const uno = traerUnaVez(null, falla);
    const dos = traerUnaVez(null, falla);
    rechazar(new Error("sin red"));

    await expect(uno).rejects.toThrow("sin red");
    await expect(dos).rejects.toThrow("sin red");
    expect(falla).toHaveBeenCalledTimes(1);

    // Y el que viene después puede volver a intentar.
    const ok = vi.fn(async () => PRODUCTOS);
    expect(await traerUnaVez(null, ok)).toEqual(PRODUCTOS);
    expect(ok).toHaveBeenCalledTimes(1);
  });
});
