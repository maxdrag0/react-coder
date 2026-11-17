import { describe, it, expect } from "vitest";
import {
  soloDigitos,
  esTelefonoValido,
  errorDeTelefono,
  paraWhatsapp,
} from "../../src/utils/telefono";

describe("soloDigitos", () => {
  it("limpia los formatos con los que la gente escribe su número", () => {
    expect(soloDigitos("11 2345-6789")).toBe("1123456789");
    expect(soloDigitos("(011) 2345 6789")).toBe("01123456789");
    expect(soloDigitos("+54 9 11 2345-6789")).toBe("5491123456789");
  });

  it("no explota con nada", () => {
    expect(soloDigitos("")).toBe("");
    expect(soloDigitos(null)).toBe("");
    expect(soloDigitos(undefined)).toBe("");
  });
});

describe("esTelefonoValido", () => {
  // La validación es suelta a propósito: rechazar un número válido es peor
  // que aceptar uno raro, porque el dueño lo va a mirar igual antes de
  // llamar. Solo frena lo que no puede ser un teléfono.
  it("acepta un celular argentino escrito de varias formas", () => {
    expect(esTelefonoValido("1123456789")).toBe(true);
    expect(esTelefonoValido("11 2345-6789")).toBe(true);
    expect(esTelefonoValido("+54 9 11 2345 6789")).toBe(true);
    expect(esTelefonoValido("0351 155 123456")).toBe(true);
  });

  it("acepta un fijo del interior, que es más corto", () => {
    expect(esTelefonoValido("2954 123456")).toBe(true);
    expect(esTelefonoValido("35112345")).toBe(true);
  });

  it("rechaza lo que no alcanza a ser un teléfono", () => {
    expect(esTelefonoValido("1234567")).toBe(false);
    expect(esTelefonoValido("123")).toBe(false);
    expect(esTelefonoValido("")).toBe(false);
    expect(esTelefonoValido(null)).toBe(false);
  });

  it("rechaza algo tan largo que es un error de tipeo", () => {
    expect(esTelefonoValido("1234567890123456")).toBe(false);
  });

  it("rechaza texto sin dígitos suficientes", () => {
    expect(esTelefonoValido("llamame al celu")).toBe(false);
    expect(esTelefonoValido("no tengo")).toBe(false);
  });
});

describe("errorDeTelefono", () => {
  it("no dice nada si está bien", () => {
    expect(errorDeTelefono("11 2345-6789")).toBeNull();
  });

  it("pide el número cuando está vacío, en vez de decir que es inválido", () => {
    expect(errorDeTelefono("")).toMatch(/necesitamos|ingres/i);
  });

  it("explica qué pasa cuando es corto, sin hablar de dígitos mínimos", () => {
    const mensaje = errorDeTelefono("123");
    expect(mensaje).not.toBeNull();
    expect(mensaje).toMatch(/completo|c[oó]digo de [aá]rea/i);
  });
});

describe("paraWhatsapp", () => {
  // El dueño contacta por WhatsApp, así que el panel va a linkear directo.
  it("arma el número con el código de país", () => {
    expect(paraWhatsapp("11 2345-6789")).toBe("5491123456789");
  });

  it("no duplica el 54 si ya lo trae", () => {
    expect(paraWhatsapp("+54 9 11 2345 6789")).toBe("5491123456789");
    expect(paraWhatsapp("5491123456789")).toBe("5491123456789");
  });

  it("saca el 0 del código de área y el 15 del celular, que WhatsApp no usa", () => {
    expect(paraWhatsapp("011 15 2345 6789")).toBe("5491123456789");
    expect(paraWhatsapp("0351 15 5123456")).toBe("5493515123456");
  });

  it("devuelve null si el número no sirve", () => {
    expect(paraWhatsapp("123")).toBeNull();
    expect(paraWhatsapp("")).toBeNull();
  });
});

/*
  EL BUG QUE CUBRE: alguien cargó "9 11 2233 4455" —que es como se escribe un
  celular argentino para el exterior, sin el 54— y el link de WhatsApp daba
  error. paraWhatsapp anteponía 549 sin fijarse en el 9 que ya estaba:
  549 + 91122334455 = 54991122334455, con el nueve repetido.
*/
describe("paraWhatsapp: las formas en las que la gente escribe un celular", () => {
  const ESPERADO = "5491122334455";

  it("el número local pelado", () => {
    expect(paraWhatsapp("1122334455")).toBe(ESPERADO);
  });

  it("con el 9 adelante, sin el 54", () => {
    expect(paraWhatsapp("9 11 2233-4455")).toBe(ESPERADO);
  });

  it("con 54 y sin el 9", () => {
    expect(paraWhatsapp("54 11 2233 4455")).toBe(ESPERADO);
  });

  it("con 54 y 9, que es la forma completa", () => {
    expect(paraWhatsapp("+54 9 11 2233-4455")).toBe(ESPERADO);
  });

  it("con el 0 del área y el 15 del abonado", () => {
    expect(paraWhatsapp("011 15 2233-4455")).toBe(ESPERADO);
  });

  it("un área de tres dígitos", () => {
    expect(paraWhatsapp("351 456 7890")).toBe("5493514567890");
  });

  it("siempre termina en 549 y diez dígitos más", () => {
    for (const escrito of [
      "1122334455",
      "9 11 2233-4455",
      "+54 9 11 2233 4455",
      "011 15 2233-4455",
    ]) {
      const salida = paraWhatsapp(escrito);
      expect(salida).toHaveLength(13);
      expect(salida.startsWith("549")).toBe(true);
    }
  });

  it("devuelve null cuando no alcanza para un número argentino", () => {
    // Mejor sin link que con un link que lleva a un chat que no existe.
    expect(paraWhatsapp("1234")).toBeNull();
    expect(paraWhatsapp("")).toBeNull();
  });
});

describe("errorDeTelefono: lo que no sirve para WhatsApp no entra", () => {
  it("acepta lo que se puede convertir", () => {
    for (const bueno of [
      "1122334455",
      "9 11 2233-4455",
      "+54 9 11 2233 4455",
      "011 15 2233-4455",
      "351 456 7890",
    ]) {
      expect(errorDeTelefono(bueno)).toBeNull();
    }
  });

  it("explica cómo escribirlo cuando no se puede", () => {
    // El teléfono es por donde se atiende el pedido: si no sirve para
    // WhatsApp, el pedido no se puede coordinar.
    const error = errorDeTelefono("12345678901234");
    expect(error).toBeTruthy();
    expect(error).toMatch(/c[oó]digo de [aá]rea/i);
  });
});
