import "bootstrap/dist/css/bootstrap.min.css";
import { Routes, Route } from "react-router-dom";
import "@/App.css";
import NavBar from "@/components/NavBar/NavBar";
import Home from "@/pages/Home/Home";
import Products from "@/pages/Products/Products";
import Carrito from "@/pages/Carrito/Carrito";
import Contact from "@/pages/Contact/Contact";
import ProductDetail from "@/pages/ProductDetails/ProductDetails";
import NotFound from "./pages/NotFound/NotFound";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Profile from "./pages/Profile/Profile";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import ProtectedRoute from "@/components/ProtectedRoute/ProtectedRoute";

function App() {
  return (
    <>
      <NavBar />
      <main className="page-container">
        <Routes>
          <Route path="" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:category" element={<Products />} />
          <Route path="/product/:codigo" element={<ProductDetail />} />
          <Route path="/carrito" element={<Carrito />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route element={<ProtectedRoute requireAdmin />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          <Route path="/*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
