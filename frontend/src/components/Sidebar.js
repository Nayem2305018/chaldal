/**
 * Sidebar Component
 * Fetches categories and active product offers, then renders homepage filters and offer highlights.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  fetchActiveProductOffers,
  fetchCategories,
  fetchProducts,
} from "../services/api";
import "../styles/Sidebar.css";

const TAKA_SYMBOL = "\u09F3";

function Sidebar({ onCategorySelect }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeOffers, setActiveOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);

  const loadSidebarData = useCallback(async () => {
    try {
      setLoading(true);
      setOffersLoading(true);

      const [categoryData, offersData] = await Promise.all([
        fetchCategories(),
        fetchActiveProductOffers(6).catch(() => []),
      ]);

      setCategories(categoryData);

      const rawOfferProducts =
        Array.isArray(offersData) && offersData.length > 0
          ? offersData
          : await fetchProducts();

      const discountedOffers = (
        Array.isArray(rawOfferProducts) ? rawOfferProducts : []
      )
        .filter((product) => {
          const basePrice = Number(product.price || 0);
          const discountedPrice = Number(
            product.discounted_price !== undefined &&
              product.discounted_price !== null
              ? product.discounted_price
              : basePrice,
          );
          const discountAmount = Number(product.product_discount_amount || 0);

          return (
            discountAmount > 0 ||
            discountedPrice < basePrice ||
            Boolean(product.active_discount_type)
          );
        })
        .sort(
          (a, b) =>
            Number(b.product_discount_amount || 0) -
            Number(a.product_discount_amount || 0),
        )
        .slice(0, 4)
        .map((product) => {
          const basePrice = Number(product.price || 0);
          const discountedPrice = Number(
            product.discounted_price !== undefined &&
              product.discounted_price !== null
              ? product.discounted_price
              : basePrice,
          );
          const discountType = product.active_discount_type;
          const discountValue = Number(product.active_discount_value || 0);
          const discountAmount = Number(product.product_discount_amount || 0);

          const offerBadge =
            discountType === "percentage"
              ? `${Math.round(discountValue)}% OFF`
              : `SAVE BDT ${Math.round(discountAmount || basePrice - discountedPrice)}`;

          return {
            productId: product.product_id,
            name: product.product_name,
            badge: offerBadge,
            basePrice,
            discountedPrice,
          };
        });

      setActiveOffers(discountedOffers);
    } catch (err) {
      console.error("Failed to load sidebar data:", err);
    } finally {
      setLoading(false);
      setOffersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSidebarData();
  }, [loadSidebarData]);

  const handleCategoryClick = (categoryId, categoryName) => {
    setSelectedCategory(categoryId);
    onCategorySelect(categoryId, categoryName);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3 className="sidebar-title">Special Offers</h3>
        {offersLoading ? (
          <p className="loading-text">Loading active offers...</p>
        ) : activeOffers.length > 0 ? (
          <div className="offers-list">
            {activeOffers.map((offer) => (
              <div key={offer.productId} className="offer-item">
                <div className="offer-item-main">
                  <span className="offer-badge">{offer.badge}</span>
                  <p className="offer-name">{offer.name}</p>
                </div>
                <div className="offer-prices">
                  {offer.discountedPrice < offer.basePrice && (
                    <span className="offer-price-old">
                      {TAKA_SYMBOL} {offer.basePrice.toFixed(2)}
                    </span>
                  )}
                  <span className="offer-price-new">
                    {TAKA_SYMBOL} {offer.discountedPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-data-text">No active offers right now.</p>
        )}
      </div>

      {/* Categories Section */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">Categories</h3>
        {loading ? (
          <p className="loading-text">Loading categories...</p>
        ) : categories.length > 0 ? (
          <div className="categories-list">
            <button
              className={`category-item ${selectedCategory === null ? "active" : ""}`}
              onClick={() => {
                setSelectedCategory(null);
                onCategorySelect(null);
              }}
            >
              All Products
            </button>
            {categories.map((category) => (
              <button
                key={category.category_id}
                className={`category-item ${
                  selectedCategory === category.category_id ? "active" : ""
                }`}
                onClick={() =>
                  handleCategoryClick(
                    category.category_id,
                    category.category_name,
                  )
                }
              >
                {category.category_name}
              </button>
            ))}
          </div>
        ) : (
          <p className="no-data-text">No categories found</p>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
