import { useState, useCallback } from "react";

/**
 * Confirmaciones sin `window.confirm`.
 *
 * El diálogo del navegador bloquea el hilo, no se puede estilar, en celular
 * aparece pegado arriba con la URL del sitio, y algunos navegadores lo
 * suprimen si se repite. Para una acción destructiva eso es exactamente lo
 * que no se quiere.
 *
 * Devuelve una promesa que resuelve true o false, así quien llama conserva la
 * misma forma que tenía con window.confirm:
 *
 *     if (!(await pedir({ titulo, mensaje }))) return;
 */
export const useConfirmacion = () => {
  const [pedido, setPedido] = useState(null);

  const pedir = useCallback(
    (opciones) =>
      new Promise((resolver) => {
        setPedido({ ...opciones, resolver });
      }),
    []
  );

  const responder = useCallback(
    (respuesta) => {
      // Se cierra ANTES de resolver: si quien espera abre otro diálogo, el
      // nuevo no se pisa con el que se está cerrando.
      setPedido(null);
      pedido?.resolver(respuesta);
    },
    [pedido]
  );

  return {
    pedido,
    pedir,
    confirmar: () => responder(true),
    cancelar: () => responder(false),
  };
};
