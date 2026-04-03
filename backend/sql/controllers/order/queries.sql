-- Controller: order
-- File: queries.sql
-- Runtime PostgreSQL query registry loaded by backend/src/utils/sqlFileLoader.js
-- Used by backend/src/controllers/orderController.js; fetches/manages checkout and order lifecycle data across cart, order_item, delivery, inventory allocation, vouchers, warehouse, rider, and payment status tables.

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0001' for order controller runtime.
-- name: q_0001
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: rider_payment_confirmation
create table if not exists rider_payment_confirmation (
   order_id           int primary key
      references orders ( order_id )
         on delete cascade,
   rider_id           int not null
      references rider ( rider_id ),
   rider_message      text not null,
   sent_at            timestamp default now(),
   admin_confirmed_at timestamp,
   admin_confirmed_by int
      references admin ( admin_id )
);

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0002' for order controller runtime.
-- name: q_0002
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: delivery_inventory_allocation
create table if not exists delivery_inventory_allocation (
   allocation_id      serial primary key,
   delivery_id        int not null
      references delivery ( delivery_id )
         on delete cascade,
   order_id           int not null
      references orders ( order_id )
         on delete cascade,
   product_id         int not null
      references product ( product_id ),
   warehouse_id       int not null
      references warehouse ( warehouse_id ),
   allocated_quantity int not null check ( allocated_quantity > 0 ),
   created_at         timestamp default now()
);

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0003' for order controller runtime.
-- name: q_0003
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: inventory
create unique index if not exists ux_inventory_product_warehouse on
   inventory (
      product_id,
      warehouse_id
   );

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0004' for order controller runtime.
-- name: q_0004
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: warehouse
alter table warehouse add column if not exists region_id int;

do $$
begin
   if not exists (
      select 1
        from pg_constraint
       where conname = 'fk_warehouse_region'
   ) then
      alter table warehouse
         add constraint fk_warehouse_region
            foreign key ( region_id )
               references region ( region_id );
   end if;
end;
$$;

create unique index if not exists ux_warehouse_region_id on warehouse ( region_id );

insert into warehouse (
   warehouse_id,
   name,
   location,
   region_id
) values ( 1,
           'Dhaka North',
           'Dhaka North',
           1 ),
         ( 2,
           'Dhaka South',
           'Dhaka South',
           2 ),
         ( 3,
           'Chattogram',
           'Chattogram',
           3 ),
         ( 4,
           'Khulna',
           'Khulna',
           4 ),
         ( 5,
           'Rajshahi',
           'Rajshahi',
           5 )
on conflict ( warehouse_id )
   do update
      set name = excluded.name,
          location = excluded.location,
          region_id = excluded.region_id;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0005' for order controller runtime.
-- name: q_0005
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: inventory, product
select p.product_id,
       cast(coalesce(
          p.stock_quantity,
          0
       ) as int) as stock_quantity
  from product p
  left join inventory i
on i.product_id = p.product_id
 group by p.product_id,
          p.stock_quantity
having count(i.inventory_id) = 0;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0006' for order controller runtime.
-- name: q_0006
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: inventory
insert into inventory (
   inventory_id,
   product_id,
   warehouse_id,
   stock_quantity,
   last_updated
)
   select (
      select coalesce(
         max(inventory_id),
         0
      ) + 1
        from inventory
   ),
          $1,
          $2,
          $3,
          now()
    where not exists (
      select 1
        from inventory i
       where i.product_id = $1
         and i.warehouse_id = $2
   );

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0007' for order controller runtime.
-- name: q_0007
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: order_item, orders, product, users
select o.order_id,
       o.total_price,
       o.delivery_address,
       o.order_date,
       u.name as customer_name,
       u.email as customer_email,
       (
          select coalesce(
             json_agg(json_build_object(
                'product_name',
                p.product_name,
                'quantity',
                oi.quantity,
                'unit_price',
                oi.unit_price,
                'subtotal',
                oi.subtotal
             )),
             cast('[]' as json)
          )
            from order_item oi
            join product p
          on p.product_id = oi.product_id
           where oi.order_id = o.order_id
       ) as items
  from orders o
  join users u
