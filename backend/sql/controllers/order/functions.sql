-- Controller: order
-- File: functions.sql
-- PostgreSQL trigger functions for stock, totals, and delivery/payment automation.

drop function if exists fn_order_item_validate_stock() cascade;
drop function if exists fn_order_item_decrement_stock() cascade;
drop function if exists fn_order_item_recalculate_order_total() cascade;
drop function if exists fn_delivery_set_order_assigned() cascade;
drop function if exists fn_delivery_handle_delivered() cascade;

create or replace function fn_order_item_validate_stock()
returns trigger
language plpgsql
as $$
declare
	v_available_stock int;
begin
	select coalesce(
		p.stock_quantity,
		0
	)
	  into v_available_stock
	  from product p
	 where p.product_id = new.product_id
for update;

	if new.quantity > v_available_stock then
		raise exception 'Sorry! limited quantity available';
	end if;

	return new;
end;
$$;

create or replace function fn_order_item_decrement_stock()
returns trigger
language plpgsql
as $$
begin
	update product
		set stock_quantity = greatest(
		coalesce(
			stock_quantity,
			0
		) - coalesce(
			new.quantity,
			0
		),
		0
	)
	 where product_id = new.product_id;

	return new;
end;
$$;

create or replace function fn_order_item_recalculate_order_total()
returns trigger
language plpgsql
as $$
declare
	v_order_id int;
begin
	if tg_op = 'DELETE' then
		v_order_id := old.order_id;
	else
		v_order_id := new.order_id;
	end if;

	update orders o
		set total_price = coalesce(
		(
			select sum(coalesce(
				oi.subtotal,
				0
			))
			  from order_item oi
			 where oi.order_id = v_order_id
		),
		0
	)
	 where o.order_id = v_order_id;

	if tg_op = 'UPDATE'
		and old.order_id is distinct from new.order_id then
		update orders o
			set total_price = coalesce(
			(
				select sum(coalesce(
					oi.subtotal,
					0
				))
				  from order_item oi
				 where oi.order_id = old.order_id
			),
			0
		)
		 where o.order_id = old.order_id;
	end if;

	return coalesce(
		new,
		old
	);
end;
$$;

create or replace function fn_delivery_set_order_assigned()
returns trigger
language plpgsql
as $$
begin
	update orders
		set order_status = 'assigned'
	 where order_id = new.order_id;

	return new;
end;
$$;

create or replace function fn_delivery_handle_delivered()
returns trigger
language plpgsql
as $$
begin
	if new.delivery_status = 'delivered'
		and old.delivery_status is distinct from new.delivery_status then
		update orders
			set order_status = 'delivered',
				 payment_status = case
					 when lower(coalesce(
						 payment_status,
						 ''
					 )) = 'paid' then
						 payment_status
					 else
						 'collected'
				 end
		 where order_id = new.order_id;
	end if;

	return new;
end;
$$;
