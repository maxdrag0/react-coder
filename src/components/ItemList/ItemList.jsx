import Item from "../Item/Item";
import "./ItemList.css";

function ItemList({ items }) {
  return (
    <>
      {items.map((item) => (
        <Item key={item.id} item={item} />
      ))}
    </>
  );
}

export default ItemList;