on u.user_id = o.user_id
 where o.order_id = $1;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0008' for order controller runtime.
-- name: q_0008
-- used-by: backend/src/controllers/orderController.js -> exports.getMyOrders()
-- touches: order_item, orders, product
select o.*,
       (
          select json_agg(json_build_object(
             'product_name',
             p.product_name,
             'quantity',
             oi.quantity,
             'unit_price',
             oi.unit_price
          ))
            from order_item oi
            join product p
          on oi.product_id = p.product_id
           where oi.order_id = o.order_id
       ) as items
  from orders o
 where user_id = $1
 order by order_date desc;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0009' for order controller runtime.
-- name: q_0009
-- used-by: backend/src/controllers/orderController.js -> exports.getAssignedOrders()
-- touches: delivery, delivery_inventory_allocation, order_item, orders, product, rider_payment_confirmation
select o.*,
       d.delivery_id,
       d.delivery_status,
       d.warehouse_id,
       rpc.rider_message as rider_payment_message,
       rpc.sent_at as rider_payment_sent_at,
       rpc.admin_confirmed_at,
       (
          select coalesce(
             json_agg(json_build_object(
                'warehouse_id',
                dia.warehouse_id,
                'product_id',
                dia.product_id,
                'product_name',
                p.product_name,
                'allocated_quantity',
                dia.allocated_quantity
             )),
             cast('[]' as json)
          )
            from delivery_inventory_allocation dia
            join product p
          on p.product_id = dia.product_id
           where dia.order_id = o.order_id
       ) as warehouse_allocations,
       (
          select json_agg(json_build_object(
             'product_name',
             p.product_name,
             'quantity',
             oi.quantity,
             'unit_price',
             oi.unit_price
          ))
            from order_item oi
            join product p
          on oi.product_id = p.product_id
           where oi.order_id = o.order_id
       ) as items
  from orders o
  join delivery d
on o.order_id = d.order_id
  left join rider_payment_confirmation rpc
on rpc.order_id = o.order_id
 where d.rider_id = $1
 order by o.order_date desc;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0010' for order controller runtime.
-- name: q_0010
-- used-by: backend/src/controllers/orderController.js -> exports.getAvailableOrders()
-- touches: delivery, order_item, orders, product, rider
select o.*,
       (
          select json_agg(json_build_object(
             'product_name',
             p.product_name,
             'quantity',
             oi.quantity,
             'unit_price',
             oi.unit_price
          ))
            from order_item oi
            join product p
          on oi.product_id = p.product_id
           where oi.order_id = o.order_id
       ) as items
  from orders o
  join rider r
on r.rider_id = $1
 where order_status = 'pending'
   and o.region_id = r.region_id
   and order_id not in (
   select order_id
     from delivery
)
 order by order_date desc;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0011' for order controller runtime.
-- name: q_0011
-- used-by: backend/src/controllers/orderController.js -> exports.startDelivery()
-- touches: delivery
select *
  from delivery
 where order_id = $1
   and rider_id = $2;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0012' for order controller runtime.
-- name: q_0012
-- used-by: backend/src/controllers/orderController.js -> exports.startDelivery()
-- touches: orders
update orders
   set
   order_status = 'delivering'
 where order_id = $1;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0013' for order controller runtime.
-- name: q_0013
-- used-by: backend/src/controllers/orderController.js -> exports.startDelivery()
-- touches: delivery
update delivery
   set
   delivery_status = 'delivering'
 where order_id = $1;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0014' for order controller runtime.
-- name: q_0014
-- used-by: backend/src/controllers/orderController.js -> exports.completeDelivery()
-- touches: delivery
select *
  from delivery
 where order_id = $1
   and rider_id = $2;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0015' for order controller runtime.
