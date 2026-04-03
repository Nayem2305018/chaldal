-- Controller: admin
-- File: queries.sql
-- Runtime PostgreSQL query registry loaded by backend/src/utils/sqlFileLoader.js
-- Used by backend/src/controllers/adminController.js; fetches/manages admin dashboard data including orders, deliveries, riders/rider requests, products/inventory, vouchers, warehouses, and analytics summaries.

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0001' for admin controller runtime.
-- name: q_0001
-- used-by: backend/src/controllers/adminController.js -> no direct exports.<fn>() reference found
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

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0002' for admin controller runtime.
-- name: q_0002
-- used-by: backend/src/controllers/adminController.js -> no direct exports.<fn>() reference found
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

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0003' for admin controller runtime.
-- name: q_0003
-- used-by: backend/src/controllers/adminController.js -> no direct exports.<fn>() reference found
-- touches: inventory
create unique index if not exists ux_inventory_product_warehouse on
   inventory (
      product_id,
      warehouse_id
   );

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0004' for admin controller runtime.
-- name: q_0004
-- used-by: backend/src/controllers/adminController.js -> no direct exports.<fn>() reference found
-- touches: warehouse
-- alter table warehouse add column if not exists region_id int;

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

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0005' for admin controller runtime.
-- name: q_0005
-- used-by: backend/src/controllers/adminController.js -> no direct exports.<fn>() reference found
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

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0006' for admin controller runtime.
-- name: q_0006
-- used-by: backend/src/controllers/adminController.js -> no direct exports.<fn>() reference found
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

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0007' for admin controller runtime.
-- name: q_0007
-- used-by: backend/src/controllers/adminController.js -> no direct exports.<fn>() reference found
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

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0008' for admin controller runtime.
-- name: q_0008
-- used-by: backend/src/controllers/adminController.js -> exports.getRiderRequests()
-- touches: region, rider_requests
select rr.request_id,
       rr.name,
       rr.email,
       rr.phone,
       rr.appointment_code,
       rr.region_id,
       rg.region_name,
       rr.status,
       rr.created_at
  from rider_requests rr
  left join region rg
on rr.region_id = rg.region_id
 where rr.status = 'pending'
 order by created_at desc;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0009' for admin controller runtime.
-- name: q_0009
-- used-by: backend/src/controllers/adminController.js -> exports.approveRider()
-- touches: rider_requests
select *
  from rider_requests
 where request_id = $1
   and status = 'pending';

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0010' for admin controller runtime.
-- name: q_0010
-- used-by: backend/src/controllers/adminController.js -> exports.approveRider()
-- touches: rider
select coalesce(
   max(rider_id),
   0
) + 1 as next_id
  from rider;

-- context: admin ordinary query
-- functionality: Executes SQL block 'insert_approved_rider' for admin controller runtime.
-- name: insert_approved_rider
-- used-by: backend/src/controllers/adminController.js -> exports.approveRider()
-- touches: rider
insert into rider (
   rider_id,
   rider_name,
   email,
   password_hash,
   phone,
   appointment_code,
   region_id,
   current_status,
   created_at
) values ( $1,
           $2,
           $3,
           $4,
           $5,
           $6,
           $7,
           'available',
           now() );

-- context: admin ordinary query
-- functionality: Executes SQL block 'select_rider_by_id' for admin controller runtime.
-- name: select_rider_by_id
-- used-by: backend/src/controllers/adminController.js -> exports.approveRider()
-- touches: rider
select rider_id,
       rider_name,
       email,
       phone,
       region_id,
       current_status
  from rider
 where rider_id = $1;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0011' for admin controller runtime.
-- name: q_0011
-- used-by: backend/src/controllers/adminController.js -> exports.approveRider()
-- touches: rider_requests
update rider_requests
   set status = 'approved',
       reviewed_at = now(),
       reviewed_by = $1
 where request_id = $2;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0012' for admin controller runtime.
-- name: q_0012
-- used-by: backend/src/controllers/adminController.js -> exports.rejectRider()
-- touches: rider_requests
update rider_requests
   set status = 'rejected',
       reviewed_at = now(),
       reviewed_by = $1
 where request_id = $2
   and status = 'pending';

