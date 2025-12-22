import { PuffLoader } from "react-spinners";
import ItemListContainer from "../../components/ItemListContainer/ItemListContainer";
import { useProducts } from "../../hooks/useProducts";
import "./Products.css";
import { useParams } from "react-router-dom";

function Products() {
  const { category } = useParams();

  const { items, loading } = useProducts(category);

  return (
    <div className="product-container">
      {loading ? (
        <PuffLoader></PuffLoader>
      ) : (
        <>
          {category ? <h1>{category}</h1> : <h1>Todos los productos</h1>}
          <ItemListContainer items={items} />
        </>
      )}
    </div>
  );
}

export default Products;