-- name: q_0015
-- used-by: backend/src/controllers/orderController.js -> exports.completeDelivery()
-- touches: orders
select *
  from orders
 where order_id = $1;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0016' for order controller runtime.
-- name: q_0016
-- used-by: backend/src/controllers/orderController.js -> exports.completeDelivery()
-- touches: orders
update orders
   set order_status = 'delivered',
       payment_status =
          case
             when payment_status = 'paid' then
                'paid'
             else
                'collected'
          end
 where order_id = $1;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0017' for order controller runtime.
-- name: q_0017
-- used-by: backend/src/controllers/orderController.js -> exports.completeDelivery()
-- touches: delivery
update delivery
   set delivery_status = 'delivered',
       delivered_at = now()
 where order_id = $1;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0018' for order controller runtime.
-- name: q_0018
-- used-by: backend/src/controllers/orderController.js -> exports.completeDelivery()
-- touches: rider_payment_confirmation
update rider_payment_confirmation
   set rider_id = $2,
       rider_message = $3,
       sent_at = now(),
       admin_confirmed_at = null,
       admin_confirmed_by = null
 where order_id = $1;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0018_insert' for order controller runtime.
-- name: q_0018_insert
-- used-by: backend/src/controllers/orderController.js -> exports.completeDelivery()
-- touches: rider_payment_confirmation
insert into rider_payment_confirmation (
   order_id,
   rider_id,
   rider_message,
   sent_at,
   admin_confirmed_at,
   admin_confirmed_by
) values ( $1,
           $2,
           $3,
           now(),
           null,
           null );

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0019' for order controller runtime.
-- name: q_0019
-- used-by: backend/src/controllers/orderController.js -> exports.confirmPayment()
-- touches: orders
select *
  from orders
 where order_id = $1;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0020' for order controller runtime.
-- name: q_0020
-- used-by: backend/src/controllers/orderController.js -> exports.confirmPayment()
-- touches: rider_payment_confirmation
select *
  from rider_payment_confirmation
 where order_id = $1;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0021' for order controller runtime.
-- name: q_0021
-- used-by: backend/src/controllers/orderController.js -> exports.confirmPayment()
-- touches: orders
update orders
   set
   payment_status = 'paid'
 where order_id = $1;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0022' for order controller runtime.
-- name: q_0022
-- used-by: backend/src/controllers/orderController.js -> exports.confirmPayment()
-- touches: rider_payment_confirmation
update rider_payment_confirmation
   set admin_confirmed_at = now(),
       admin_confirmed_by = $2
 where order_id = $1;

-- context: order ordinary query
-- functionality: Executes SQL block 'q_0023' for order controller runtime.
-- name: q_0023
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: inventory, product
update product
   set
   stock_quantity = (
      select coalesce(
         sum(stock_quantity),
         0
      )
        from inventory
       where product_id = $1
   )
 where product_id = $1;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0024' for order controller runtime.
-- name: q_0024
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: product_discounts
select product_discount_id,
       product_id,
       discount_type,
       discount_value,
       max_discount_amount,
       start_at,
       end_at,
       is_active
  from product_discounts
 where product_id = any ( $1 )
   and is_active = true
   and ( start_at is null
    or start_at <= now() )
   and ( end_at is null
    or end_at >= now() );


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0025' for order controller runtime.
-- name: q_0025
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: vouchers
select *
  from vouchers
 where upper(code) = upper($1);


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0026' for order controller runtime.
-- name: q_0026
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: voucher_usage_history
select cast(count(*) as int) as usage_count
  from voucher_usage_history
 where voucher_id = $1
   and user_id = $2;

-- context: order ordinary query
-- functionality: Executes SQL block 'calc_cart_select_base' for order controller runtime.
-- name: calc_cart_select_base
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: cart
select cart_id
  from cart
 where user_id = $1
   and status = 'active';