-- context: admin ordinary query
-- functionality: Executes SQL block 'select_rider_request_by_id' for admin controller runtime.
-- name: select_rider_request_by_id
-- used-by: backend/src/controllers/adminController.js -> exports.rejectRider()
-- touches: rider_requests
select request_id,
       name,
       email,
       status
  from rider_requests
 where request_id = $1;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0013' for admin controller runtime.
-- name: q_0013
-- used-by: backend/src/controllers/adminController.js -> exports.getAllRiders()
-- touches: rider
select rider_id,
       rider_name,
       email,
       phone,
       current_status,
       created_at
  from rider
 order by created_at desc;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0014' for admin controller runtime.
-- name: q_0014
-- used-by: backend/src/controllers/adminController.js -> exports.getAllUsers()
-- touches: users
select user_id,
       name,
       email,
       phone,
       created_at
  from users
 order by created_at desc;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0015' for admin controller runtime.
-- name: q_0015
-- used-by: backend/src/controllers/adminController.js -> exports.updateRiderStatus()
-- touches: rider
update rider
   set
   current_status = $1
 where rider_id = $2;

-- context: admin ordinary query
-- functionality: Executes SQL block 'select_rider_status_by_id' for admin controller runtime.
-- name: select_rider_status_by_id
-- used-by: backend/src/controllers/adminController.js -> exports.updateRiderStatus()
-- touches: rider
select rider_id,
       rider_name,
       email,
       current_status
  from rider
 where rider_id = $1;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0016' for admin controller runtime.
-- name: q_0016
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: users
select count(*) as count
  from users;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0017' for admin controller runtime.
-- name: q_0017
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: rider
select count(*) as count
  from rider;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0018' for admin controller runtime.
-- name: q_0018
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: rider_requests
select count(*) as count
  from rider_requests
 where status = 'pending';

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0019' for admin controller runtime.
-- name: q_0019
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: orders
select count(*) as count
  from orders;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0020' for admin controller runtime.
-- name: q_0020
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: orders
select coalesce(
   sum(total_price),
   0
) as revenue
  from orders
 where lower(coalesce(
   payment_status,
   ''
)) = 'paid';

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0021' for admin controller runtime.
-- name: q_0021 low stock quantity products
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: inventory, product
select p.product_id,
       p.product_name,
       cast(coalesce(
          sum(i.stock_quantity),
          0
       ) as int) as stock_quantity
  from product p
  left join inventory i
on i.product_id = p.product_id
 group by p.product_id,
          p.product_name
having coalesce(
   sum(i.stock_quantity),
   0
) < 10
 order by stock_quantity asc;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0022' for admin controller runtime.
-- name: q_0022 discount product results
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: product, product_discounts
select pd.product_discount_id,
       pd.product_id,
       p.product_name,
       p.price,
       pd.discount_type,
       pd.discount_value,
       pd.max_discount_amount,
       pd.start_at,
       pd.end_at,
       pd.is_active,
       cast(calc.discount_amount as numeric(10,
            2)) as product_discount_amount,
       cast(greatest(
          p.price - calc.discount_amount,
          0
       ) as numeric(10,
            2)) as discounted_price
  from product_discounts pd
  join product p
on p.product_id = pd.product_id
 cross join lateral (
   select cast(least(
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
     2)) as discount_amount
) calc
 where pd.is_active = true
   and ( pd.start_at is null
    or pd.start_at <= now() )
   and ( pd.end_at is null
    or pd.end_at >= now() )
 order by calc.discount_amount desc;

-- q_0023 context: Revenue Analytics
-- functionality: Returns daily paid revenue trend (date, revenue).
-- name: q_0023
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: analytics_daily_revenue
select to_char(
   revenue_date,
   'YYYY-MM-DD'
) as revenue_date,
       total_revenue,
       total_orders
  from analytics_daily_revenue();

-- q_0024 context: Revenue Analytics
-- functionality: Returns current-month paid revenue and order count summary.
-- name: q_0024
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: analytics_monthly_revenue_summary
select *
  from analytics_monthly_revenue_summary ( current_date );

