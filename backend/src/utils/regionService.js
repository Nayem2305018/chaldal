/**
 * Region Service
 * Ensures region schema exists with a predefined list used by checkout and rider onboarding.
 */

let regionSchemaReady = false;

const ensureRegionSchema = async (dbExecutor) => {
  if (regionSchemaReady) {
    return;
  }

  await dbExecutor.query(`
    CREATE TABLE IF NOT EXISTS region (
      region_id INT PRIMARY KEY,
      region_name VARCHAR(100) NOT NULL UNIQUE
    );

    ALTER TABLE orders ADD COLUMN IF NOT EXISTS region_id INT;
    ALTER TABLE rider ADD COLUMN IF NOT EXISTS region_id INT;
    ALTER TABLE rider_requests ADD COLUMN IF NOT EXISTS region_id INT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS region_id INT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS home_region_id INT;
    ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS region_id INT;

    UPDATE orders
       SET region_id = NULL
     WHERE region_id IS NOT NULL
       AND region_id NOT BETWEEN 1 AND 5;

    UPDATE rider
       SET region_id = NULL
     WHERE region_id IS NOT NULL
       AND region_id NOT BETWEEN 1 AND 5;

    UPDATE rider_requests
       SET region_id = NULL
     WHERE region_id IS NOT NULL
       AND region_id NOT BETWEEN 1 AND 5;

    UPDATE users
       SET region_id = NULL
     WHERE region_id IS NOT NULL
       AND region_id NOT BETWEEN 1 AND 5;

    DELETE FROM region
     WHERE region_id NOT BETWEEN 1 AND 5;

    UPDATE region
       SET region_name = CONCAT('__region_tmp_', region_id)
     WHERE region_id BETWEEN 1 AND 5;

    UPDATE region
       SET region_name = CASE region_id
         WHEN 1 THEN 'Dhaka North'
         WHEN 2 THEN 'Dhaka South'
         WHEN 3 THEN 'Chattogram'
         WHEN 4 THEN 'Khulna'
         WHEN 5 THEN 'Rajshahi'
         ELSE region_name
       END
     WHERE region_id BETWEEN 1 AND 5;

    INSERT INTO region (region_id, region_name)
    SELECT seed.region_id, seed.region_name
      FROM (
        VALUES
          (1, 'Dhaka North'),
          (2, 'Dhaka South'),
          (3, 'Chattogram'),
          (4, 'Khulna'),
          (5, 'Rajshahi')
      ) AS seed(region_id, region_name)
     WHERE NOT EXISTS (
       SELECT 1
         FROM region r
        WHERE r.region_id = seed.region_id
     );

    INSERT INTO warehouse (warehouse_id, name, location, region_id)
    VALUES
      (1, 'Dhaka North', 'Dhaka North', 1),
      (2, 'Dhaka South', 'Dhaka South', 2),
      (3, 'Chattogram', 'Chattogram', 3),
      (4, 'Khulna', 'Khulna', 4),
      (5, 'Rajshahi', 'Rajshahi', 5)
    ON CONFLICT (warehouse_id)
    DO UPDATE
      SET name = EXCLUDED.name,
          location = EXCLUDED.location,
          region_id = EXCLUDED.region_id;

    UPDATE users
       SET region_id = 1
     WHERE region_id IS NULL;

    UPDATE users
       SET home_region_id = COALESCE(home_region_id, region_id, 1)
     WHERE home_region_id IS NULL;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_orders_region'
      ) THEN
        ALTER TABLE orders
          ADD CONSTRAINT fk_orders_region
          FOREIGN KEY (region_id)
          REFERENCES region(region_id);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_rider_region'
      ) THEN
        ALTER TABLE rider
          ADD CONSTRAINT fk_rider_region
          FOREIGN KEY (region_id)
          REFERENCES region(region_id);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_rider_requests_region'
      ) THEN
        ALTER TABLE rider_requests
          ADD CONSTRAINT fk_rider_requests_region
          FOREIGN KEY (region_id)
          REFERENCES region(region_id);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_users_region'
      ) THEN
        ALTER TABLE users
          ADD CONSTRAINT fk_users_region
          FOREIGN KEY (region_id)
          REFERENCES region(region_id);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_users_home_region'
      ) THEN
        ALTER TABLE users
          ADD CONSTRAINT fk_users_home_region
          FOREIGN KEY (home_region_id)
          REFERENCES region(region_id);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_warehouse_region'
      ) THEN
        ALTER TABLE warehouse
          ADD CONSTRAINT fk_warehouse_region
          FOREIGN KEY (region_id)
          REFERENCES region(region_id);
      END IF;
    END$$;

    CREATE UNIQUE INDEX IF NOT EXISTS ux_warehouse_region_id ON warehouse(region_id);
    CREATE INDEX IF NOT EXISTS idx_orders_region_status ON orders(region_id, order_status);
    CREATE INDEX IF NOT EXISTS idx_rider_region_id ON rider(region_id);
    CREATE INDEX IF NOT EXISTS idx_rider_requests_region_id ON rider_requests(region_id);
    CREATE INDEX IF NOT EXISTS idx_users_region_id ON users(region_id);
  `);

  regionSchemaReady = true;
};

module.exports = {
  ensureRegionSchema,
};
