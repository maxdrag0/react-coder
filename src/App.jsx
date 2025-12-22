import "bootstrap/dist/css/bootstrap.min.css";
import { Routes, Route } from "react-router-dom";
import "@/App.css";
import NavBar from "@/components/NavBar/NavBar";
import Home from "@/pages/Home/Home";
import Products from "@/pages/Products/Products";
import Carrito from "@/pages/Carrito/Carrito";
import Contact from "@/pages/Contact/Contact";
import ProductDetail from "@/pages/ProductDetails/ProductDetails";

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:category" element={<Products />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/contact" element={<Contact />} />
        {/* <Route path="/about" element={<About />} />
         useParams en product detail
        <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </>
  );
}

export default App;
