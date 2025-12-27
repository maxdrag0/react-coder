import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../utils/firebase";

export const obtenerProductos = async (category) => {
  try {
    const productsRef = collection(db, "products");
    let q;

    if (category) {
      q = query(productsRef, where("category", "==", category.toUpperCase()));
    } else {
      q = productsRef;
    }

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return [];
  }
};

export const obtenerProductosPorId = async (id) => {
  try {
    const docRef = doc(db, "products", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log("¡No existe el producto!");
      return null;
    }
  } catch (error) {
    console.error("Error al obtener el producto:", error);
    throw error;
  }
};

export const crearProducto = async (producto) => {
  const docRef = await addDoc(collection(db, "products"), producto);
};

export const actualizarProducto = async (producto) => {};

export const eliminarProducto = async (id) => {};
