import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/utils/firebase";

const MB = 1024 * 1024;

// Tienen que coincidir con storage.rules. Si no coinciden, el rechazo pasa a
// ocurrir en el servidor y el usuario ve "Error al guardar el producto" sin
// ninguna pista de que el problema era el tamanio.
export const LIMITE_IMAGEN = 5 * MB;
export const LIMITE_VIDEO = 50 * MB;

const enMB = (bytes) => Math.round(bytes / MB);

/**
 * Valida el tipo y el tamanio antes de gastar la subida.
 * @param {File} file
 * @returns {string|null} mensaje de error, o null si es valido
 */
const validarArchivo = (file) => {
  const tipo = file.type ?? "";

  if (!tipo) {
    return "No pudimos detectar el tipo del archivo. Convertilo a JPG, PNG o MP4 y probá de nuevo.";
  }

  if (tipo.startsWith("image/")) {
    return file.size >= LIMITE_IMAGEN
      ? `La imagen pesa ${enMB(file.size)} MB y el máximo es ${enMB(LIMITE_IMAGEN)} MB. Comprimila o sacale resolución.`
      : null;
  }

  if (tipo.startsWith("video/")) {
    return file.size >= LIMITE_VIDEO
      ? `El video pesa ${enMB(file.size)} MB y el máximo es ${enMB(LIMITE_VIDEO)} MB.`
      : null;
  }

  return "Solo se pueden subir imágenes o videos.";
};

/**
 * Sube un archivo a Firebase Storage.
 * @param {File} file - El archivo a subir
 * @param {string} path - La carpeta destino (ej: "products")
 * @returns {Promise<string|null>} La URL de descarga, o null si no hay archivo
 * @throws {Error} con un mensaje en castellano si el archivo no es valido
 */
export const uploadFile = async (file, path = "products") => {
  if (!file) return null;

  const invalido = validarArchivo(file);
  if (invalido) throw new Error(invalido);

  const fileName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `${path}/${fileName}`);

  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

/**
 * Borra un archivo de Firebase Storage a partir de su URL.
 * @param {string} fileUrl - La URL de descarga completa
 */
export const deleteFile = async (fileUrl) => {
  if (!fileUrl) return;

  try {
    await deleteObject(ref(storage, fileUrl));
  } catch {
    // Si el archivo ya no existe, el objetivo igual esta cumplido.
  }
};
