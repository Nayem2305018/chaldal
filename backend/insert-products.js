const db = require("./src/db");

// Sample products data
const productsData = [
  {
    product_id: 1,
    product_name: "Fresh Tomato",
    price: 50.0,
    unit: "kg",
    category_id: 1,
    added_by_admin: 1,
  },
  {
    product_id: 2,
    product_name: "Organic Rice",
    price: 120.0,
    unit: "kg",
    category_id: 2,
    added_by_admin: 1,
  },
  {
    product_id: 3,
    product_name: "Farm Fresh Eggs",
    price: 200.0,
    unit: "dozen",
    category_id: 3,
    added_by_admin: 1,
  },
  {
    product_id: 4,
    product_name: "Milk (1L)",
    price: 60.0,
    unit: "liter",
    category_id: 3,
    added_by_admin: 1,
  },
  {
    product_id: 5,
    product_name: "Potato",
    price: 30.0,
    unit: "kg",
    category_id: 1,
    added_by_admin: 1,
  },
  {
    product_id: 6,
    product_name: "Bread",
    price: 40.0,
    unit: "piece",
    category_id: 4,
    added_by_admin: 1,
  },
];

// Function to insert products
async function insertProducts() {
  try {
    console.log("🔄 Starting to insert products...");

    for (const product of productsData) {
      const query = `
        INSERT INTO product (product_id, product_name, price, unit, category_id, added_by_admin)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (product_id) DO NOTHING;
      `;

      await db.query(query, [
        product.product_id,
        product.product_name,
        product.price,
        product.unit,
        product.category_id,
        product.added_by_admin,
      ]);

      console.log(`✅ Inserted: ${product.product_name}`);
    }
    console.log("🎉 All products inserted successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error inserting products:", err.message);
    process.exit(1);
  }
}

// Run the function
insertProducts();