-- q_0067 context: Revenue Analytics
-- functionality: Returns paid revenue and paid order count for all calendar months.
-- name: q_0067
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: analytics_monthly_revenue_summary
SELECT
   to_char(m.month_start, 'FMMonth') AS month_name,
   to_char(m.month_start, 'YYYY-MM-01') AS month_key,
    COALESCE(ms.total_revenue, 0)::numeric(14,2) AS total_revenue,
    COALESCE(ms.total_orders, 0)::bigint AS total_orders
FROM (
   SELECT (date_trunc('month', current_date) - make_interval(months => gs.idx))::date AS month_start
    FROM generate_series(0, 11) AS gs(idx)
) m
LEFT JOIN LATERAL analytics_monthly_revenue_summary(m.month_start::date) ms ON TRUE
ORDER BY m.month_start DESC;

-- q_0025 context: Product Analytics
-- functionality: Returns top 5 products by quantity sold.
-- name: q_0025
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: analytics_top_selling_products
select *
  from analytics_top_selling_products ( 5 );

-- q_0026 context: User Analytics
-- functionality: Returns top 5 most active users by total orders.
-- name: q_0026
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: analytics_most_active_users
select *
  from analytics_most_active_users ( 5 );

-- q_0027 context: Rider Performance Analytics
-- functionality: Returns completed deliveries and earnings per rider.
-- name: q_0027
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: analytics_rider_performance
select *
  from analytics_rider_performance();

-- q_0028 context: Order Insights
-- functionality: Returns order status distribution counts.
-- name: q_0028
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: analytics_order_status_distribution
select *
  from analytics_order_status_distribution();

-- q_0029 context: Order Insights
-- functionality: Returns busiest order hours by volume.
-- name: q_0029
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: analytics_peak_order_hours
select *
  from analytics_peak_order_hours();

-- q_0030 context: Warehouse Analytics
-- functionality: Returns delivery workload by warehouse.
-- name: q_0030
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: analytics_warehouse_workload
select *
  from analytics_warehouse_workload();

-- q_0031 context: Average Order Value
-- functionality: Returns average paid order value.
-- name: q_0031
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: none detected (utility/ddl/query wrapper)
select analytics_average_order_value() as average_order_value;

-- q_0032 context: Monthly Report
-- functionality: Returns structured JSON monthly report (revenue, orders, AOV).
-- name: q_0032
-- used-by: backend/src/controllers/adminController.js -> exports.getDashboardStats()
-- touches: none detected (utility/ddl/query wrapper)
select analytics_monthly_report_json(current_date) as report;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0033' for admin controller runtime.
-- name: q_0033
-- used-by: backend/src/controllers/adminController.js -> exports.createProduct()
-- touches: product
select coalesce(
   max(product_id),
   0
) + 1 as next_id
  from product;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0034' for admin controller runtime.
-- name: q_0034
-- used-by: backend/src/controllers/adminController.js -> exports.createProduct()
-- touches: product
insert into product (
   product_id,
   product_name,
   price,
   stock_quantity,
   category_id,
   photourl
) values ( $1,
           $2,
           $3,
           $4,
           $5,
           $6 );

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0035' for admin controller runtime.
-- name: q_0035
-- used-by: backend/src/controllers/adminController.js -> exports.updateProduct()
-- touches: product
update product
   set product_name = coalesce(
   $1,
   product_name
),
       price = coalesce(
          $2,
          price
       ),
       stock_quantity = coalesce(
          $3,
          stock_quantity
       ),
       category_id = coalesce(
          $4,
          category_id
       ),
       photourl = coalesce(
          $5,
          photourl
       )
 where product_id = $6;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0036' for admin controller runtime.
-- name: q_0036
-- used-by: backend/src/controllers/adminController.js -> exports.deleteProduct()
-- touches: product
delete from product
 where product_id = $1;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0037' for admin controller runtime.
