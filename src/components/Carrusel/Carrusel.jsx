import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DIAPOSITIVAS } from "@/constants/carrusel";
import "./Carrusel.css";

const CADA = 6000;

/**
 * Carrusel de la portada.
 *
 * No se renderiza si no hay diapositivas cargadas: una portada sin banner es
 * mejor que un hueco gris esperando una imagen.
 *
 * El avance automático se detiene en cuanto la persona toca una flecha o un
 * punto: seguir moviendo lo que alguien acaba de elegir es pelearle.
 */
const Carrusel = () => {
  const slides = DIAPOSITIVAS;
  const [actual, setActual] = useState(0);
  const [automatico, setAutomatico] = useState(true);
  const temporizador = useRef(null);

  useEffect(() => {
    if (!automatico || slides.length <= 1) return;

    temporizador.current = setInterval(
      () => setActual((i) => (i + 1) % slides.length),
      CADA
    );
    return () => clearInterval(temporizador.current);
  }, [automatico, slides.length]);

  if (slides.length === 0) return null;

  const ir = (i) => {
    setAutomatico(false);
    setActual((i + slides.length) % slides.length);
  };

  const slide = slides[actual];

  return (
    <section
      className="carrusel"
      aria-roledescription="carrusel"
      aria-label="Novedades"
    >
      <img className="carrusel-imagen" src={slide.imagen} alt={slide.titulo ?? ""} />

      {(slide.titulo || slide.texto || slide.enlace) && (
        <div className="carrusel-texto">
          {slide.titulo && <h2>{slide.titulo}</h2>}
          {slide.texto && <p>{slide.texto}</p>}
          {slide.enlace && (
            <Link to={slide.enlace} className="boton boton-primario">
              {slide.textoEnlace ?? "Ver más"}
            </Link>
          )}
        </div>
      )}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            className="carrusel-flecha izquierda"
            onClick={() => ir(actual - 1)}
            aria-label="Anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="carrusel-flecha derecha"
            onClick={() => ir(actual + 1)}
            aria-label="Siguiente"
          >
            <ChevronRight size={20} />
          </button>

          <div className="carrusel-puntos">
            {slides.map((s, i) => (
              <button
                key={s.imagen}
                type="button"
                className={`carrusel-punto ${i === actual ? "activo" : ""}`}
                onClick={() => ir(i)}
                aria-label={`Ir a la novedad ${i + 1} de ${slides.length}`}
                aria-current={i === actual}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default Carrusel;
