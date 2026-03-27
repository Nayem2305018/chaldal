import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const ManageCategories = () => {
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form State
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories"); // Standard public fetch
      setCategories(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setName(""); setPhotoUrl("");
    setIsModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditingId(cat.category_id);
    setName(cat.category_name);
    setPhotoUrl(cat.photourl || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/admin/category/${editingId}`, { category_name: name, photourl: photoUrl });
      } else {
        await api.post("/admin/category", { category_name: name, photourl: photoUrl });
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) { alert("Action failed."); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      await api.delete(`/admin/category/${id}`);
      fetchCategories();
    } catch (err) { alert("Failed to delete."); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{marginTop: 0}}>Manage Categories</h2>
        <button onClick={openAdd} className="admin-btn">+ Add Category</button>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Image</th>
            <th>Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(cat => (
            <tr key={cat.category_id}>
              <td>{cat.category_id}</td>
              <td><img src={cat.photourl} alt={cat.category_name} style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "8px" }} /></td>
              <td>{cat.category_name}</td>
              <td>
                <div className="table-actions">
                  <button onClick={() => openEdit(cat)} className="btn-edit">Edit</button>
                  <button onClick={() => handleDelete(cat.category_id)} className="btn-delete">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="admin-modal">
            <h3>{editingId ? "Edit Category" : "Add New Category"}</h3>
            <form onSubmit={handleSubmit}>
              <input className="admin-input" placeholder="Category Name" value={name} onChange={e=>setName(e.target.value)} required />
              <input className="admin-input" placeholder="Photo URL" value={photoUrl} onChange={e=>setPhotoUrl(e.target.value)} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                <button type="button" onClick={()=>setIsModalOpen(false)} className="admin-btn-secondary">Cancel</button>
                <button type="submit" className="admin-btn">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCategories;
