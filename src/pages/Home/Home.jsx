import "./Home.css";
import ItemListContainer from "../../components/ItemListContainer/ItemListContainer";
import InputCambiarNombre from "../../components/InputCambiarNombre/InputCambiarNombre";

function Home({ nombreUsuario, setNombreUsuario }) {
  return (
    <>
      <div className="container">
        <ItemListContainer nombreUsuario={nombreUsuario} />
        <InputCambiarNombre
          nombreUsuario={nombreUsuario}
          setNombreUsuario={setNombreUsuario}
        />
      </div>
    </>
  );
}

export default Home;
