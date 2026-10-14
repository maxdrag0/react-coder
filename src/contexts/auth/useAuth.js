import { useContext } from "react";
import { AuthContext } from "./AuthContext.js";

/** La sesion: `{ user, isAdmin, loading, refrescarClaims }`. */
export const useAuth = () => useContext(AuthContext);
