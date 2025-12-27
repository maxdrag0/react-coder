import { addDoc, collection } from "firebase/firestore";
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
