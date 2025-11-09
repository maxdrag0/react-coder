import { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import NavBar from "./components/NavBar/NavBar";
import ItemListContainer from "./components/ItemListContainer/ItemListContainer";
import InputCambiarNombre from "./components/InputCambiarNombre/InputCambiarNombre";

function App() {
  const [carrito, setCarrito] = useState([]);
  const [nombreUsuario, setNombreUsuario] = useState("Invitado");

  return (
    <>
      <NavBar />
      <ItemListContainer nombreUsuario={nombreUsuario} />
      <InputCambiarNombre
        nombreUsuario={nombreUsuario}
        setNombreUsuario={setNombreUsuario}
      />
    </>
  );
}

export default App;
