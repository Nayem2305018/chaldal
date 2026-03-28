let offerSchemaReady = false;

const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const normalizeVoucherCode = (code) =>
  String(code || "")
    .trim()
    .toUpperCase();

const computeDiscountAmount = (
  baseAmount,
  discountType,
  discountValue,
  maxDiscountAmount = null,
) => {
  const amount = Number(baseAmount || 0);
  const value = Number(discountValue || 0);

  if (amount <= 0 || value <= 0) {
    return 0;
  }

  let discount = 0;

  if (discountType === "percentage") {
    discount = (amount * value) / 100;
  } else if (discountType === "fixed_amount") {
    discount = value;
  } else {
    return 0;
  }

  if (Number(maxDiscountAmount) > 0) {
    discount = Math.min(discount, Number(maxDiscountAmount));
  }

  discount = Math.min(discount, amount);

  return roundMoney(Math.max(0, discount));
};

const pickBestProductDiscount = (discountRows, unitPrice) => {
  if (!Array.isArray(discountRows) || discountRows.length === 0) {
    return null;
  }

  let best = null;

  for (const row of discountRows) {
    const discountAmount = computeDiscountAmount(
      unitPrice,
      row.discount_type,
      row.discount_value,
      row.max_discount_amount,
    );

    if (!best || discountAmount > best.discount_amount) {
      best = {
        ...row,
        discount_amount: discountAmount,
      };
    }
  }

  return best;
};

const ensureOfferSchema = async (dbExecutor) => {
  if (offerSchemaReady) {
    return;
  }

  await dbExecutor.query(`
    CREATE TABLE IF NOT EXISTS vouchers (
      voucher_id INT PRIMARY KEY,
      code VARCHAR(50) NOT NULL,
      discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
      discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
      min_order_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
      max_discount_amount NUMERIC(12,2) NULL CHECK (max_discount_amount > 0),
      usage_limit_per_user INT NOT NULL DEFAULT 1 CHECK (usage_limit_per_user > 0),
      start_at TIMESTAMP NULL,
      end_at TIMESTAMP NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by_admin INT NULL REFERENCES admin(admin_id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CHECK (end_at IS NULL OR start_at IS NULL OR end_at >= start_at)
    )
  `);

  await dbExecutor.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_vouchers_code_upper ON vouchers (UPPER(code))",
  );

  await dbExecutor.query(`
    CREATE TABLE IF NOT EXISTS product_discounts (
      product_discount_id INT PRIMARY KEY,
      product_id INT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,
      discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
      discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
      max_discount_amount NUMERIC(12,2) NULL CHECK (max_discount_amount > 0),
      start_at TIMESTAMP NULL,
      end_at TIMESTAMP NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by_admin INT NULL REFERENCES admin(admin_id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CHECK (end_at IS NULL OR start_at IS NULL OR end_at >= start_at)
    )
  `);

  await dbExecutor.query(
    "CREATE INDEX IF NOT EXISTS idx_product_discounts_active ON product_discounts(product_id, is_active, start_at, end_at)",
  );

  await dbExecutor.query(`
    CREATE TABLE IF NOT EXISTS voucher_usage_history (
      usage_id INT PRIMARY KEY,
      voucher_id INT NOT NULL REFERENCES vouchers(voucher_id),
      user_id INT NOT NULL REFERENCES users(user_id),
      order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
      voucher_code VARCHAR(50) NOT NULL,
      discount_amount NUMERIC(12,2) NOT NULL CHECK (discount_amount >= 0),
      used_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await dbExecutor.query(
    "CREATE INDEX IF NOT EXISTS idx_voucher_usage_lookup ON voucher_usage_history(voucher_id, user_id, used_at DESC)",
  );

  await dbExecutor.query(
    "CREATE INDEX IF NOT EXISTS idx_voucher_usage_order ON voucher_usage_history(order_id)",
  );

  await dbExecutor.query(
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_before_discount NUMERIC(12,2)",
  );
  await dbExecutor.query(
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_discount_total NUMERIC(12,2) DEFAULT 0",
  );
  await dbExecutor.query(
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_discount_total NUMERIC(12,2) DEFAULT 0",
  );
  await dbExecutor.query(
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(50)",
  );

  await dbExecutor.query(
    "ALTER TABLE order_item ADD COLUMN IF NOT EXISTS original_unit_price NUMERIC(10,2)",
  );
  await dbExecutor.query(
    "ALTER TABLE order_item ADD COLUMN IF NOT EXISTS product_discount_per_unit NUMERIC(10,2) DEFAULT 0",
  );
  await dbExecutor.query(
    "ALTER TABLE order_item ADD COLUMN IF NOT EXISTS applied_product_discount_id INT",
  );

  offerSchemaReady = true;
};

module.exports = {
  ensureOfferSchema,
  computeDiscountAmount,
  normalizeVoucherCode,
  pickBestProductDiscount,
  roundMoney,
};
