import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import CartContextProvider from "./contexts/cart/CartContext.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import "./main.css";

// Derivado del base de Vite y no escrito a mano: si los dos no coinciden, el
// router no encuentra ninguna ruta y la pagina queda en blanco.
// BASE_URL siempre termina en /, y el router lo quiere sin la barra final.
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={BASENAME}>
      <ThemeProvider>
        <AuthProvider>
          <CartContextProvider>
            <App />
          </CartContextProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
