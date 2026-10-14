// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Media from "@/components/common/Media/Media";

const VIDEO = "https://youtu.be/dQw4w9WgXcQ";
const A = "https://ejemplo.test/a.jpg";
const B = "https://ejemplo.test/b.jpg";
const C = "https://ejemplo.test/c.jpg";

const iframe = (c) => c.querySelector("iframe");
const img = (c) => c.querySelector("img");
const grande = (c) => c.querySelector(".media-galeria-grande");
const tiras = (c) => [...c.querySelectorAll(".media-tira")];

describe("Media en las cards (modo portada)", () => {
  it("NUNCA monta un iframe, aunque el producto tenga video", () => {
    // Veinte reproductores de YouTube en una grilla cargan megabytes de
    // scripts de terceros y dejan la página inutilizable.
    const { container } = render(
      <Media item={{ fotos: [A], videoUrl: VIDEO }} />,
    );
    expect(iframe(container)).toBeNull();
    expect(img(container)).toHaveAttribute("src", A);
  });

  it("muestra la primera foto de la lista", () => {
    const { container } = render(<Media item={{ fotos: [A, B, C] }} />);
    expect(img(container)).toHaveAttribute("src", A);
  });

  it("no muestra miniaturas en la card", () => {
    // La card es para mirar de reojo: elegir foto pasa en el detalle.
    const { container } = render(<Media item={{ fotos: [A, B] }} />);
    expect(tiras(container)).toHaveLength(0);
  });

  it("avisa que hay video con una marca encima de la foto", () => {
    const { container } = render(
      <Media item={{ fotos: [A], videoUrl: VIDEO }} />,
    );
    expect(container.querySelector(".media-play")).toBeInTheDocument();
  });

  it("usa la foto de un modelo si el producto no tiene propia", () => {
    const soloModelo = {
      modelos: [
        {
          id: "rojo",
          etiqueta: "Rojo",
          foto: B,
          presentaciones: { unitario: { precio: 1 } },
        },
      ],
    };
    const { container } = render(<Media item={soloModelo} />);
    expect(img(container)).toHaveAttribute("src", B);
  });

  it("usa la miniatura de YouTube si no hay ninguna foto", () => {
    const { container } = render(<Media item={{ videoUrl: VIDEO }} />);
    expect(img(container)).toHaveAttribute(
      "src",
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });

  it("cae en el placeholder sin nada", () => {
    const { container } = render(<Media item={{}} />);
    expect(img(container)).toBeNull();
    expect(container.querySelector(".media-vacio")).toBeInTheDocument();
  });

  it("lee el esquema viejo de una sola foto", () => {
    const { container } = render(<Media item={{ fotoUrl: A }} />);
    expect(img(container)).toHaveAttribute("src", A);
  });
});

describe("Media en el detalle (modo completo)", () => {
  it("monta el iframe con la url nocookie", () => {
    const { container } = render(
      <Media item={{ videoUrl: VIDEO }} titulo="Torta" modo="completo" />,
    );
    expect(iframe(container)).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });

  it("el video gana a las fotos", () => {
    const { container } = render(
      <Media item={{ fotos: [A, B], videoUrl: VIDEO }} modo="completo" />,
    );
    expect(iframe(container)).toBeInTheDocument();
  });

  it("no monta un iframe con un link que no es de YouTube", () => {
    const { container } = render(
      <Media
        item={{ fotos: [A], videoUrl: "javascript:alert(1)" }}
        modo="completo"
      />,
    );
    expect(iframe(container)).toBeNull();
    expect(grande(container)).toHaveAttribute("src", A);
  });
});

describe("Media: la galería", () => {
  it("con una sola foto no muestra miniaturas", () => {
    // Elegir entre una opción no es elegir.
    const { container } = render(
      <Media item={{ fotos: [A] }} modo="completo" />,
    );
    expect(tiras(container)).toHaveLength(0);
    expect(grande(container)).toHaveAttribute("src", A);
  });

  it("con varias muestra una miniatura por foto", () => {
    const { container } = render(
      <Media item={{ fotos: [A, B, C] }} modo="completo" />,
    );
    expect(tiras(container)).toHaveLength(3);
  });

  it("arranca mostrando la primera", () => {
    const { container } = render(
      <Media item={{ fotos: [A, B] }} modo="completo" />,
    );
    expect(grande(container)).toHaveAttribute("src", A);
  });

  it("al tocar una miniatura cambia la foto grande", async () => {
    const usuario = userEvent.setup();
    const { container } = render(
      <Media item={{ fotos: [A, B, C] }} modo="completo" />,
    );

    await usuario.click(screen.getByRole("button", { name: /foto 3 de 3/i }));

    expect(grande(container)).toHaveAttribute("src", C);
  });

  it("marca cuál miniatura está elegida", async () => {
    const usuario = userEvent.setup();
    render(<Media item={{ fotos: [A, B] }} modo="completo" />);

    await usuario.click(screen.getByRole("button", { name: /foto 2 de 2/i }));

    expect(screen.getByRole("button", { name: /foto 2 de 2/i })).toHaveClass(
      "activa",
    );
  });
});

describe("Media: fotos por modelo", () => {
  const conModelos = {
    fotos: [A],
    modelos: [
      {
        id: "rojo",
        etiqueta: "Rojo",
        foto: B,
        presentaciones: { unitario: { precio: 1 } },
      },
      {
        id: "verde",
        etiqueta: "Verde",
        presentaciones: { unitario: { precio: 1 } },
      },
    ],
  };

  it("muestra la foto del modelo elegido", () => {
    // Es el caso de las bengalas: el cliente eligio el rojo y tiene que ver
    // el rojo, no la foto generica.
    const { container } = render(
      <Media item={conModelos} modeloId="rojo" modo="completo" />,
    );
    expect(grande(container)).toHaveAttribute("src", B);
  });

  it("cae en las del producto si ese modelo no tiene foto", () => {
    const { container } = render(
      <Media item={conModelos} modeloId="verde" modo="completo" />,
    );
    expect(grande(container)).toHaveAttribute("src", A);
  });
});