-- context: order ordinary query
-- functionality: Executes SQL block 'calc_cart_select_for_update' for order controller runtime.
-- name: calc_cart_select_for_update
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: cart
select cart_id
  from cart
 where user_id = $1
   and status = 'active'
for update;

-- context: order ordinary query
-- functionality: Executes SQL block 'calc_cart_items_base' for order controller runtime.
-- name: calc_cart_items_base
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: cart_item, product
select ci.product_id,
   ci.cart_item_id,
       ci.quantity,
       coalesce(
          ci.unit_price,
          p.price
       ) as base_unit_price,
       p.product_name,
       coalesce(
          p.stock_quantity,
          0
       ) as fallback_stock_quantity
  from cart_item ci
  join product p
on p.product_id = ci.product_id
 where ci.cart_id = $1;

-- context: order ordinary query
-- functionality: Executes SQL block 'calc_cart_items_for_update' for order controller runtime.
-- name: calc_cart_items_for_update
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: cart_item, product
select ci.product_id,
   ci.cart_item_id,
       ci.quantity,
       coalesce(
          ci.unit_price,
          p.price
       ) as base_unit_price,
       p.product_name,
       coalesce(
          p.stock_quantity,
          0
       ) as fallback_stock_quantity
  from cart_item ci
  join product p
on p.product_id = ci.product_id
 where ci.cart_id = $1
for update of ci;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0027' for order controller runtime.
-- name: q_0027
-- used-by: backend/src/controllers/orderController.js -> exports.checkout()
-- touches: none detected (utility/ddl/query wrapper)
START TRANSACTION;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0028' for order controller runtime.
-- name: q_0028
-- used-by: backend/src/controllers/orderController.js -> exports.checkout()
-- touches: inventory
select cast(coalesce(
   i.stock_quantity,
   0
) as int) as total_stock
  from inventory i
 where i.product_id = $1
   and i.warehouse_id = $2;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0029' for order controller runtime.
-- name: q_0029
-- used-by: backend/src/controllers/orderController.js -> exports.checkout()
-- touches: none detected (utility/ddl/query wrapper)
rollback;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0030' for order controller runtime.
-- name: q_0030
-- used-by: backend/src/controllers/orderController.js -> exports.checkout()
-- touches: orders
select coalesce(
   max(order_id),
   0
) + 1 as next_id
  from orders;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0031' for order controller runtime.
-- name: q_0031
-- used-by: backend/src/controllers/orderController.js -> exports.checkout()
-- touches: orders
insert into orders (
   order_id,
   user_id,
   total_price,
   order_status,
   payment_status,
   order_date,
   delivery_address,
   preferred_delivery_time,
   subtotal_before_discount,
   product_discount_total,
   voucher_discount_total,
   voucher_code,
   region_id
) values ( $1,
           $2,
           $3,
           'pending',
           'unpaid',
           now(),
           $4,
           $5,
           $6,
           $7,
           $8,
           $9,
           $10 );


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0032' for order controller runtime.
-- name: q_0032
-- used-by: backend/src/controllers/orderController.js -> exports.checkout()
-- touches: order_item
select coalesce(
   max(order_item_id),
   0
) as max_id
  from order_item;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0033' for order controller runtime.
-- name: q_0033
-- used-by: backend/src/controllers/orderController.js -> exports.checkout()
-- touches: order_item
insert into order_item (
   order_item_id,
   order_id,
   product_id,
   quantity,
   unit_price,
   subtotal,
   original_unit_price,
   product_discount_per_unit,
   applied_product_discount_id
) values ( $1,
           $2,
           $3,
           $4,
           $5,
           $6,
           $7,
           $8,
           $9 );


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0034' for order controller runtime.
-- name: q_0034
-- used-by: backend/src/controllers/orderController.js -> exports.checkout()
-- touches: voucher_usage_history
select coalesce(
   max(usage_id),
   0
) + 1 as next_id
  from voucher_usage_history;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0035' for order controller runtime.
