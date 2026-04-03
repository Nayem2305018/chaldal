-- Controller: user
-- File: queries.sql
-- Runtime PostgreSQL query registry loaded by backend/src/utils/sqlFileLoader.js
-- Used by backend/src/controllers/userController.js; fetches user profile fields (user_id, name, email, phone, created_at) and updates profile basics.

-- context: user ordinary query
-- functionality: Executes SQL block 'q_0001' for user controller runtime.
-- name: q_0001
-- used-by: backend/src/controllers/userController.js -> exports.getProfile()
-- touches: users
select user_id,
       name,
       email,
       phone,
       created_at
  from users
 where user_id = $1;

-- context: user ordinary query
-- functionality: Executes SQL block 'q_0002' for user controller runtime.
-- name: q_0002
-- used-by: backend/src/controllers/userController.js -> exports.updateProfile()
-- touches: users
update users
   set name = coalesce(
   $1,
   name
),
       phone = coalesce(
          $2,
          phone
       )
 where user_id = $3;

-- context: user ordinary query
-- functionality: Executes SQL block 'q_0003' for user controller runtime.
-- name: q_0003
-- used-by: backend/src/controllers/userController.js -> exports.updateProfile()
-- touches: users
select user_id,
       name,
       email,
       phone
  from users
 where user_id = $1;