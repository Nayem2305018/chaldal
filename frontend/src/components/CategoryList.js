import React from "react";
import CategoryCard from "./CategoryCard";
import "../styles/List.css";

function CategoryList({ categories, onSelectCategory }) {
  return (
    <div className="list-container">
      <div className="grid">
        {categories.map((category) => (
          <CategoryCard
            key={category.category_id}
            category={category}
            onSelect={onSelectCategory}
          />
        ))}
      </div>
    </div>
  );
}

export default CategoryList;
