import { createContext, useState, useEffect } from "react";
import { precioDe } from "@/constants/unidades";

export const CartContext = createContext();

const CLAVE_GUARDADO = "carrito";

// Un mismo producto puede estar en el carrito en más de una unidad de compra
// (dos bultos y tres unidades sueltas), así que la clave combina las dos.
const claveDe = (codigo, unidad) => `${codigo}__${unidad}`;

// Lo guardado viene del navegador de alguien, que pudo editarlo, y del
// formato que tenía la app la última vez. Se valida renglón por renglón en
// vez de confiar: un carrito corrupto no puede dejar la tienda en blanco.
const esRenglonValido = (r) =>
  r &&
  typeof r.clave === "string" &&
  typeof r.codigo !== "undefined" &&
  typeof r.precioElegido === "number" &&
  r.precioElegido > 0 &&
  typeof r.cantidad === "number" &&
  r.cantidad > 0;

const leerGuardado = () => {
  try {
    const crudo = localStorage.getItem(CLAVE_GUARDADO);
    if (!crudo) return [];
    const datos = JSON.parse(crudo);
    if (!Array.isArray(datos)) return [];
    return datos.filter(esRenglonValido);
  } catch {
    // localStorage puede fallar en modo privado o con el almacenamiento
    // bloqueado. El carrito vacío es un estado válido; romper no.
    return [];
  }
};

const CartContextProvider = ({ children }) => {
  const [cartList, setCartList] = useState(leerGuardado);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(cartList));
    } catch {
      // Sin persistencia la tienda sigue andando; solo se pierde al refrescar.
    }
  }, [cartList]);

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
