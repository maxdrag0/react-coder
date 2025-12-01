import { PuffLoader } from "react-spinners";
import ItemListContainer from "../../components/ItemListContainer/ItemListContainer";
import { useProducts } from "../../hooks/useProducts";
import "./Products.css";
import { useParams } from "react-router-dom";
import { useEffect } from "react";

function Products() {
  const { category } = useParams();

  const { items, loading } = useProducts(category);

  return (
    <div className="product-container">
      {loading ? (
        <PuffLoader></PuffLoader>
      ) : (
        <>
          {category
            ? `Productos de categoría ${category}`
            : "Todos los productos"}
          <ItemListContainer items={items} />
        </>
      )}
    </div>
  );
}

export default Products;
