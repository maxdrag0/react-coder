import { PuffLoader } from "react-spinners";
import ItemListContainer from "../../components/ItemListContainer/ItemListContainer";
import { useProducts } from "../../hooks/useProducts";
import "./Products.css";

function Products() {
  const { items, loading } = useProducts();
  return (
    <div className="product-container">
      {loading ? (
        <PuffLoader></PuffLoader>
      ) : (
        <>
          <ItemListContainer items={items} />
        </>
      )}
    </div>
  );
}

export default Products;
