import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const ManageProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form State
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [catId, setCatId] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const fetchData = async () => {
    try {
      const pRes = await api.get("/products");
      const cRes = await api.get("/categories");
      setProducts(pRes.data);
      setCategories(cRes.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (prod = null) => {
    if (prod) {
      setEditingId(prod.product_id);
      setName(prod.product_name);
      setPrice(prod.price);
      setStock(prod.stock_quantity);
      setCatId(prod.category_id);
      setPhotoUrl(prod.photourl || "");
    } else {
      setEditingId(null);
      setName(""); setPrice(""); setStock(""); setCatId(categories[0]?.category_id || ""); setPhotoUrl("");
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { product_name: name, price, stock_quantity: stock, category_id: catId, photourl: photoUrl };
      if (editingId) {
        await api.put(`/admin/product/${editingId}`, payload);
      } else {
        await api.post("/admin/product", payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) { alert("Failed to save product."); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product permanently?")) return;
    try {
      await api.delete(`/admin/product/${id}`);
      fetchData();
    } catch (err) { alert("Delete failed"); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{marginTop: 0}}>Manage Products</h2>
        <button onClick={() => openModal()} className="admin-btn">+ Add Product</button>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th><th>Image</th><th>Name</th><th>Price</th><th>Stock</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.product_id}>
              <td>{p.product_id}</td>
              <td><img src={p.photourl} alt={p.product_name} style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px" }} /></td>
              <td>{p.product_name}</td>
              <td>৳{parseFloat(p.price).toFixed(2)}</td>
              <td>{p.stock_quantity}</td>
              <td>
                <div className="table-actions">
                  <button onClick={() => openModal(p)} className="btn-edit">Edit</button>
                  <button onClick={() => handleDelete(p.product_id)} className="btn-delete">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="admin-modal">
            <h3>{editingId ? "Edit Product" : "Add Product"}</h3>
            <form onSubmit={handleSubmit}>
              <input className="admin-input" placeholder="Product Name" value={name} onChange={e=>setName(e.target.value)} required />
              <input className="admin-input" placeholder="Price (৳)" type="number" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} required />
              <input className="admin-input" placeholder="Stock Quantity" type="number" value={stock} onChange={e=>setStock(e.target.value)} required />
              
              <select className="admin-input" value={catId} onChange={e=>setCatId(e.target.value)} required>
                <option value="" disabled>Select Category</option>
                {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
              </select>

              <input className="admin-input" placeholder="Photo URL" value={photoUrl} onChange={e=>setPhotoUrl(e.target.value)} />
              
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                <button type="button" onClick={()=>setIsModalOpen(false)} className="admin-btn-secondary">Cancel</button>
                <button type="submit" className="admin-btn">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageProducts;
