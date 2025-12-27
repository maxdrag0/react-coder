import { addDoc, collection } from "firebase/firestore";
import { db } from "../../utils/firebase";

export const crearContacto = async (contacto) => {
  try {
    const docRef = await addDoc(collection(db, "mensajes"), {
      ...contacto,
      date: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al enviar el mensaje:", error);
    throw error;
  }
};
