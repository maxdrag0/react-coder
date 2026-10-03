import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/utils/firebase";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // El permiso de admin vive en un custom claim firmado por Google, no en un
  // documento de Firestore que el propio usuario podria escribir.
  const leerClaims = useCallback(async (usuario, forzarRefresh = false) => {
    if (!usuario) return false;
    try {
      const token = await usuario.getIdTokenResult(forzarRefresh);
      return token.claims.admin === true;
    } catch {
      // Nunca dejar la app colgada por un fallo de red: degradar a comprador.
      console.error("No se pudieron leer los claims del token");
      return false;
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (usuarioActual) => {
      setUser(usuarioActual);
      setIsAdmin(await leerClaims(usuarioActual));
      setLoading(false);
    });
  }, [leerClaims]);

  // Tras asignar el claim con scripts/set-admin.mjs, el token en mano sigue
  // sin incluirlo hasta una hora. Esto lo fuerza sin cerrar sesion.
  const refrescarClaims = useCallback(async () => {
    setIsAdmin(await leerClaims(auth.currentUser, true));
  }, [leerClaims]);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, refrescarClaims }}>
      {children}
    </AuthContext.Provider>
  );
};
