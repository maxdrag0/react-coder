import { createContext, useState } from "react";
import { precioDe } from "@/constants/unidades";

export const CartContext = createContext();

// Un mismo producto puede estar en el carrito en más de una unidad de compra
// (dos bultos y tres unidades sueltas), así que la clave combina las dos.
const claveDe = (codigo, unidad) => `${codigo}__${unidad}`;

const CartContextProvider = ({ children }) => {
  const [cartList, setCartList] = useState([]);

  const total = cartList.reduce(
    (acc, item) => acc + (item.precioElegido || 0) * item.cantidad,
    0
  );

  const cantidadItems = cartList.reduce((acc, item) => acc + item.cantidad, 0);

  const addToCart = (item, cantidad, unidad = "unitario") => {
    const clave = claveDe(item.codigo, unidad);
    const precioElegido = precioDe(item, unidad) ?? 0;

    setCartList((actual) => {
      const existente = actual.find((i) => i.clave === clave);

      if (existente) {
        return actual.map((i) =>
          i.clave === clave ? { ...i, cantidad: i.cantidad + cantidad } : i
        );
      }

      return [...actual, { ...item, clave, unidad, precioElegido, cantidad }];
    });
  };

  const updateQuantity = (clave, cantidad) => {
    if (cantidad <= 0) return;
    setCartList((actual) =>
      actual.map((i) => (i.clave === clave ? { ...i, cantidad } : i))
    );
  };

  const removeList = () => setCartList([]);

  const deleteItem = (clave) =>
    setCartList((actual) => actual.filter((i) => i.clave !== clave));

  return (
    <CartContext.Provider
      value={{
        cartList,
        total,
        cantidadItems,
        addToCart,
        updateQuantity,
        removeList,
        deleteItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartContextProvider;
