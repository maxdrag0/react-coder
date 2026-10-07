import { addDoc, collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";

export const crearCompra = async (compra) => {
  try {
    const docRef = await addDoc(collection(db, "compras"), compra);

    return docRef.id;
  } catch (error) {
    console.error("Error al crear la compra:", error);
    throw error;
  }
};

export const obtenerTodasLasCompras = async () => {
  try {
    const q = query(collection(db, "compras"), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const compras = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return compras;
  } catch (error) {
    console.error("Error al obtener las compras:", error);
    return [];
  }
};

/**
 * Estado y nota de un pedido, desde el panel.
 *
 * `merge` no hace falta: updateDoc solo toca los campos que recibe, asi que
 * el pedido (buyer, items, total, date) queda intacto. Eso importa: un
 * pedido es un registro de lo que se acordo y no se reescribe.
 */
export const actualizarCompra = async (id, campos) => {
  try {
    await updateDoc(doc(db, "compras", id), campos);
  } catch (error) {
    console.error("Error al actualizar la compra:", error);
    throw error;
  }
};
