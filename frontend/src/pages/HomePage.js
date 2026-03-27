import React from "react";
import { useNavigate } from "react-router-dom";
import HeroBanner from "../components/HeroBanner";
import Sidebar from "../components/Sidebar";
import CategoriesView from "../components/CategoriesView";
import Footer from "../components/Footer";
import "../styles/HomePage.css";

function HomePage({ searchTerm = "" }) {
  const navigate = useNavigate();

  const handleCategorySelect = (categoryId) => {
    navigate(`/categories/${categoryId}`);
  };

  return (
    <>
      <div className="home-page-container">
        <Sidebar onCategorySelect={(id) => handleCategorySelect(id)} />

        <div className="home-page">
          <HeroBanner />

          <section className="daily-deals-section">
            <img
              src="/Gemini_Generated_Image_nvysdbnvysdbnvys.png"
              alt="Promotional Banner"
              className="daily-deals-image"
            />
          </section>

          <CategoriesView onCategorySelect={handleCategorySelect} />
        </div>
      </div>
      <Footer />
    </>
  );
}

export default HomePage;
