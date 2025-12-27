import { createContext, useState } from "react";

export const CartContext = createContext();

const CartContextProvider = ({ children }) => {
  const [cartList, setCartList] = useState([]);
  const total = cartList.reduce(
    (acc, item) => acc + item.price * item.cantidad,
    0
  );
  const cantidadItems = cartList.reduce((acc, item) => acc + item.cantidad, 0);

  const addToCart = (item, cantidad) => {
    console.log(JSON.stringify(item));
    const yaEstaAgregado = cartList.find((i) => i.id === item.id);

    if (yaEstaAgregado) {
      const newCart = cartList.map((i) => {
        if (i.id === item.id) {
          return { ...i, cantidad: i.cantidad + cantidad };
        } else {
          return i;
        }
      });

      setCartList(newCart);
    } else {
      setCartList([...cartList, { ...item, cantidad }]);
    }

    console.log(JSON.stringify(cartList));
  };

  const removeList = () => {
    setCartList([]);
  };

  const deleteItem = (id) => {
    const listaNueva = cartList.filter((i) => i.id !== id);
    setCartList(listaNueva);
  };

  return (
    <CartContext.Provider
      value={{
        cartList,
        total,
        cantidadItems,
        addToCart,
        removeList,
        deleteItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartContextProvider;
