-- Controller: admin
-- File: procedures.sql
-- PostgreSQL analytics procedures.

CREATE TABLE IF NOT EXISTS admin_analytics_snapshot_cache (
	cache_id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (cache_id = 1),
	snapshot JSONB NOT NULL,
	refreshed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE PROCEDURE pr_admin_refresh_analytics_snapshot(
	p_days IN INT DEFAULT 30
)
LANGUAGE plpgsql
AS $$
DECLARE
	v_snapshot JSONB;
BEGIN
	v_snapshot := fn_admin_analytics_snapshot(p_days);

	INSERT INTO admin_analytics_snapshot_cache (
		cache_id,
		snapshot,
		refreshed_at
	)
	VALUES (
		1,
		v_snapshot,
		NOW()
	)
	ON CONFLICT (cache_id)
	DO UPDATE
	SET
		snapshot = EXCLUDED.snapshot,
		refreshed_at = NOW();
END;
$$;

CREATE OR REPLACE PROCEDURE generate_monthly_report(
	p_reference_date IN DATE DEFAULT CURRENT_DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
	v_month TEXT;
	v_total_revenue NUMERIC(14,2);
	v_total_orders BIGINT;
	v_avg_order_value NUMERIC(14,2);
BEGIN
	v_month := TO_CHAR(DATE_TRUNC('month', p_reference_date), 'YYYY-MM');

	SELECT
		COALESCE(SUM(o.total_price), 0)::NUMERIC(14,2),
		COUNT(o.order_id)::BIGINT,
		COALESCE(AVG(o.total_price), 0)::NUMERIC(14,2)
	INTO
		v_total_revenue,
		v_total_orders,
		v_avg_order_value
	FROM orders o
	WHERE LOWER(COALESCE(o.payment_status, '')) = 'paid'
		AND o.order_date >= DATE_TRUNC('month', p_reference_date)
		AND o.order_date < (DATE_TRUNC('month', p_reference_date) + INTERVAL '1 month');

	RAISE NOTICE 'Monthly report [%] => total_revenue: %, total_orders: %, average_order_value: %',
		v_month,
		v_total_revenue,
		v_total_orders,
		v_avg_order_value;
END;
$$;
