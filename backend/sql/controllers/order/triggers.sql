-- Controller: order
-- File: triggers.sql
-- PostgreSQL triggers for stock, totals, and delivery/payment automation.

drop trigger if exists trg_order_item_validate_stock on order_item;
create trigger trg_order_item_validate_stock
	before insert on order_item
	for each row
	execute function fn_order_item_validate_stock();

drop trigger if exists trg_order_item_decrement_stock on order_item;
create trigger trg_order_item_decrement_stock
	after insert on order_item
	for each row
	execute function fn_order_item_decrement_stock();

drop trigger if exists trg_order_item_recalculate_total on order_item;
create trigger trg_order_item_recalculate_total
	after insert or update or delete on order_item
	for each row
	execute function fn_order_item_recalculate_order_total();

drop trigger if exists trg_delivery_assign_order_status on delivery;
create trigger trg_delivery_assign_order_status
	after insert on delivery
	for each row
	execute function fn_delivery_set_order_assigned();

drop trigger if exists trg_delivery_delivered_updates_order on delivery;
create trigger trg_delivery_delivered_updates_order
	after update of delivery_status on delivery
	for each row
	execute function fn_delivery_handle_delivered();

