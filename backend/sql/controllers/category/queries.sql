-- Controller: category
-- File: queries.sql
-- Runtime PostgreSQL query registry loaded by backend/src/utils/sqlFileLoader.js
-- Used by backend/src/controllers/categoryController.js; fetches and manages category metadata (category_id, category_name, photourl).

-- context: category ordinary query
-- functionality: Executes SQL block 'q_0001' for category controller runtime.
-- name: q_0001
-- used-by: backend/src/controllers/categoryController.js -> exports.getAllCategories()
-- touches: category
select *
  from category;

-- context: category ordinary query
-- functionality: Executes SQL block 'q_0002' for category controller runtime.
-- name: q_0002
-- used-by: backend/src/controllers/categoryController.js -> exports.createCategory()
-- touches: category
select coalesce(
   max(category_id),
   0
) + 1 as next_id
  from category;

-- context: category ordinary query
-- functionality: Executes SQL block 'q_0003' for category controller runtime.
-- name: q_0003
-- used-by: backend/src/controllers/categoryController.js -> exports.createCategory()
-- touches: category
insert into category (
   category_id,
   category_name,
   photourl
) values ( $1,
           $2,
           $3 );

-- context: category ordinary query
-- functionality: Executes SQL block 'q_0004' for category controller runtime.
-- name: q_0004
-- used-by: backend/src/controllers/categoryController.js -> exports.updateCategory()
-- touches: category
update category
   set category_name = coalesce(
   $1,
   category_name
),
       photourl = coalesce(
          $2,
          photourl
       )
 where category_id = $3;

-- context: category ordinary query
-- functionality: Executes SQL block 'q_0005' for category controller runtime.
-- name: q_0005
-- used-by: backend/src/controllers/categoryController.js -> exports.deleteCategory()
-- touches: category
delete from category
 where category_id = $1;