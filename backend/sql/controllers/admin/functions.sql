-- Controller: admin
-- File: functions.sql
-- PostgreSQL analytics functions used by admin dashboard statistics.

-- Daily revenue by order date (paid orders only).
DROP FUNCTION IF EXISTS analytics_daily_revenue();

CREATE OR REPLACE FUNCTION analytics_daily_revenue()
RETURNS TABLE (
	revenue_date DATE,
	total_revenue NUMERIC(14,2),
	total_orders BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
	RETURN QUERY
	SELECT
		DATE(o.order_date) AS revenue_date,
		COALESCE(SUM(o.total_price), 0)::NUMERIC(14,2) AS total_revenue,
		COUNT(o.order_id)::BIGINT AS total_orders
	FROM orders o
	WHERE LOWER(COALESCE(o.payment_status, '')) = 'paid'
	GROUP BY DATE(o.order_date)
	ORDER BY revenue_date DESC;
END;
$$;

-- Monthly paid revenue and order count summary.
CREATE OR REPLACE FUNCTION analytics_monthly_revenue_summary(
	p_reference_date IN DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
	month_start DATE,
	total_revenue NUMERIC(14,2),
	total_orders BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
	RETURN QUERY
	SELECT
		DATE_TRUNC('month', p_reference_date)::DATE AS month_start,
		COALESCE(SUM(o.total_price), 0)::NUMERIC(14,2) AS total_revenue,
		COUNT(o.order_id)::BIGINT AS total_orders
	FROM orders o
	WHERE LOWER(COALESCE(o.payment_status, '')) = 'paid'
		AND o.order_date >= DATE_TRUNC('month', p_reference_date)
		AND o.order_date < (DATE_TRUNC('month', p_reference_date) + INTERVAL '1 month');
END;
$$;

-- Top-selling products by quantity sold.
CREATE OR REPLACE FUNCTION analytics_top_selling_products(
	p_limit IN INT DEFAULT 5
)
RETURNS TABLE (
	product_id INT,
	product_name TEXT,
	total_quantity_sold BIGINT,
	total_sales NUMERIC(14,2)
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
	RETURN QUERY
	SELECT
		p.product_id,
		p.product_name::TEXT,
		COALESCE(SUM(oi.quantity), 0)::BIGINT AS total_quantity_sold,
		COALESCE(SUM(COALESCE(oi.subtotal, oi.unit_price * oi.quantity)), 0)::NUMERIC(14,2) AS total_sales
	FROM order_item oi
	JOIN product p ON p.product_id = oi.product_id
	GROUP BY p.product_id, p.product_name
	ORDER BY total_quantity_sold DESC, total_sales DESC, p.product_id ASC
	LIMIT GREATEST(COALESCE(p_limit, 5), 1);
END;
$$;

-- Most active users by number of orders.
CREATE OR REPLACE FUNCTION analytics_most_active_users(
	p_limit IN INT DEFAULT 5
)
RETURNS TABLE (
	user_id INT,
	user_name TEXT,
	user_email TEXT,
	total_orders BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
	RETURN QUERY
	SELECT
		u.user_id,
		u.name::TEXT AS user_name,
		u.email::TEXT AS user_email,
		COUNT(o.order_id)::BIGINT AS total_orders
	FROM orders o
	JOIN users u ON u.user_id = o.user_id
	GROUP BY u.user_id, u.name, u.email
	ORDER BY total_orders DESC, u.user_id ASC
	LIMIT GREATEST(COALESCE(p_limit, 5), 1);
END;
$$;

-- Rider performance summary (completed deliveries only).
DROP FUNCTION IF EXISTS analytics_rider_performance();

CREATE OR REPLACE FUNCTION analytics_rider_performance()
RETURNS TABLE (
	rider_id INT,
	rider_name TEXT,
	total_deliveries_completed BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
	RETURN QUERY
	WITH delivery_summary AS (
		SELECT
			d.rider_id,
			COUNT(d.delivery_id) FILTER (
				WHERE LOWER(COALESCE(d.delivery_status, '')) IN ('delivered', 'completed')
			)::BIGINT AS completed_count
		FROM delivery d
		GROUP BY d.rider_id
	)
	SELECT
		r.rider_id,
		r.rider_name::TEXT,
		COALESCE(ds.completed_count, 0)::BIGINT AS total_deliveries_completed
	FROM rider r
	LEFT JOIN delivery_summary ds ON ds.rider_id = r.rider_id
	ORDER BY total_deliveries_completed DESC, r.rider_id ASC;
END;
$$;

-- Distribution of orders by order_status.
CREATE OR REPLACE FUNCTION analytics_order_status_distribution()
RETURNS TABLE (
	order_status TEXT,
	total_orders BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
	RETURN QUERY
	SELECT
		COALESCE(o.order_status, 'unknown')::TEXT AS order_status,
		COUNT(o.order_id)::BIGINT AS total_orders
	FROM orders o
	GROUP BY COALESCE(o.order_status, 'unknown')
	ORDER BY total_orders DESC, order_status ASC;
END;
$$;

-- Peak order hours by order volume.
CREATE OR REPLACE FUNCTION analytics_peak_order_hours()
RETURNS TABLE (
	order_hour INT,
	total_orders BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
	RETURN QUERY
	SELECT
		EXTRACT(HOUR FROM o.order_date)::INT AS order_hour,
		COUNT(o.order_id)::BIGINT AS total_orders
	FROM orders o
	GROUP BY EXTRACT(HOUR FROM o.order_date)
	ORDER BY total_orders DESC, order_hour ASC;
END;
$$;

-- Warehouse workload by delivery count.
CREATE OR REPLACE FUNCTION analytics_warehouse_workload()
RETURNS TABLE (
	warehouse_id INT,
	warehouse_name TEXT,
	total_deliveries BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
	RETURN QUERY
	SELECT
		w.warehouse_id,
		w.name::TEXT AS warehouse_name,
		COALESCE(COUNT(d.delivery_id), 0)::BIGINT AS total_deliveries
	FROM warehouse w
	LEFT JOIN delivery d ON d.warehouse_id = w.warehouse_id
	GROUP BY w.warehouse_id, w.name
	ORDER BY total_deliveries DESC, w.warehouse_id ASC;
END;
$$;

-- Average paid order value.
CREATE OR REPLACE FUNCTION analytics_average_order_value()
RETURNS NUMERIC(14,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
	v_aov NUMERIC(14,2);
BEGIN
	SELECT COALESCE(AVG(o.total_price), 0)::NUMERIC(14,2)
	INTO v_aov
	FROM orders o
	WHERE LOWER(COALESCE(o.payment_status, '')) = 'paid';

	RETURN v_aov;
END;
$$;

-- Cached analytics snapshot payload used by admin procedures.
CREATE OR REPLACE FUNCTION fn_admin_analytics_snapshot(
	p_days IN INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
	v_days INT;
	v_snapshot JSONB;
BEGIN
	v_days := GREATEST(COALESCE(p_days, 30), 1);

	SELECT jsonb_build_object(
		'daily_revenue', COALESCE((
			SELECT jsonb_agg(to_jsonb(dr))
			FROM (
				SELECT *
				FROM analytics_daily_revenue()
				WHERE revenue_date >= (CURRENT_DATE - (v_days - 1))
				ORDER BY revenue_date DESC
			) dr
		), '[]'::jsonb),
		'monthly_revenue_summary', COALESCE((
			SELECT to_jsonb(ms)
			FROM analytics_monthly_revenue_summary(CURRENT_DATE) ms
			LIMIT 1
		), '{}'::jsonb),
		'top_selling_products', COALESCE((
			SELECT jsonb_agg(to_jsonb(tp))
			FROM analytics_top_selling_products(5) tp
		), '[]'::jsonb),
		'most_active_users', COALESCE((
			SELECT jsonb_agg(to_jsonb(mu))
			FROM analytics_most_active_users(5) mu
		), '[]'::jsonb),
		'rider_performance', COALESCE((
			SELECT jsonb_agg(to_jsonb(rp))
			FROM analytics_rider_performance() rp
		), '[]'::jsonb),
		'order_status_distribution', COALESCE((
			SELECT jsonb_agg(to_jsonb(osd))
			FROM analytics_order_status_distribution() osd
		), '[]'::jsonb),
		'peak_order_hours', COALESCE((
			SELECT jsonb_agg(to_jsonb(ph))
			FROM analytics_peak_order_hours() ph
		), '[]'::jsonb),
		'warehouse_workload', COALESCE((
			SELECT jsonb_agg(to_jsonb(ww))
			FROM analytics_warehouse_workload() ww
		), '[]'::jsonb),
		'average_order_value', analytics_average_order_value(),
		'monthly_report', analytics_monthly_report_json(CURRENT_DATE)
	)
	INTO v_snapshot;

	RETURN COALESCE(v_snapshot, '{}'::jsonb);
END;
$$;

-- Structured monthly report payload.
CREATE OR REPLACE FUNCTION analytics_monthly_report_json(
	p_reference_date IN DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
	v_report JSONB;
BEGIN
	SELECT jsonb_build_object(
		'month', TO_CHAR(DATE_TRUNC('month', p_reference_date), 'YYYY-MM'),
		'total_revenue', COALESCE(SUM(o.total_price), 0)::NUMERIC(14,2),
		'total_orders', COUNT(o.order_id)::BIGINT,
		'average_order_value', COALESCE(AVG(o.total_price), 0)::NUMERIC(14,2)
	)
	INTO v_report
	FROM orders o
	WHERE LOWER(COALESCE(o.payment_status, '')) = 'paid'
		AND o.order_date >= DATE_TRUNC('month', p_reference_date)
		AND o.order_date < (DATE_TRUNC('month', p_reference_date) + INTERVAL '1 month');

	RETURN v_report;
END;
$$;
