import "./ItemListContainer.css";
import ItemList from "../ItemList/ItemList";

function ItemListContainer({ items }) {
  return (
    <>
      <h1 className="bienvenida-usuario">Hola!</h1>
      {items ? (
        <div className="items-listado">
          <ItemList items={items} />
        </div>
      ) : (
        <p>Cargando items...</p>
      )}
    </>
  );
}

export default ItemListContainer;
