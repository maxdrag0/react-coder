import { createRoot } from "react-dom/client";
import "./main.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import CartContextProvider from "./contexts/cart/CartContext.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter basename="/react-coder">
    <CartContextProvider>
      <App />
    </CartContextProvider>
  </BrowserRouter>
);
