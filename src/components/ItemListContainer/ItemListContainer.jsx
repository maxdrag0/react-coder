import "./ItemListContainer.css";

function ItemListContainer(props) {
  const { nombreUsuario } = props;
  return (
    <>
      <h1 className="bienvenida-usuario">¡Hola {nombreUsuario}!</h1>
    </>
  );
}

export default ItemListContainer;
