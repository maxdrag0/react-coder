import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import CartProvider from "./contexts/cart/CartProvider.jsx";
import { AuthProvider } from "./contexts/auth/AuthProvider.jsx";
import { ThemeProvider } from "./contexts/theme/ThemeProvider.jsx";
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
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
