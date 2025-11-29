import { NavLink } from "react-router-dom";
import logo from "./assets/lavadora.png";
import "./Logo.css";

function Logo() {
  return (
    <>
      <div className="logo-container">
        <NavLink to="/" className="logo">
          <img src={logo} alt="Vite logo" className="logo-img" />
        </NavLink>
      </div>
    </>
  );
}

export default Logo;
