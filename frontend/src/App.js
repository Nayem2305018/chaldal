import React, { useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import "./App.css";
import Navigation from "./components/Navigation";
import MainContent from "./components/MainContent";
import CartSlider from "./components/CartSlider";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

function App() {
  const [refreshProducts, setRefreshProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="App">
            <header className="App-header">
              <Navigation onSearch={handleSearch} />
            </header>

            <CartSlider />

            <MainContent
              refreshProducts={refreshProducts}
              setRefreshProducts={setRefreshProducts}
              searchTerm={searchTerm}
            />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
