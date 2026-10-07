import { addDoc, collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { db } from "../../utils/firebase";

export const crearContacto = async (contacto) => {
  try {
    const docRef = await addDoc(collection(db, "mensajes"), {
      ...contacto,
      date: new Date().toISOString(),
      leido: false
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al enviar el mensaje:", error);
    throw error;
  }
};

export const obtenerMensajes = async () => {
  try {
    const q = query(collection(db, "mensajes"), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error al obtener los mensajes:", error);
    return [];
  }
};

export const marcarMensajeComoLeido = async (id, estadoLeido = true) => {
  try {
    const docRef = doc(db, "mensajes", id);
    await updateDoc(docRef, { leido: estadoLeido });
  } catch (error) {
    console.error("Error al actualizar el mensaje:", error);
    throw error;
  }
};

export const eliminarMensaje = async (id) => {
  try {
    await deleteDoc(doc(db, "mensajes", id));
  } catch (error) {
    console.error("Error al eliminar el mensaje:", error);
    throw error;
  }
};

/**
 * Campos libres del mensaje (hoy: `nota`). Las reglas dejan que el admin
 * actualice sin enumerar campos, asi que no hace falta tocarlas.
 */
export const actualizarMensaje = async (id, campos) => {
  try {
    await updateDoc(doc(db, "mensajes", id), campos);
  } catch (error) {
    console.error("Error al actualizar el mensaje:", error);
    throw error;
  }
};
