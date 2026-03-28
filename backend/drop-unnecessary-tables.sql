-- Drop clearly unused legacy tables (validated via backend source usage scan).
-- Safe to run multiple times.

BEGIN;

DROP TABLE IF EXISTS user_address CASCADE;
DROP TABLE IF EXISTS user_voucher CASCADE;
DROP TABLE IF EXISTS rider_payout CASCADE;
DROP TABLE IF EXISTS voucher CASCADE;

COMMIT;
