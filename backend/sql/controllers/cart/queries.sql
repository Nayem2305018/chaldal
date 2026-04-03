-- Controller: cart
-- File: queries.sql
-- Runtime PostgreSQL query registry loaded by backend/src/utils/sqlFileLoader.js
-- Used by backend/src/controllers/cartController.js; fetches active cart/cart_item rows with product details, stock, price snapshots, and computed cart totals.

-- context: cart ordinary query
-- functionality: Adds cart_item.unit_price column for storing per-item price snapshots at add time.
-- name: q_0001
-- used-by: backend/src/controllers/cartController.js -> no direct exports.<fn>() reference found
-- touches: cart_item
alter table cart_item add unit_price decimal;

-- context: cart ordinary query
-- functionality: Adds cart_item.line_total column for storing quantity x unit_price totals.
-- name: q_0002
-- used-by: backend/src/controllers/cartController.js -> no direct exports.<fn>() reference found
-- touches: cart_item
alter table cart_item add line_total decimal;

-- context: cart ordinary query
-- functionality: Fetches the active cart row for a user by user_id and status='active'.
-- name: q_0003
-- used-by: backend/src/controllers/cartController.js -> exports.getCart()
-- touches: cart
select *
  from cart
 where user_id = $1
   and status = 'active';

-- context: cart ordinary query
-- functionality: Fetches cart items with product details, stock, effective unit price, and computed line total by cart_id.
-- name: q_0004
-- used-by: backend/src/controllers/cartController.js -> exports.getCart()
-- touches: cart_item, product
select ci.cart_item_id,
       ci.product_id,
       ci.quantity,
       p.product_name,
       p.photourl,
       p.unit,
       cast(coalesce(
          i.stock_quantity,
          0
       ) as int) as stock_quantity,
       coalesce(
          ci.unit_price,
          p.price
       ) as price,
       coalesce(
          ci.line_total,
          ci.quantity * coalesce(
             ci.unit_price,
             p.price
          )
       ) as line_total
  from cart_item ci
  join product p
on ci.product_id = p.product_id
   left join inventory i
on i.product_id = ci.product_id
    and i.warehouse_id = (
    select w.warehouse_id
       from warehouse w
      where w.region_id = $2
      limit 1
)
 where ci.cart_id = $1;

-- context: cart ordinary query
-- functionality: Returns active cart_id for a given user_id.
-- name: q_0005
-- used-by: backend/src/controllers/cartController.js -> exports.addToCart()
-- touches: cart
select cart_id
  from cart
 where user_id = $1
   and status = 'active';

-- context: cart ordinary query
-- functionality: Computes the next cart_id using max(cart_id)+1.
-- name: q_0006
-- used-by: backend/src/controllers/cartController.js -> exports.addToCart()
-- touches: cart
select coalesce(
   max(cart_id),
   0
) + 1 as next_id
  from cart;

-- context: cart ordinary query
-- functionality: Creates a new active cart row with cart_id, user_id, current timestamp, and status='active'.
-- name: q_0007
-- used-by: backend/src/controllers/cartController.js -> exports.addToCart()
-- touches: cart
insert into cart (
   cart_id,
   user_id,
   last_updated,
   status
) values ( $1,
           $2,
           now(),
           'active' );

-- context: cart ordinary query
-- functionality: Touches an existing cart by updating last_updated to now() for the given cart_id.
-- name: q_0008
-- used-by: backend/src/controllers/cartController.js -> exports.addToCart()
-- touches: cart
update cart
   set
   last_updated = now()
 where cart_id = $1;

-- context: cart ordinary query
-- functionality: Fetches an existing cart item and current product stock for a specific cart_id + product_id.
-- name: q_0009
-- used-by: backend/src/controllers/cartController.js -> exports.addToCart()
-- touches: cart_item, product
select ci.cart_item_id,
       ci.quantity,
       ci.unit_price,
          cast(coalesce(
               i.stock_quantity,
               0
          ) as int) as stock_quantity
  from cart_item ci
  join product p
on p.product_id = ci.product_id
   left join inventory i
on i.product_id = ci.product_id
    and i.warehouse_id = (
    select w.warehouse_id
       from warehouse w
      where w.region_id = $3
      limit 1
)
 where ci.cart_id = $1
   and ci.product_id = $2;

-- context: cart ordinary query
-- functionality: Fetches only stock_quantity from product for stock validation by product_id.
-- name: q_0010
-- used-by: backend/src/controllers/cartController.js -> no direct exports.<fn>() reference found
-- touches: product
select stock_quantity
  from product
 where product_id = $1;

-- context: cart ordinary query
-- functionality: Deletes a cart item row by cart_item_id.
-- name: q_0011
-- used-by: backend/src/controllers/cartController.js -> exports.addToCart()
-- touches: cart_item
delete from cart_item
 where cart_item_id = $1;

