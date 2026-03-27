-- ========================================
-- CHALDAL DATABASE INITIALIZATION SCRIPT
-- Only 4 Categories: Beverage, Cooking, Fruits & Vegetables, Meat & Fish
-- ========================================

-- Step 1: Drop existing tables (if they exist) to start fresh
DROP TABLE IF EXISTS rider_payout CASCADE;
DROP TABLE IF EXISTS rider_ride CASCADE;
DROP TABLE IF EXISTS delivery CASCADE;
DROP TABLE IF EXISTS rider CASCADE;
DROP TABLE IF EXISTS rider_requests CASCADE;
DROP TABLE IF EXISTS user_voucher CASCADE;
DROP TABLE IF EXISTS voucher CASCADE;
DROP TABLE IF EXISTS payment CASCADE;
DROP TABLE IF EXISTS order_item CASCADE;
DROP TABLE IF EXISTS "order" CASCADE;
DROP TABLE IF EXISTS cart_item CASCADE;
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS warehouse CASCADE;
DROP TABLE IF EXISTS product CASCADE;
DROP TABLE IF EXISTS category CASCADE;
DROP TABLE IF EXISTS admin CASCADE;
DROP TABLE IF EXISTS user_address CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Create all tables with correct schema
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_address (
    address_id INT PRIMARY KEY,
    user_id INT,
    label VARCHAR(20),
    area VARCHAR(100),
    city VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE admin (
    admin_id INT PRIMARY KEY,
    name VARCHAR(100),
    password VARCHAR(255),
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE category (
    category_id INT PRIMARY KEY,
    category_name VARCHAR(100),
    description TEXT,
    photourl TEXT
);

CREATE TABLE product (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(100),
    price NUMERIC(10,2),
    unit VARCHAR(50),
    category_id INT,
    added_by_admin INT,
    photourl TEXT,
    FOREIGN KEY (category_id) REFERENCES category(category_id),
    FOREIGN KEY (added_by_admin) REFERENCES admin(admin_id)
);

CREATE TABLE warehouse (
    warehouse_id INT PRIMARY KEY,
    name VARCHAR(100),
    location VARCHAR(100)
);

CREATE TABLE inventory (
    inventory_id INT PRIMARY KEY,
    product_id INT,
    warehouse_id INT,
    last_updated TIMESTAMP,
    stock_quantity INT,
    FOREIGN KEY (product_id) REFERENCES product(product_id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouse(warehouse_id)
);

CREATE TABLE cart (
    cart_id INT PRIMARY KEY,
    user_id INT,
    last_updated TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE cart_item (
    cart_item_id INT PRIMARY KEY,
    cart_id INT,
    product_id INT,
    quantity INT,
    FOREIGN KEY (cart_id) REFERENCES cart(cart_id),
    FOREIGN KEY (product_id) REFERENCES product(product_id)
);

CREATE TABLE "order" (
    order_id INT PRIMARY KEY,
    user_id INT,
    total_price NUMERIC(10,2),
    order_status VARCHAR(50),
    order_date TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE order_item (
    order_item_id INT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT,
    unit_price NUMERIC(10,2),
    subtotal NUMERIC(10,2),
    FOREIGN KEY (order_id) REFERENCES "order"(order_id),
    FOREIGN KEY (product_id) REFERENCES product(product_id)
);

CREATE TABLE payment (
    payment_id INT PRIMARY KEY,
    order_id INT,
    method VARCHAR(20),
    amount NUMERIC(10,2),
    payment_status VARCHAR(50),
    FOREIGN KEY (order_id) REFERENCES "order"(order_id)
);

CREATE TABLE voucher (
    voucher_id INT PRIMARY KEY,
    product_id INT,
    admin_id INT,
    code VARCHAR(50) UNIQUE,
    discount_value NUMERIC(5,2),
    expiry_date DATE,
    is_active BOOLEAN,
    FOREIGN KEY (product_id) REFERENCES product(product_id),
    FOREIGN KEY (admin_id) REFERENCES admin(admin_id)
);

CREATE TABLE user_voucher (
    voucher_id INT,
    user_id INT,
    order_id INT,
    used_at TIMESTAMP,
    PRIMARY KEY (voucher_id, user_id),
    FOREIGN KEY (voucher_id) REFERENCES voucher(voucher_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (order_id) REFERENCES "order"(order_id)
);

CREATE TABLE rider_requests (
    request_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    phone VARCHAR(20),
    appointment_code VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INT,
    FOREIGN KEY (reviewed_by) REFERENCES admin(admin_id)
);

CREATE TABLE rider (
    rider_id INT PRIMARY KEY,
    rider_name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    phone VARCHAR(20),
    appointment_code VARCHAR(100),
    vehicle_type VARCHAR(50),
    current_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery (
    delivery_id INT PRIMARY KEY,
    order_id INT,
    rider_id INT,
    warehouse_id INT,
    delivery_status VARCHAR(50),
    delivered_at TIMESTAMP,
    assigned_at TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES "order"(order_id),
    FOREIGN KEY (rider_id) REFERENCES rider(rider_id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouse(warehouse_id)
);

CREATE TABLE rider_ride (
    ride_id INT PRIMARY KEY,
    rider_id INT,
    delivery_id INT,
    ride_date DATE,
    distance_km NUMERIC(5,2),
    earning NUMERIC(10,2),
    FOREIGN KEY (rider_id) REFERENCES rider(rider_id),
    FOREIGN KEY (delivery_id) REFERENCES delivery(delivery_id)
);

CREATE TABLE rider_payout (
    payout_id INT PRIMARY KEY,
    rider_id INT,
    total_amount NUMERIC(10,2),
    payout_date DATE,
    payout_status VARCHAR(50),
    FOREIGN KEY (rider_id) REFERENCES rider(rider_id)
);

-- ========================================
-- STEP 3: INSERT DATA
-- ========================================

-- Insert Users
INSERT INTO users (user_id, name, email, password_hash, phone) VALUES
(1, 'Tanvir Rahman', 'tanvir@gmail.com', 'hash_123', '01711223344'),
(2, 'Sadia Islam', 'sadia.islam@yahoo.com', 'hash_456', '01811223344'),
(3, 'Arif Ahmed', 'arif_buet@cse.com', 'hash_789', '01911223344'),
(4, 'Nusrat Jahan', 'nusrat@outlook.com', 'hash_abc', '01511223344'),
(5, 'Mahmudul Hasan', 'mahmud@chaldal.com', 'hash_def', '01311223344'),
(6, 'Farhana Akter', 'farhana@gmail.com', 'hash_ghi', '01611223344'),
(7, 'Sabbir Hossain', 'sabbir.h@yahoo.com', 'hash_jkl', '01722334455'),
(8, 'Raiyaan Karim', 'raiyaan@gmail.com', 'hash_mno', '01822334455'),
(9, 'Anika Tabassum', 'anika@cse.buet.ac.bd', 'hash_pqr', '01922334455'),
(10, 'Rakibul Islam', 'rakib@gmail.com', 'hash_stu', '01522334455');

-- Insert Admins
INSERT INTO admin (admin_id, name, password, email) VALUES
(1, 'Admin User', 'admin123', 'admin@chaldal.com'),
(2, 'Manager One', 'manager123', 'manager1@chaldal.com'),
(3, 'Manager Two', 'manager456', 'manager2@chaldal.com');

-- Insert 4 Categories ONLY
INSERT INTO category (category_id, category_name, description, photourl) VALUES
(1, 'Beverage', 'Drinks, juices, and beverages', 'https://i.chaldn.com/asset/egg-chaldal-web-release-id-29229/https/Default/stores/chaldal/components/landingPage2/LandingPageCategories/images/categories/beverages.png'),
(2, 'Cooking', 'Oils, spices, and cooking ingredients', 'https://i.chaldn.com/asset/egg-chaldal-web-release-id-29229/https/Default/stores/chaldal/components/landingPage2/LandingPageCategories/images/categories/cooking.png?q=low&webp=1'),
(3, 'Fruits & Vegetables', 'Fresh fruits and vegetables', 'https://i.chaldn.com/asset/egg-chaldal-web-release-id-29229/https/Default/stores/chaldal/components/landingPage2/LandingPageCategories/images/categories/fruitsAndVegs.png'),
(4, 'Meat & Fish', 'Meat, fish, and protein products', 'https://i.chaldn.com/asset/egg-chaldal-web-release-id-29229/https/Default/stores/chaldal/components/landingPage2/LandingPageCategories/images/categories/meatAndFish.png?q=low&webp=1');

-- Insert Products (15 products mapped to 4 categories only)
INSERT INTO product (product_id, product_name, price, unit, category_id, added_by_admin, photourl) VALUES
(1, 'Fresh Tomato', 50.00, 'kg', 3, 1, 'https://example.com/tomato.png'),
(2, 'Organic Rice', 120.00, 'kg', 2, 1, 'https://example.com/rice.png'),
(3, 'Farm Fresh Eggs', 200.00, 'dozen', 2, 1, 'https://example.com/eggs.png'),
(4, 'Milk (1L)', 60.00, 'liter', 2, 1, 'https://example.com/milk.png'),
(5, 'Potato', 30.00, 'kg', 3, 2, 'https://example.com/potato.png'),
(6, 'Bread', 40.00, 'piece', 2, 2, 'https://example.com/bread.png'),
(7, 'Banana', 80.00, 'kg', 3, 1, 'https://example.com/banana.png'),
(8, 'Turmeric Powder', 150.00, 'kg', 2, 3, 'https://example.com/turmeric.png'),
(9, 'Onion', 35.00, 'kg', 3, 3, 'https://example.com/onion.png'),
(10, 'Apple', 120.00, 'kg', 3, 2, 'https://example.com/apple.png'),
(11, 'Orange Juice', 100.00, 'liter', 1, 1, 'https://example.com/orangejuice.png'),
(12, 'Mango Juice', 110.00, 'liter', 1, 2, 'https://example.com/mangojuice.png'),
(13, 'Chicken Breast', 450.00, 'kg', 4, 1, 'https://example.com/chicken.png'),
(14, 'Fish Fillet', 380.00, 'kg', 4, 2, 'https://example.com/fish.png'),
(15, 'Vegetable Oil', 200.00, 'liter', 2, 3, 'https://example.com/oil.png');

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
SELECT * FROM category;
SELECT * FROM admin;
SELECT * FROM product;
