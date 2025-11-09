import "./ItemListContainer.css";

function ItemListContainer(props) {
  const { msjBienvenida } = props;
  return (
    <>
      <h1 className="bienvenida-usuario">{msjBienvenida}</h1>
    </>
  );
}

export default ItemListContainer;
