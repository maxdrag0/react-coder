import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { obtenerPerfil, actualizarPerfil } from "@/services/firebase/usuariosFirebase";

/**
 * El documento del comprador en Firestore, que es distinto del usuario de
 * Auth: Auth tiene el email y el displayName, y acá vive el teléfono.
 *
 * Lo usan el perfil (para editarlo) y el carrito (para saber si falta el
 * teléfono antes de mandar el pedido).
 */
export const usePerfil = () => {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!user) {
      setPerfil(null);
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      setPerfil(await obtenerPerfil(user.uid));
    } catch (error) {
      console.error("No se pudo leer el perfil:", error);
      setPerfil(null);
    } finally {
      setCargando(false);
    }
  }, [user]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /** Guarda y deja el estado local al día sin volver a leer de Firestore. */
  const guardar = useCallback(
    async (campos) => {
      if (!user) return;
      await actualizarPerfil(user.uid, campos);
      setPerfil((actual) => ({ ...(actual ?? {}), ...campos }));
    },
    [user]
  );

  return { perfil, cargando, guardar, recargar: cargar };
};
