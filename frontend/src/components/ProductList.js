import React from "react";
import ProductCard from "./ProductCard";
import "../styles/List.css";

function ProductList({ products }) {
  return (
    <div className="list-container">
      <div className="grid">
        {products.map((product) => (
          <ProductCard key={product.product_id} product={product} />
        ))}
      </div>
    </div>
  );
}

export default ProductList;
