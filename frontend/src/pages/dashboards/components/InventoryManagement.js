import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const InventoryManagement = () => {
  const [products, setProducts] = useState([]);
  const [warehouseTotals, setWarehouseTotals] = useState([]);
  const [overallTotalStock, setOverallTotalStock] = useState(0);
  const [stockInputs, setStockInputs] = useState({});

  const fetchInventory = async () => {
    try {
      const res = await api.get("/admin/inventory/summary");
      const nextProducts = res.data?.products || [];
      const nextWarehouses = res.data?.warehouses || [];

      setProducts(nextProducts);
      setWarehouseTotals(nextWarehouses);
      setOverallTotalStock(Number(res.data?.overall_total_stock || 0));

      const inputState = {};
      nextProducts.forEach((product) => {
        (product.warehouses || []).forEach((warehouse) => {
          inputState[`${product.product_id}-${warehouse.warehouse_id}`] =
            Number(warehouse.stock_quantity || 0);
        });
      });
      setStockInputs(inputState);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleUpdateStock = async (productId, warehouseId) => {
    const key = `${productId}-${warehouseId}`;
    const value = Number(stockInputs[key]);

    if (!Number.isInteger(value) || value < 0) {
      alert("Stock value must be a non-negative integer");
      return;
    }

    try {
      await api.put(`/admin/inventory/${productId}/${warehouseId}`, {
        stock_quantity: value,
      });
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update stock");
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Inventory Tracking Hub 🏢</h2>
      <p style={{ color: "#666" }}>
        Track each warehouse stock separately, plus total product stock.
      </p>

      <div
        style={{
          display: "flex",
          gap: "12px",
          margin: "16px 0",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            background: "#eef6ff",
            border: "1px solid #d0e2ff",
            padding: "10px 14px",
            borderRadius: "8px",
            fontWeight: "bold",
          }}
        >
          Total Products In Stock: {overallTotalStock}
        </div>
        {warehouseTotals.map((warehouse) => (
          <div
            key={warehouse.warehouse_id}
            style={{
              background: "#f8f9fa",
              border: "1px solid #e2e6ea",
              padding: "10px 14px",
              borderRadius: "8px",
            }}
          >
            <strong>
              {warehouse.warehouse_name}
              {warehouse.region_name ? ` (${warehouse.region_name})` : ""}
            </strong>
            : {warehouse.total_stock}
          </div>
        ))}
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Product ID</th>
            <th>Name</th>
            <th>Total Stock</th>
            {warehouseTotals.map((warehouse) => (
              <th key={warehouse.warehouse_id}>
                {warehouse.warehouse_name}
                {warehouse.region_name ? ` (${warehouse.region_name})` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.product_id}>
              <td>#{product.product_id}</td>
              <td style={{ fontWeight: "bold" }}>{product.product_name}</td>
              <td>
                <span
                  style={{
                    background:
                      Number(product.total_stock) < 10 ? "#fdeded" : "#e8f8f5",
                    color:
                      Number(product.total_stock) < 10 ? "#e74c3c" : "#27ae60",
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontWeight: "bold",
                  }}
                >
                  {product.total_stock} Units
                </span>
              </td>

              {warehouseTotals.map((warehouse) => {
                const stockRow = (product.warehouses || []).find(
                  (w) =>
                    Number(w.warehouse_id) === Number(warehouse.warehouse_id),
                );
                const key = `${product.product_id}-${warehouse.warehouse_id}`;

                return (
                  <td key={key}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        minWidth: "120px",
                      }}
                    >
                      <input
                        type="number"
                        min="0"
                        value={
                          stockInputs[key] ??
                          Number(stockRow?.stock_quantity || 0)
                        }
                        onChange={(e) =>
                          setStockInputs((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "6px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                        }}
                      />
                      <button
                        onClick={() =>
                          handleUpdateStock(
                            product.product_id,
                            warehouse.warehouse_id,
                          )
                        }
                        className="btn-edit"
                        style={{ background: "#9575cd" }}
                      >
                        Update
                      </button>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryManagement;
