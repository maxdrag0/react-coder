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

// Los IDs de Firestore no admiten /, y varios códigos del catálogo lo traen.
const idSeguro = (codigo) => String(codigo).replace(/\//g, "-");
const refDe = (codigo) => doc(db, "products", idSeguro(codigo));

export const obtenerProductos = async (categoria, lastVisible = null, pageSize = 8) => {
  try {
    const productsRef = collection(db, "products");
    let queryConstraints = [];

    if (categoria) {
      queryConstraints.push(where("category", "in", [categoria, categoria.toUpperCase()]));
    }
    
    // Default order by ID or any other field to ensure consistent pagination
    queryConstraints.push(orderBy("__name__"));
    
    if (lastVisible) {
      queryConstraints.push(startAfter(lastVisible));
    }
    
    queryConstraints.push(limit(pageSize));

    const q = query(productsRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);

    const items = querySnapshot.docs.map((doc) => ({
      codigo: doc.id,
      ...doc.data(),
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
      return { codigo: docSnap.id, ...docSnap.data() };
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
    lote.forEach((codigo) => batch.set(refDe(codigo), { estado }, { merge: true }));
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
