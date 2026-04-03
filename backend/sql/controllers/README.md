# Controller SQL Registry (PostgreSQL)

This folder stores SQL artifacts per backend controller.

Structure per controller folder:

- queries.sql: direct SQL statements used by controller APIs
- functions.sql: PostgreSQL functions used by triggers/procedures when needed
- procedures.sql: PostgreSQL procedures used by runtime flows when needed
- triggers.sql: PostgreSQL trigger functions and trigger bindings when needed

Controller mapping:

- admin <-> backend/src/controllers/adminController.js
- auth <-> backend/src/controllers/authController.js
- cart <-> backend/src/controllers/cartController.js
- category <-> backend/src/controllers/categoryController.js
- order <-> backend/src/controllers/orderController.js
- product <-> backend/src/controllers/productController.js
- rider <-> backend/src/controllers/riderController.js
- user <-> backend/src/controllers/userController.js

Important:

- SQL in these files is PostgreSQL syntax.
- Keep objects minimal: only define functions/procedures/triggers used by project flows.
- Deploy each file explicitly in your PostgreSQL database when needed.