-- context: cart ordinary query
-- functionality: Fetches current product price by product_id when cart item unit_price is missing.
-- name: q_0012
-- used-by: backend/src/controllers/cartController.js -> exports.addToCart()
-- touches: product
select price
  from product
 where product_id = $1;

-- context: cart ordinary query
-- functionality: Updates an existing cart item's quantity, unit_price, and line_total by cart_item_id.
-- name: q_0013
-- used-by: backend/src/controllers/cartController.js -> exports.addToCart()
-- touches: cart_item
update cart_item
   set quantity = $1,
       unit_price = $2,
       line_total = $3
 where cart_item_id = $4;

-- context: cart ordinary query
-- functionality: Fetches product stock_quantity and price by product_id for first-time add-to-cart validation.
-- name: q_0014
-- used-by: backend/src/controllers/cartController.js -> exports.addToCart()
-- touches: product
select cast(coalesce(
   i.stock_quantity,
   0
) as int) as stock_quantity,
          p.price
   from product p
  left join inventory i
on i.product_id = p.product_id
   and i.warehouse_id = (
   select w.warehouse_id
     from warehouse w
    where w.region_id = $2
    limit 1
)
 where p.product_id = $1;

-- context: cart ordinary query
-- functionality: Inserts a new cart_item with generated cart_item_id, product quantity, unit_price, and line_total.
-- name: q_0015
-- used-by: backend/src/controllers/cartController.js -> exports.addToCart()
-- touches: cart_item
insert into cart_item (
   cart_item_id,
   cart_id,
   product_id,
   quantity,
   unit_price,
   line_total
) values ( (
   select coalesce(
      max(cart_item_id),
      0
   ) + 1
     from cart_item
),
           $1,
           $2,
           $3,
           $4,
           $5 );

-- context: cart ordinary query
-- functionality: Returns refreshed cart items with product metadata, stock, effective unit price, and line totals by cart_id.
-- name: q_0016
-- used-by: backend/src/controllers/cartController.js -> exports.addToCart()
-- touches: cart_item, checks., product
select ci.cart_item_id,
       ci.product_id,
       ci.quantity,
       p.product_name,
       p.photourl,
       p.unit,
       cast(coalesce(
          i.stock_quantity,
          0
       ) as int) as stock_quantity,
       coalesce(
          ci.unit_price,
          p.price
       ) as price,
       coalesce(
          ci.line_total,
          ci.quantity * coalesce(
             ci.unit_price,
             p.price
          )
       ) as line_total
  from cart_item ci
  join product p
on ci.product_id = p.product_id
   left join inventory i
on i.product_id = ci.product_id
    and i.warehouse_id = (
    select w.warehouse_id
       from warehouse w
      where w.region_id = $2
      limit 1
)
 where ci.cart_id = $1;

-- context: cart ordinary query
-- functionality: Fetches one cart item plus cart status, stock, and fallback product price for ownership and update checks.
-- name: q_0017
-- used-by: backend/src/controllers/cartController.js -> exports.updateCartItem()
-- touches: cart, cart_item, product
select ci.*,
       c.status,
          cast(coalesce(
               i.stock_quantity,
               0
          ) as int) as stock_quantity,
       p.price
  from cart_item ci
  join cart c
on ci.cart_id = c.cart_id
  join product p
on ci.product_id = p.product_id
   left join inventory i
on i.product_id = ci.product_id
    and i.warehouse_id = (
    select w.warehouse_id
       from warehouse w
      where w.region_id = (
         select u.region_id
            from users u
          where u.user_id = $2
      )
      limit 1
)
 where ci.cart_item_id = $1
   and c.user_id = $2
   and c.status = 'active';

-- context: cart ordinary query
-- functionality: Fetches the signed-in user's default operating region.
-- name: q_0020
-- used-by: backend/src/controllers/cartController.js -> no direct exports.<fn>() reference found
-- touches: users
select region_id
   from users
 where user_id = $1;

-- context: cart ordinary query
-- functionality: Deletes a cart item when requested quantity becomes zero or below.
-- name: q_0018
-- used-by: backend/src/controllers/cartController.js -> exports.updateCartItem()
-- touches: cart_item
delete from cart_item
 where cart_item_id = $1;

-- context: cart ordinary query
-- functionality: Persists cart item quantity change with recalculated unit_price and line_total by cart_item_id.
-- name: q_0019
-- used-by: backend/src/controllers/cartController.js -> exports.updateCartItem()
-- touches: cart_item
update cart_item
   set quantity = $1,
       unit_price = $2,
       line_total = $3
 where cart_item_id = $4;