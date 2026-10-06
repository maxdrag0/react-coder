import { describe, it, expect } from "vitest";
import { idDeYoutube, urlDeEmbed, miniaturaDe } from "../../src/utils/videoEmbed";

describe("idDeYoutube", () => {
  it("saca el id del link que se copia de la barra del navegador", () => {
    expect(idDeYoutube("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("entiende el link corto de compartir", () => {
    expect(idDeYoutube("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("entiende los shorts, que es como se filma pirotecnia", () => {
    expect(idDeYoutube("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("entiende un link de embed ya armado", () => {
    expect(idDeYoutube("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("ignora la basura que YouTube agrega al compartir", () => {
    expect(idDeYoutube("https://youtu.be/dQw4w9WgXcQ?si=abc123&t=42")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(
      idDeYoutube("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&index=2")
    ).toBe("dQw4w9WgXcQ");
  });

  it("acepta el dominio de celular y sin www", () => {
    expect(idDeYoutube("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(idDeYoutube("youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("devuelve null con cualquier cosa que no sea un link de YouTube", () => {
    expect(idDeYoutube("https://vimeo.com/123456")).toBeNull();
    expect(idDeYoutube("no soy una url")).toBeNull();
    expect(idDeYoutube("https://www.youtube.com/")).toBeNull();
    expect(idDeYoutube("")).toBeNull();
    expect(idDeYoutube(null)).toBeNull();
    expect(idDeYoutube(undefined)).toBeNull();
  });

  it("no acepta un id de largo equivocado", () => {
    // Los ids de YouTube son 11 caracteres. Aflojar esto es lo que abre la
    // puerta a que entre cualquier cosa en el src del iframe.
    expect(idDeYoutube("https://youtu.be/corto")).toBeNull();
    expect(idDeYoutube("https://youtu.be/estoEsDemasiadoLargoParaSerUnId")).toBeNull();
  });
});

describe("urlDeEmbed", () => {
  it("arma la url de embed", () => {
    expect(urlDeEmbed("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    );
  });

  it("reconstruye la url desde el id y nunca reusa lo que le pasaron", () => {
    // Es la defensa que importa: lo que entra al src del iframe se arma con
    // 11 caracteres validados, no con el texto que escribió alguien.
    const sucia = 'https://youtu.be/dQw4w9WgXcQ?x="></iframe><script>alert(1)</script>';
    expect(urlDeEmbed(sucia)).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    );
  });

  it("devuelve null si no hay video", () => {
    expect(urlDeEmbed("https://vimeo.com/123456")).toBeNull();
    expect(urlDeEmbed("")).toBeNull();
  });
});

describe("miniaturaDe", () => {
  it("da la miniatura que YouTube sirve gratis", () => {
    // Sirve para la card cuando el producto tiene video pero no foto: la
    // imagen la sirve YouTube y no gasta cuota de Firebase.
    expect(miniaturaDe("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    );
  });

  it("devuelve null si no hay video", () => {
    expect(miniaturaDe("cualquier cosa")).toBeNull();
  });
});
