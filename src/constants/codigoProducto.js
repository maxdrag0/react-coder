/*
  El codigo de un producto y el id de su documento.

  No son lo mismo y por eso esto existe. El proveedor escribe codigos con
  barra ("2302/MI"), y una barra no es valida en un id de Firestore: ahi la
  ruta se parte en segmentos, y "products/2302/MI" son tres, que no es un
  documento. Asi que ese producto vive en el documento "2302-MI".

  La app trabaja SIEMPRE con el id. El campo `codigo` del documento todavia
  conserva la barra en los cuatro productos que la tienen, pero nadie lo usa
  para identificar: ni para leer, ni para escribir, ni para enlazar.

  LO QUE PASO CUANDO NO ESTABA ESTA REGLA EN UN SOLO LUGAR: cada archivo se
  hacia su propia version. La card enlazaba con el codigo crudo y la URL
  quedaba partida en dos; el servidor armaba la referencia con el codigo
  crudo y tiraba una excepcion que volteaba el pedido entero; y renombrar
  entre dos escrituras del mismo documento borraba el producto.
*/

/**
 * El id del documento para un codigo de producto.
 *
 * Idempotente: pasarle un id ya hecho devuelve el mismo id, asi que se puede
 * aplicar sin saber de donde viene el valor.
 *
 * @param {string} codigo
 * @returns {string}
 */
export const idDeCodigo = (codigo) =>
  String(codigo ?? "")
    .trim()
    .replace(/\//g, "-");

/** Dos codigos que nombran al mismo documento. */
export const mismoDocumento = (a, b) => idDeCodigo(a) === idDeCodigo(b);
