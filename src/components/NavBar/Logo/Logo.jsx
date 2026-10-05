import { NavLink } from "react-router-dom";
import logo from "./assets/lavadora.png";
import "./Logo.css";

function Logo() {
  return (
    <NavLink to="/" className="nav-logo" aria-label="Inicio">
      <img src={logo} alt="Pirotecnia" />
    </NavLink>
  );
}

export default Logo;