-- name: q_0035
-- used-by: backend/src/controllers/orderController.js -> exports.checkout()
-- touches: voucher_usage_history
insert into voucher_usage_history (
   usage_id,
   voucher_id,
   user_id,
   order_id,
   voucher_code,
   discount_amount,
   used_at
) values ( $1,
           $2,
           $3,
           $4,
           $5,
           $6,
           now() );


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0036' for order controller runtime.
-- name: q_0036
-- used-by: backend/src/controllers/orderController.js -> exports.checkout()
-- touches: cart
update cart
   set
   status = 'ordered'
 where cart_id = $1;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0037' for order controller runtime.
-- name: q_0037
-- used-by: backend/src/controllers/orderController.js -> exports.checkout()
-- touches: none detected (utility/ddl/query wrapper)
commit;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0038' for order controller runtime.
-- name: q_0038
-- used-by: backend/src/controllers/orderController.js -> exports.checkout()
-- touches: none detected (utility/ddl/query wrapper)
rollback;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0039' for order controller runtime.
-- name: q_0039
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: none detected (utility/ddl/query wrapper)
START TRANSACTION;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0040' for order controller runtime.
-- name: q_0040
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: delivery, orders
select o.order_id
  from delivery d
  join orders o
on o.order_id = d.order_id
 where d.rider_id = $1
   and d.delivery_status = 'delivered'
   and o.payment_status <> 'paid';


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0041' for order controller runtime.
-- name: q_0041
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: none detected (utility/ddl/query wrapper)
rollback;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0042' for order controller runtime.
-- name: q_0042
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: warehouse
select warehouse_id
  from warehouse
 where warehouse_id = $1;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0043' for order controller runtime.
-- name: q_0043
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: none detected (utility/ddl/query wrapper)
rollback;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0044' for order controller runtime.
-- name: q_0044
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: orders
select *
  from orders
 where order_id = $1
for update;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0045' for order controller runtime.
-- name: q_0045
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: none detected (utility/ddl/query wrapper)
rollback;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0046' for order controller runtime.
-- name: q_0046
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: none detected (utility/ddl/query wrapper)
rollback;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0047' for order controller runtime.
-- name: q_0047
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: delivery
select *
  from delivery
 where order_id = $1;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0048' for order controller runtime.
-- name: q_0048
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: none detected (utility/ddl/query wrapper)
rollback;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0049' for order controller runtime.
-- name: q_0049
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: order_item, product
select oi.product_id,
       oi.quantity,
       p.product_name
  from order_item oi
  join product p
on p.product_id = oi.product_id
 where oi.order_id = $1;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0050' for order controller runtime.
-- name: q_0050
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: none detected (utility/ddl/query wrapper)
rollback;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0051' for order controller runtime.
-- name: q_0051
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: inventory
select i.stock_quantity
  from inventory i
 where i.product_id = $1
   and i.warehouse_id = $2
for update;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0052' for order controller runtime.
-- name: q_0052
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: none detected (utility/ddl/query wrapper)
rollback;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0053' for order controller runtime.
-- name: q_0053
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: inventory
select i.warehouse_id,
       i.stock_quantity
  from inventory i
 where i.product_id = $1
   and i.stock_quantity > 0
 order by
   case
      when cast($2 as int) is not null
         and i.warehouse_id = $2 then
         0
      else
         1
   end,
   i.stock_quantity desc,
   i.warehouse_id asc
for update;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0054' for order controller runtime.
-- name: q_0054
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: none detected (utility/ddl/query wrapper)
rollback;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0055' for order controller runtime.
-- name: q_0055
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: delivery
select coalesce(
   max(delivery_id),
   0
) + 1 as next_id
  from delivery;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0056' for order controller runtime.
