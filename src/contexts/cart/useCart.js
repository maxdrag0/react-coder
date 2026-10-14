import { useContext } from "react";
import { CartContext } from "./CartContext.js";

/** El carrito: renglones, total, y las acciones para modificarlo. */
export const useCart = () => useContext(CartContext);
