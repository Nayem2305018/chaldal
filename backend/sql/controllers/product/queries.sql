-- Controller: product
-- File: queries.sql
-- Runtime PostgreSQL query registry loaded by backend/src/utils/sqlFileLoader.js
-- Used by backend/src/controllers/productController.js; fetches product catalog rows with active discount/offer calculations and manages product create/read/delete operations.

-- context: product ordinary query
-- functionality: Executes SQL block 'select_all_products_with_discount' for product controller runtime.
-- name: select_all_products_with_discount
-- used-by: backend/src/controllers/productController.js -> exports.getAllProducts()
-- touches: product, product_discounts
select p.*,
       cast(coalesce(
          ad.effective_discount_amount,
          0
       ) as numeric(10,
            2)) as product_discount_amount,
       cast(greatest(
          p.price - coalesce(
             ad.effective_discount_amount,
             0
          ),
          0
       ) as numeric(10,
            2)) as discounted_price,
       ad.product_discount_id as active_product_discount_id,
       ad.discount_type as active_discount_type,
       ad.discount_value as active_discount_value,
       ad.max_discount_amount as active_max_discount_amount,
       ad.start_at as active_discount_start_at,
       ad.end_at as active_discount_end_at
  from product p
  left join lateral (
   select pd.product_discount_id,
          pd.discount_type,
          pd.discount_value,
          pd.max_discount_amount,
          pd.start_at,
          pd.end_at,
          cast(least(
             case
                when pd.discount_type = 'percentage'   then
                   (p.price * pd.discount_value / 100.0)
                when pd.discount_type = 'fixed_amount' then
                   pd.discount_value
                else
                   0
             end,
             coalesce(
                pd.max_discount_amount,
                p.price
             ),
             p.price
          ) as numeric(10,
               2)) as effective_discount_amount
     from product_discounts pd
    where pd.product_id = p.product_id
      and pd.is_active = true
      and ( pd.start_at is null
       or pd.start_at <= now() )
      and ( pd.end_at is null
       or pd.end_at >= now() )
      and pd.product_discount_id = (
      select max(pd2.product_discount_id)
        from product_discounts pd2
       where pd2.product_id = p.product_id
         and pd2.is_active = true
         and ( pd2.start_at is null
          or pd2.start_at <= now() )
         and ( pd2.end_at is null
          or pd2.end_at >= now() )
   )
) ad
on true
 order by p.product_id;

-- context: product ordinary query
-- functionality: Executes SQL block 'select_products_by_category_with_discount' for product controller runtime.
-- name: select_products_by_category_with_discount
-- used-by: backend/src/controllers/productController.js -> exports.getProductsByCategory()
-- touches: product, product_discounts
select p.*,
       cast(coalesce(
          ad.effective_discount_amount,
          0
       ) as numeric(10,
            2)) as product_discount_amount,
       cast(greatest(
          p.price - coalesce(
             ad.effective_discount_amount,
             0
          ),
          0
       ) as numeric(10,
            2)) as discounted_price,
       ad.product_discount_id as active_product_discount_id,
       ad.discount_type as active_discount_type,
       ad.discount_value as active_discount_value,
       ad.max_discount_amount as active_max_discount_amount,
       ad.start_at as active_discount_start_at,
       ad.end_at as active_discount_end_at
  from product p
  left join lateral (
   select pd.product_discount_id,
          pd.discount_type,
          pd.discount_value,
          pd.max_discount_amount,
          pd.start_at,
          pd.end_at,
          cast(least(
             case
                when pd.discount_type = 'percentage'   then
                   (p.price * pd.discount_value / 100.0)
                when pd.discount_type = 'fixed_amount' then
                   pd.discount_value
                else
                   0
             end,
             coalesce(
                pd.max_discount_amount,
                p.price
             ),
             p.price
          ) as numeric(10,
               2)) as effective_discount_amount
     from product_discounts pd
    where pd.product_id = p.product_id
      and pd.is_active = true
      and ( pd.start_at is null
       or pd.start_at <= now() )
      and ( pd.end_at is null
       or pd.end_at >= now() )
      and pd.product_discount_id = (
      select max(pd2.product_discount_id)
        from product_discounts pd2
       where pd2.product_id = p.product_id
         and pd2.is_active = true
         and ( pd2.start_at is null
          or pd2.start_at <= now() )
         and ( pd2.end_at is null
          or pd2.end_at >= now() )
   )
) ad
on true
 where p.category_id = $1
 order by p.product_id;

-- context: product ordinary query
-- functionality: Executes SQL block 'select_active_product_offers' for product controller runtime.
-- name: select_active_product_offers
-- used-by: backend/src/controllers/productController.js -> exports.getActiveProductOffers()
-- touches: product, product_discounts
select p.*,
       cast(coalesce(
          ad.effective_discount_amount,
          0
       ) as numeric(10,
            2)) as product_discount_amount,
       cast(greatest(
          p.price - coalesce(
             ad.effective_discount_amount,
             0
          ),
          0
       ) as numeric(10,
            2)) as discounted_price,
       ad.product_discount_id as active_product_discount_id,
       ad.discount_type as active_discount_type,
       ad.discount_value as active_discount_value,
       ad.max_discount_amount as active_max_discount_amount,
       ad.start_at as active_discount_start_at,
       ad.end_at as active_discount_end_at
  from product p
  left join lateral (
   select pd.product_discount_id,
          pd.discount_type,
          pd.discount_value,
          pd.max_discount_amount,
          pd.start_at,
          pd.end_at,
          cast(least(
             case
                when pd.discount_type = 'percentage'   then
                   (p.price * pd.discount_value / 100.0)
                when pd.discount_type = 'fixed_amount' then
                   pd.discount_value
                else
                   0
             end,
             coalesce(
                pd.max_discount_amount,
                p.price
             ),
             p.price
          ) as numeric(10,
               2)) as effective_discount_amount
     from product_discounts pd
    where pd.product_id = p.product_id
      and pd.is_active = true
      and ( pd.start_at is null
       or pd.start_at <= now() )
      and ( pd.end_at is null
       or pd.end_at >= now() )
      and pd.product_discount_id = (
      select max(pd2.product_discount_id)
        from product_discounts pd2
       where pd2.product_id = p.product_id
         and pd2.is_active = true
         and ( pd2.start_at is null
          or pd2.start_at <= now() )
         and ( pd2.end_at is null
          or pd2.end_at >= now() )
   )
) ad
on true
 where coalesce(
   ad.effective_discount_amount,
   0
) > 0
 order by coalesce(
   ad.effective_discount_amount,
   0
) desc;

-- context: product ordinary query
-- functionality: Executes SQL block 'insert_product' for product controller runtime.
-- name: insert_product
-- used-by: backend/src/controllers/productController.js -> exports.createProduct()
-- touches: product
insert into product (
   product_id,
   product_name,
   price,
   unit,
   category_id,
   added_by_admin
) values ( $1,
           $2,
           $3,
           $4,
           $5,
           $6 );

-- context: product ordinary query
-- functionality: Executes SQL block 'select_product_by_id' for product controller runtime.
-- name: select_product_by_id
-- used-by: backend/src/controllers/productController.js -> exports.createProduct()
-- touches: product
select *
  from product
 where product_id = $1;

-- context: product ordinary query
-- functionality: Executes SQL block 'delete_product_by_id' for product controller runtime.
-- name: delete_product_by_id
-- used-by: backend/src/controllers/productController.js -> exports.deleteProduct()
-- touches: product
delete from product
 where product_id = $1;