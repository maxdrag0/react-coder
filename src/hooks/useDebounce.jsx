import { useEffect, useState } from "react";

/**
 * Devuelve el valor recién cuando dejó de cambiar durante `espera` ms.
 * Sirve para que escribir en el buscador no dispare una navegación por tecla.
 */
export const useDebounce = (valor, espera = 250) => {
  const [retrasado, setRetrasado] = useState(valor);

  useEffect(() => {
    const id = setTimeout(() => setRetrasado(valor), espera);
    return () => clearTimeout(id);
  }, [valor, espera]);

  return retrasado;
};
