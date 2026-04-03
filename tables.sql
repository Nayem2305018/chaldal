CREATE TABLE users (
    user_id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    phone VARCHAR(20)
);

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
    password VARCHAR(255)
);

CREATE TABLE category (
    category_id INT PRIMARY KEY,
    category_name VARCHAR(100),
    description TEXT,
    image_url TEXT
);

CREATE TABLE product (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(100),
    price NUMERIC(10,2),
    unit VARCHAR(50),
    category_id INT,
    added_by_admin INT,
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

CREATE TABLE rider (
    rider_id INT PRIMARY KEY,
    rider_name VARCHAR(100),
    vehicle_type VARCHAR(50),
    current_status VARCHAR(20)
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

