-- Step 1: Insert Categories (No dependencies)
INSERT INTO category (category_id, category_name, description, image_url) VALUES
(1, 'Beverage', 'Drinks, juices, and beverages', 'https://i.chaldn.com/asset/egg-chaldal-web-release-id-29229/https/Default/stores/chaldal/components/landingPage2/LandingPageCategories/images/categories/beverages.png'),
(2, 'Cooking', 'Oils, spices, and cooking ingredients', 'https://i.chaldn.com/asset/egg-chaldal-web-release-id-29229/https/Default/stores/chaldal/components/landingPage2/LandingPageCategories/images/categories/cooking.png?q=low&webp=1'),
(3, 'Fruits & Vegetables', 'Fresh fruits and vegetables', 'https://i.chaldn.com/asset/egg-chaldal-web-release-id-29229/https/Default/stores/chaldal/components/landingPage2/LandingPageCategories/images/categories/fruitsAndVegs.png'),
(4, 'Meat & Fish', 'Meat, fish, and protein products', 'https://i.chaldn.com/asset/egg-chaldal-web-release-id-29229/https/Default/stores/chaldal/components/landingPage2/LandingPageCategories/images/categories/meatAndFish.png?q=low&webp=1');

-- Step 2: Insert Admins (No dependencies)
INSERT INTO admin (admin_id, name, password) VALUES
(1, 'Admin User', 'admin123'),
(2, 'Manager One', 'manager123'),
(3, 'Manager Two', 'manager456');

-- Step 3: Insert Products (Depends on category and admin)
INSERT INTO product (product_id, product_name, price, unit, category_id, added_by_admin) VALUES
(1, 'Fresh Tomato', 50.00, 'kg', 3, 1),
(2, 'Organic Rice', 120.00, 'kg', 2, 1),
(3, 'Farm Fresh Eggs', 200.00, 'dozen', 2, 1),
(4, 'Milk (1L)', 60.00, 'liter', 2, 1),
(5, 'Potato', 30.00, 'kg', 3, 2),
(6, 'Bread', 40.00, 'piece', 2, 2),
(7, 'Banana', 80.00, 'kg', 3, 1),
(8, 'Turmeric Powder', 150.00, 'kg', 2, 3),
(9, 'Onion', 35.00, 'kg', 3, 3),
(10, 'Apple', 120.00, 'kg', 3, 2),
(11, 'Orange Juice', 100.00, 'liter', 1, 1),
(12, 'Mango Juice', 110.00, 'liter', 1, 2),
(13, 'Chicken Breast', 450.00, 'kg', 4, 1),
(14, 'Fish Fillet', 380.00, 'kg', 4, 2),
(15, 'Vegetable Oil', 200.00, 'liter', 2, 3);

-- Verify the data
-- SELECT * FROM category;
-- SELECT * FROM admin;
-- SELECT * FROM product;
