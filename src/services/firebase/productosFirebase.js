import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  limit,
  startAfter,
  deleteDoc,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../utils/firebase";
import { enLotes } from "../../utils/enLotes";
import { idDeCodigo } from "../../constants/codigoProducto";

// La regla de que el id no admite barras vive en un solo lugar: tenerla
// escrita en cada archivo es lo que la hizo divergir.
const idSeguro = idDeCodigo;
const refDe = (codigo) => doc(db, "products", idSeguro(codigo));

export const obtenerProductos = async (
  categoria,
  lastVisible = null,
  pageSize = 8,
) => {
  try {
    const productsRef = collection(db, "products");
    let queryConstraints = [];

    /*
      `categoria`, no `category`. La unificacion de nombres borro el campo
      en ingles de los documentos y esta consulta se quedo filtrando por el:
      entrar a cualquier categoria devolvia CERO productos, y sin error a la
      vista, porque una consulta contra un campo que no existe no falla,
      devuelve vacio. Solo se salvaban las dos categorias de los productos
      que todavia conservaban el campo viejo.
    */
    if (categoria) {
      queryConstraints.push(
        where("categoria", "in", [categoria, categoria.toUpperCase()]),
      );
    }

    // Default order by ID or any other field to ensure consistent pagination
    queryConstraints.push(orderBy("__name__"));

    if (lastVisible) {
      queryConstraints.push(startAfter(lastVisible));
    }

    queryConstraints.push(limit(pageSize));

    const q = query(productsRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);

    /*
      El id del documento va DESPUES del spread, y no antes: el campo
      `codigo` de los datos puede traer una barra ("2302/MI") que no es
      valida en un id, asi que ese producto vive en el documento "2302-MI".
      Con el id primero, el campo lo pisaba y la app entera recibia la barra.

      Eso hacia desaparecer cuatro productos: la card enlaza a
      /product/${codigo}, que con la barra queda partido en dos segmentos
      contra una ruta que toma uno, y caia en "esta pagina no existe". Y si
      alguno hubiera llegado al carrito, el servidor arma la referencia con
      collection("products").doc(codigo) y con la barra eso TIRA, porque una
      ruta de documento necesita una cantidad par de segmentos: se caia el
      pedido entero, con los demas productos adentro.

      El id es la unica identidad que sirve para leer, escribir y enlazar.
    */
    const items = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      codigo: doc.id,
    }));

    const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

    return { items, lastVisibleDoc };
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return { items: [], lastVisibleDoc: null };
  }
};

export const obtenerProductosPorCodigo = async (codigo) => {
  try {
    const docSnap = await getDoc(refDe(codigo));

    if (docSnap.exists()) {
      // El id despues del spread, por lo mismo que en obtenerProductos.
      return { ...docSnap.data(), codigo: docSnap.id };
    } else {
      console.log("¡No existe el producto!");
      return null;
    }
  } catch (error) {
    console.error("Error al obtener el producto:", error);
    throw error;
  }
};

export const crearProducto = async (producto, customId = null) => {
  try {
    if (customId) {
      await setDoc(refDe(customId), producto);
    } else {
      await addDoc(collection(db, "products"), producto);
    }
  } catch (error) {
    console.error("Error al crear producto:", error);
    throw error;
  }
};

export const actualizarProducto = async (id, producto) => {
  try {
    // setDoc con merge actúa como update pero crea si no existe; updateDoc falla.
    await setDoc(refDe(id), producto, { merge: true });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    throw error;
  }
};

export const eliminarProducto = async (id) => {
  try {
    await deleteDoc(refDe(id));
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    throw error;
  }
};

/*
  Operaciones sobre varios productos a la vez. Van en batches porque hacer
  una escritura por producto son 321 round-trips y el panel queda colgado.
*/

export const actualizarEstados = async (codigos, estado) => {
  for (const lote of enLotes(codigos)) {
    const batch = writeBatch(db);
    lote.forEach((codigo) =>
      batch.set(refDe(codigo), { estado }, { merge: true }),
    );
    await batch.commit();
  }
};

export const eliminarProductos = async (codigos) => {
  for (const lote of enLotes(codigos)) {
    const batch = writeBatch(db);
    lote.forEach((codigo) => batch.delete(refDe(codigo)));
    await batch.commit();
  }
};

/*
  Cambiar el codigo de un producto NO es editar: el codigo es el id del
  documento en Firestore y Firestore no tiene renombrar. Hay que crear el
  nuevo, copiar los datos y borrar el viejo.

  Va en un batch para que set y delete sean atomicos: si fallara entre los
  dos, quedarian dos productos o ninguno.

  Lo que NO arregla, y por eso el panel avisa antes:
  - los pedidos ya hechos guardan el codigo viejo
  - un link a /product/<codigo viejo> deja de funcionar
*/
export const renombrarProducto = async (codigoViejo, codigoNuevo, producto) => {
  /*
    El mismo documento escrito de dos formas no es un renombre, es una
    edicion. "2302/MI" y "2302-MI" apuntan los dos a products/2302-MI,
    porque idSeguro cambia la barra por guion.

    Pasar de largo aca BORRA EL PRODUCTO: en el batch el delete va despues
    del set sobre el mismo ref, asi que gana el delete. Y antes de llegar
    ahi, el chequeo de ocupado se encuentra a si mismo y avisa "ya existe un
    producto con ese codigo", que es mentira.

    No es un caso raro: el panel decide renombrar comparando los textos
    crudos, asi que corregirle el codigo a uno de esos cuatro productos
    —escribirlo como el panel ahora lo muestra— entraba por aca.
  */
  if (idSeguro(codigoNuevo) === idSeguro(codigoViejo)) {
    await setDoc(refDe(codigoNuevo), producto, { merge: true });
    return;
  }

  const yaExiste = await getDoc(refDe(codigoNuevo));
  if (yaExiste.exists()) {
    const error = new Error("Ya existe un producto con ese código.");
    error.code = "codigo-ocupado";
    throw error;
  }

  try {
    const batch = writeBatch(db);
    batch.set(refDe(codigoNuevo), producto);
    batch.delete(refDe(codigoViejo));
    await batch.commit();
  } catch (error) {
    console.error("Error al cambiar el código del producto:", error);
    throw error;
  }
};
