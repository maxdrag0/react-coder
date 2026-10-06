// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Media from "@/components/common/Media/Media";

const VIDEO = "https://youtu.be/dQw4w9WgXcQ";
const FOTO = "https://ejemplo.test/foto.jpg";

const iframe = (c) => c.querySelector("iframe");
const img = (c) => c.querySelector("img");

describe("Media en las cards (modo portada)", () => {
  it("NUNCA monta un iframe, aunque el producto tenga video", () => {
    // Veinte reproductores de YouTube en una grilla cargan megabytes de
    // scripts de terceros y dejan la página inutilizable. Si esto se rompe,
    // el catálogo se vuelve lentísimo sin que nadie lo note en code review.
    const { container } = render(<Media foto={FOTO} video={VIDEO} />);
    expect(iframe(container)).toBeNull();
    expect(img(container)).toHaveAttribute("src", FOTO);
  });

  it("avisa que hay video con una marca encima de la foto", () => {
    const { container } = render(<Media foto={FOTO} video={VIDEO} />);
    expect(container.querySelector(".media-play")).toBeInTheDocument();
  });

  it("no pone la marca de play si no hay video", () => {
    const { container } = render(<Media foto={FOTO} />);
    expect(container.querySelector(".media-play")).toBeNull();
  });

  it("usa la miniatura de YouTube cuando hay video pero no foto", () => {
    // La sirve YouTube, así que no gasta cuota de Firebase.
    const { container } = render(<Media video={VIDEO} />);
    expect(img(container)).toHaveAttribute(
      "src",
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    );
  });

  it("cae en el placeholder sin foto ni video", () => {
    const { container } = render(<Media />);
    expect(img(container)).toBeNull();
    expect(container.querySelector(".media-vacio")).toBeInTheDocument();
  });

  it("ignora un link que no es de YouTube en vez de mostrar un play falso", () => {
    const { container } = render(<Media foto={FOTO} video="https://vimeo.com/1" />);
    expect(container.querySelector(".media-play")).toBeNull();
    expect(img(container)).toHaveAttribute("src", FOTO);
  });
});

describe("Media en el detalle (modo completo)", () => {
  it("monta el iframe con la url nocookie", () => {
    const { container } = render(
      <Media foto={FOTO} video={VIDEO} titulo="Torta 100 tiros" modo="completo" />
    );
    expect(iframe(container)).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    );
  });

  it("le pone al iframe un título que nombra el producto", () => {
    render(<Media video={VIDEO} titulo="Torta 100 tiros" modo="completo" />);
    expect(screen.getByTitle("Video de Torta 100 tiros")).toBeInTheDocument();
  });

  it("muestra la foto si no hay video", () => {
    const { container } = render(<Media foto={FOTO} modo="completo" />);
    expect(iframe(container)).toBeNull();
    expect(img(container)).toHaveAttribute("src", FOTO);
  });

  it("no monta un iframe con un link que no es de YouTube", () => {
    const { container } = render(
      <Media foto={FOTO} video="javascript:alert(1)" modo="completo" />
    );
    expect(iframe(container)).toBeNull();
  });
});