-- name: q_0056
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: delivery
insert into delivery (
   delivery_id,
   order_id,
   rider_id,
   delivery_status,
   warehouse_id,
   assigned_at
) values ( $1,
           $2,
           $3,
           'assigned',
           $4,
           now() );


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0057' for order controller runtime.
-- name: q_0057
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: inventory
update inventory
   set stock_quantity = stock_quantity - $1,
       last_updated = now()
 where product_id = $2
   and warehouse_id = $3
   and stock_quantity >= $1;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0058' for order controller runtime.
-- name: q_0058
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: none detected (utility/ddl/query wrapper)
rollback;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0059' for order controller runtime.
-- name: q_0059
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: delivery_inventory_allocation
insert into delivery_inventory_allocation (
   delivery_id,
   order_id,
   product_id,
   warehouse_id,
   allocated_quantity
) values ( $1,
           $2,
           $3,
           $4,
           $5 );


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0060' for order controller runtime.
-- name: q_0060
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: orders
update orders
   set
   order_status = 'assigned'
 where order_id = $1;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0061' for order controller runtime.
-- name: q_0061
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: none detected (utility/ddl/query wrapper)
commit;


-- context: order ordinary query
-- functionality: Executes SQL block 'q_0062' for order controller runtime.
-- name: q_0062
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: none detected (utility/ddl/query wrapper)
rollback;

-- context: order ordinary query
-- functionality: Returns all predefined regions for checkout/rider assignment filtering.
-- name: q_0063
-- used-by: backend/src/controllers/orderController.js -> exports.getRegions()
-- touches: region
select region_id,
       region_name
  from region
 where region_id <> 6
 order by region_name asc;

-- context: order ordinary query
-- functionality: Checks whether a region_id exists.
-- name: q_0064
-- used-by: backend/src/controllers/orderController.js -> exports.checkout()
-- touches: region
select region_id
  from region
 where region_id = $1;

-- context: order ordinary query
-- functionality: Fetches rider region_id by rider_id for region-safe assignment checks.
-- name: q_0065
-- used-by: backend/src/controllers/orderController.js -> exports.selfAssignOrder()
-- touches: rider
select region_id
  from rider
 where rider_id = $1;

-- context: order ordinary query
-- functionality: Resolves the single warehouse mapped to a specific region.
-- name: q_0066
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: warehouse
select warehouse_id,
          name,
          region_id
   from warehouse
 where region_id = $1
 limit 1;

-- context: order ordinary query
-- functionality: Lists all region-mapped warehouses for bootstrap inventory seeding.
-- name: q_0067
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: warehouse
select warehouse_id,
          name,
          region_id
   from warehouse
 where region_id is not null
 order by warehouse_id;

-- context: order ordinary query
-- functionality: Fetches stock for a product in a specific warehouse with row lock.
-- name: q_0068
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: inventory
select cast(coalesce(
    stock_quantity,
    0
) as int) as stock_quantity
   from inventory
 where product_id = $1
    and warehouse_id = $2
for update;

-- context: order ordinary query
-- functionality: Decrements stock in a specific warehouse only if enough stock exists.
-- name: q_0069
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: inventory
update inventory
    set stock_quantity = stock_quantity - $3,
          last_updated = now()
 where product_id = $1
    and warehouse_id = $2
    and stock_quantity >= $3;

-- context: order ordinary query
-- functionality: Deletes a cart item row by cart_item_id for checkout region reconciliation.
-- name: q_0070
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: cart_item
delete from cart_item
 where cart_item_id = $1;

-- context: order ordinary query
-- functionality: Updates cart item quantity and line_total by cart_item_id for region reconciliation.
-- name: q_0071
-- used-by: backend/src/controllers/orderController.js -> no direct exports.<fn>() reference found
-- touches: cart_item
update cart_item
    set quantity = $1,
          line_total = $2
 where cart_item_id = $3;

-- context: order ordinary query
-- functionality: Persists the user's active region so subsequent cart operations enforce selected region stock.
-- name: q_0072
-- used-by: backend/src/controllers/orderController.js -> exports.checkout(), exports.revalidateCartRegion()
-- touches: users
update users
    set region_id = $1
 where user_id = $2;