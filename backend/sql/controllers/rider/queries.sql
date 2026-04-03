-- Controller: rider
-- File: queries.sql
-- Runtime PostgreSQL query registry loaded by backend/src/utils/sqlFileLoader.js
-- Used by backend/src/controllers/riderController.js; fetches assigned delivery + related order status/address data and updates delivery/order progress states.

-- context: rider ordinary query
-- functionality: Executes SQL block 'q_0001' for rider controller runtime.
-- name: q_0001
-- used-by: backend/src/controllers/riderController.js -> exports.getDeliveries()
-- touches: delivery, orders
select d.delivery_id,
       d.order_id,
       d.delivery_status,
       d.warehouse_id,
       o.delivery_address,
       o.order_status,
       o.payment_status
  from delivery d
  join orders o
on d.order_id = o.order_id
 where d.rider_id = $1
 order by d.assigned_at desc;

-- context: rider ordinary query
-- functionality: Executes SQL block 'q_0002' for rider controller runtime.
-- name: q_0002
-- used-by: backend/src/controllers/riderController.js -> exports.updateDeliveryStatus()
-- touches: delivery
select *
  from delivery
 where delivery_id = $1
   and rider_id = $2;

-- context: rider ordinary query
-- functionality: Executes SQL block 'q_0003' for rider controller runtime.
-- name: q_0003
-- used-by: backend/src/controllers/riderController.js -> exports.updateDeliveryStatus()
-- touches: delivery
update delivery
   set
   delivery_status = $1
 where delivery_id = $2;

-- context: rider ordinary query
-- functionality: Executes SQL block 'q_0004' for rider controller runtime.
-- name: q_0004
-- used-by: backend/src/controllers/riderController.js -> exports.updateDeliveryStatus()
-- touches: delivery, orders
update orders
   set
   order_status = 'delivering'
 where order_id = (
   select order_id
     from delivery
    where delivery_id = $1
);

-- context: rider ordinary query
-- functionality: Executes SQL block 'q_0005' for rider controller runtime.
-- name: q_0005
-- used-by: backend/src/controllers/riderController.js -> exports.updateDeliveryStatus()
-- touches: delivery, orders
update orders
   set order_status = 'delivered',
       payment_status =
          case
             when payment_status = 'paid' then
                'paid'
             else
                'collected'
          end
 where order_id = (
   select order_id
     from delivery
    where delivery_id = $1
);

-- context: rider ordinary query
-- functionality: Executes SQL block 'q_0006' for rider controller runtime.
-- name: q_0006
-- used-by: backend/src/controllers/riderController.js -> exports.updateDeliveryStatus()
-- touches: delivery
update delivery
   set
   delivered_at = now()
 where delivery_id = $1;