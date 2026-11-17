import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/*
  Sube al principio al entrar a otra página.

  React Router no toca el scroll cuando cambia de ruta, y el navegador se
  queda donde estaba: entrar a un producto después de bajar el catálogo abría
  la ficha mostrando el pie, y había que subir a mano para ver el producto.
  Con la ficha más corta que el listado es peor, porque el navegador no
  puede ni mantener la posición.

  DOS CASOS EN LOS QUE NO SUBE:

  - El botón de atrás (`POP`): ahí la persona espera volver a donde estaba en
    el listado, y eso el navegador ya lo hace solo.
  - Cuando solo cambia la query string. El buscador del catálogo escribe
    ?search= en cada tecla; subir ahí sacaría de la vista justo lo que se
    está mirando. Por eso el efecto depende de `pathname` y no de la
    ubicación entera.
*/
const ScrollArriba = () => {
  const { pathname } = useLocation();
  const tipo = useNavigationType();
  const anterior = useRef(pathname);

  useEffect(() => {
    /*
      Compara el pathname contra el anterior en vez de confiar en que el
      efecto corre solo al navegar: el tipo de navegación también cambia
      —de POP a PUSH la primera vez que el buscador escribe ?search=— y eso
      volvía a disparar el efecto sin que la página hubiera cambiado.
    */
    if (pathname === anterior.current) return;
    anterior.current = pathname;

    if (tipo === "POP") return;

    try {
      // Instantáneo: html lleva scroll-behavior: smooth, así que sin esto
      // la página nueva se ve viajar hasta arriba.
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch {
      // Safari viejo no conoce "instant" y tira al convertir el diccionario.
      // Con la animación del CSS igual sube, que es lo que importa.
      window.scrollTo(0, 0);
    }
  }, [pathname, tipo]);

  return null;
};

export default ScrollArriba;
