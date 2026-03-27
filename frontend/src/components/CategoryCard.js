import React from "react";
import "../styles/Card.css";

function CategoryCard({ category, onSelect }) {
  const handleClick = () => {
    if (onSelect) {
      onSelect(category.category_id);
    }
  };

  return (
    <div
      className="card category-card-image clickable-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className="category-image-container">
        <img
          src={category.photourl}
          alt={category.category_name}
          className="category-image"
          onError={(e) => {
            e.target.src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='250'%3E%3Crect fill='%23f0f0f0' width='300' height='250'/%3E%3Ctext x='50%' y='50%' text-anchor='middle' dy='.3em' font-family='Arial' font-size='16' fill='%23999'%3EImage Not Found%3C/text%3E%3C/svg%3E";
          }}
        />
      </div>
      <div className="category-card-info">
        <h3>{category.category_name}</h3>
        <p className="category-description">{category.description}</p>
        <button className="view-products-btn" type="button">
          View Products →
        </button>
      </div>
    </div>
  );
}

export default CategoryCard;
