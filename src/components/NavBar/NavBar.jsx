import "./NavBar.css";
// import carrito from "./assets/carrito.png";
import { useState } from "react";
import CartMenu from "./CartMenu/CartMenu";
import Logo from "./Logo/Logo";
import Menu from "./Menu/Menu";

function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="container-nav">
      <Logo />

      <Menu />

      <CartMenu />
    </header>
  );
}

export default NavBar;