-- name: q_0037
-- used-by: backend/src/controllers/adminController.js -> exports.getOrders()
-- touches: delivery, delivery_inventory_allocation, order_item, orders, product, rider_payment_confirmation
select o.*,
       d.rider_id,
       d.warehouse_id,
       d.delivery_status,
       rpc.rider_message as rider_payment_message,
       rpc.sent_at as rider_payment_sent_at,
       rpc.admin_confirmed_at,
       rpc.admin_confirmed_by,
       (
          select coalesce(
             json_agg(json_build_object(
                'warehouse_id',
                dia.warehouse_id,
                'product_id',
                dia.product_id,
                'product_name',
                p2.product_name,
                'allocated_quantity',
                dia.allocated_quantity
             )),
             cast('[]' as json)
          )
            from delivery_inventory_allocation dia
            join product p2
          on p2.product_id = dia.product_id
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
  left join delivery d
on o.order_id = d.order_id
  left join rider_payment_confirmation rpc
on rpc.order_id = o.order_id
 order by o.order_date desc;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0038' for admin controller runtime.
-- name: q_0038
-- used-by: backend/src/controllers/adminController.js -> exports.updateOrder()
-- touches: orders
update orders
   set
   order_status = $1
 where order_id = $2;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0039' for admin controller runtime.
-- name: q_0039
-- used-by: backend/src/controllers/adminController.js -> exports.getInventorySummary()
-- touches: inventory, product, warehouse
select p.product_id,
       p.product_name,
       p.price,
       cast(coalesce(
          sum(i.stock_quantity),
          0
       ) as int) as total_stock,
       coalesce(
          json_agg(json_build_object(
             'warehouse_id',
             w.warehouse_id,
             'region_id',
             w.region_id,
             'region_name',
             r.region_name,
             'warehouse_name',
             w.name,
             'stock_quantity',
             cast(coalesce(
                i.stock_quantity,
                0
             ) as int)
          )),
          cast('[]' as json)
       ) as warehouses
  from product p
 cross join warehouse w
   left join region r
on r.region_id = w.region_id
  left join inventory i
on i.product_id = p.product_id
   and i.warehouse_id = w.warehouse_id
 group by p.product_id,
          p.product_name,
          p.price
 order by p.product_id;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0040' for admin controller runtime.
-- name: q_0040
-- used-by: backend/src/controllers/adminController.js -> exports.getInventorySummary()
-- touches: inventory, warehouse
select w.warehouse_id,
   w.region_id,
   r.region_name,
       w.name as warehouse_name,
       cast(coalesce(
          sum(i.stock_quantity),
          0
       ) as int) as total_stock
  from warehouse w
   left join region r
on r.region_id = w.region_id
  left join inventory i
on i.warehouse_id = w.warehouse_id
 group by w.warehouse_id,
               w.region_id,
               r.region_name,
          w.name
 order by w.warehouse_id;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0041' for admin controller runtime.
-- name: q_0041
-- used-by: backend/src/controllers/adminController.js -> exports.updateInventoryStock()
-- touches: product
select product_id
  from product
 where product_id = $1;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0042' for admin controller runtime.
-- name: q_0042
-- used-by: backend/src/controllers/adminController.js -> exports.updateInventoryStock()
-- touches: warehouse
select warehouse_id
  from warehouse
 where warehouse_id = $1;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0043' for admin controller runtime.
-- name: q_0043
-- used-by: backend/src/controllers/adminController.js -> exports.updateInventoryStock()
-- touches: inventory
update inventory
   set stock_quantity = $3,
       last_updated = now()
 where product_id = $1
   and warehouse_id = $2;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0043_insert' for admin controller runtime.
-- name: q_0043_insert
-- used-by: backend/src/controllers/adminController.js -> exports.updateInventoryStock()
-- touches: inventory
insert into inventory (
   inventory_id,
   product_id,
   warehouse_id,
   last_updated,
   stock_quantity
) values ( (
   select coalesce(
      max(inventory_id),
      0
   ) + 1
     from inventory
),
           $1,
           $2,
           now(),
           $3 );

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0044' for admin controller runtime.
-- name: q_0044
-- used-by: backend/src/controllers/adminController.js -> exports.confirmPayment()
-- touches: orders
select *
  from orders
 where order_id = $1;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0045' for admin controller runtime.
-- name: q_0045
-- used-by: backend/src/controllers/adminController.js -> exports.confirmPayment()
-- touches: rider_payment_confirmation
select order_id
  from rider_payment_confirmation
 where order_id = $1;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0046' for admin controller runtime.
-- name: q_0046
-- used-by: backend/src/controllers/adminController.js -> exports.confirmPayment()
-- touches: orders
update orders
   set
   payment_status = 'paid'
 where order_id = $1;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0047' for admin controller runtime.
-- name: q_0047
-- used-by: backend/src/controllers/adminController.js -> exports.confirmPayment()
-- touches: rider_payment_confirmation
update rider_payment_confirmation
   set admin_confirmed_at = now(),
       admin_confirmed_by = $2
 where order_id = $1;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0048' for admin controller runtime.
-- name: q_0048
-- used-by: backend/src/controllers/adminController.js -> exports.assignRider()
-- touches: delivery
insert into delivery (
   order_id,
   status
) values ( $1,
           $2 );

-- context: admin ordinary query
-- functionality: Executes SQL block 'select_delivery_by_order_id' for admin controller runtime.
-- name: select_delivery_by_order_id
-- used-by: backend/src/controllers/adminController.js -> exports.assignRider()
-- touches: delivery
select delivery_id
  from delivery
 where order_id = $1;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0049' for admin controller runtime.
-- name: q_0049
-- used-by: backend/src/controllers/adminController.js -> exports.assignRider()
-- touches: rider_ride
insert into rider_ride (
   rider_id,
   delivery_id
) values ( $1,
           $2 );

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0050' for admin controller runtime.
-- name: q_0050
-- used-by: backend/src/controllers/adminController.js -> exports.createVoucherOffer()
-- touches: vouchers
select voucher_id
  from vouchers
 where upper(code) = upper($1);

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0051' for admin controller runtime.
-- name: q_0051
-- used-by: backend/src/controllers/adminController.js -> exports.createVoucherOffer()
-- touches: vouchers
select coalesce(
   max(voucher_id),
   0
) + 1 as next_id
  from vouchers;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0052' for admin controller runtime.
-- name: q_0052
-- used-by: backend/src/controllers/adminController.js -> exports.createVoucherOffer()
-- touches: vouchers
insert into vouchers (
   voucher_id,
   code,
   discount_type,
   discount_value,
   min_order_amount,
   max_discount_amount,
   usage_limit_per_user,
   start_at,
   end_at,
   is_active,
   created_by_admin,
   created_at,
   updated_at
) values ( $1,
           $2,
           $3,
           $4,
           $5,
           $6,
           $7,
           $8,
           $9,
           $10,
           $11,
           now(),
           now() );

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0053' for admin controller runtime.
-- name: q_0053
-- used-by: backend/src/controllers/adminController.js -> exports.getVoucherOffers()
-- touches: voucher_usage_history, vouchers
select v.*,
       cast(coalesce(
          count(vuh.usage_id),
          0
       ) as int) as usage_count_total,
       case
          when v.is_active = false then
             false
          when v.start_at is not null
             and v.start_at > now() then
             false
          when v.end_at is not null
             and v.end_at < now() then
             false
          else
             true
       end as currently_applicable
  from vouchers v
  left join voucher_usage_history vuh
on vuh.voucher_id = v.voucher_id
 group by v.voucher_id
 order by v.created_at desc,
          v.voucher_id desc;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0054' for admin controller runtime.
-- name: q_0054
-- used-by: backend/src/controllers/adminController.js -> exports.createVoucherOffer(), exports.setVoucherOfferActive(), exports.updateVoucherOffer()
-- touches: vouchers
select *
  from vouchers
 where voucher_id = $1;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0055' for admin controller runtime.
-- name: q_0055
-- used-by: backend/src/controllers/adminController.js -> exports.updateVoucherOffer()
-- touches: vouchers
select voucher_id
  from vouchers
 where upper(code) = upper($1)
   and voucher_id <> $2;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0056' for admin controller runtime.
-- name: q_0056
-- used-by: backend/src/controllers/adminController.js -> exports.updateVoucherOffer()
-- touches: vouchers
update vouchers
   set code = $1,
       discount_type = $2,
       discount_value = $3,
       min_order_amount = $4,
       max_discount_amount = $5,
       usage_limit_per_user = $6,
       start_at = $7,
       end_at = $8,
       is_active = $9,
       updated_at = now()
 where voucher_id = $10;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0057' for admin controller runtime.
-- name: q_0057
-- used-by: backend/src/controllers/adminController.js -> exports.setVoucherOfferActive()
-- touches: vouchers
update vouchers
   set is_active = $1,
       updated_at = now()
 where voucher_id = $2;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0058' for admin controller runtime.
-- name: q_0058
-- used-by: backend/src/controllers/adminController.js -> exports.getVoucherUsageHistory()
-- touches: orders, users, voucher_usage_history
select vuh.usage_id,
       vuh.voucher_id,
       vuh.voucher_code,
       vuh.user_id,
       u.name as user_name,
       u.email as user_email,
       vuh.order_id,
       o.order_date,
       vuh.discount_amount,
       vuh.used_at
  from voucher_usage_history vuh
  join users u
on u.user_id = vuh.user_id
  join orders o
on o.order_id = vuh.order_id
 where ( cast($1 as int) is null
    or vuh.voucher_id = $1 )
 order by vuh.used_at desc;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0059' for admin controller runtime.
-- name: q_0059
-- used-by: backend/src/controllers/adminController.js -> exports.createProductDiscountOffer()
-- touches: product
select product_id
  from product
 where product_id = $1;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0060' for admin controller runtime.
-- name: q_0060
-- used-by: backend/src/controllers/adminController.js -> exports.createProductDiscountOffer()
-- touches: product_discounts
select coalesce(
   max(product_discount_id),
   0
) + 1 as next_id
  from product_discounts;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0061' for admin controller runtime.
-- name: q_0061
-- used-by: backend/src/controllers/adminController.js -> exports.createProductDiscountOffer()
-- touches: product_discounts
insert into product_discounts (
   product_discount_id,
   product_id,
   discount_type,
   discount_value,
   max_discount_amount,
   start_at,
   end_at,
   is_active,
   created_by_admin,
   created_at,
   updated_at
) values ( $1,
           $2,
           $3,
           $4,
           $5,
           $6,
           $7,
           $8,
           $9,
           now(),
           now() );

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0062' for admin controller runtime.
-- name: q_0062
-- used-by: backend/src/controllers/adminController.js -> exports.getProductDiscountOffers()
-- touches: product, product_discounts
select pd.*,
       p.product_name,
       case
          when pd.is_active = false then
             false
          when pd.start_at is not null
             and pd.start_at > now() then
             false
          when pd.end_at is not null
             and pd.end_at < now() then
             false
          else
             true
       end as currently_applicable
  from product_discounts pd
  join product p
on p.product_id = pd.product_id
 order by pd.created_at desc,
          pd.product_discount_id desc;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0063' for admin controller runtime.
-- name: q_0063
-- used-by: backend/src/controllers/adminController.js -> exports.createProductDiscountOffer(), exports.setProductDiscountOfferActive(), exports.updateProductDiscountOffer()
-- touches: product_discounts
select *
  from product_discounts
 where product_discount_id = $1;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0064' for admin controller runtime.
-- name: q_0064
-- used-by: backend/src/controllers/adminController.js -> exports.updateProductDiscountOffer()
-- touches: product
select product_id
  from product
 where product_id = $1;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0065' for admin controller runtime.
-- name: q_0065
-- used-by: backend/src/controllers/adminController.js -> exports.updateProductDiscountOffer()
-- touches: product_discounts
update product_discounts
   set product_id = $1,
       discount_type = $2,
       discount_value = $3,
       max_discount_amount = $4,
       start_at = $5,
       end_at = $6,
       is_active = $7,
       updated_at = now()
 where product_discount_id = $8;

-- context: admin ordinary query
-- functionality: Executes SQL block 'q_0066' for admin controller runtime.
-- name: q_0066
-- used-by: backend/src/controllers/adminController.js -> exports.setProductDiscountOfferActive()
-- touches: product_discounts
update product_discounts
   set is_active = $1,
       updated_at = now()
 where product_discount_id = $2;