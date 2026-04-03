/**
 * Order Automation Service
 * Ensures order-related PostgreSQL trigger functions and triggers are deployed.
 */

const fs = require("fs");
const path = require("path");

let orderAutomationReady = false;

const loadSql = (relativePath) => {
  const absolutePath = path.resolve(__dirname, "..", "..", relativePath);
  return fs.readFileSync(absolutePath, "utf8");
};

const ensureOrderAutomationSchema = async (dbExecutor) => {
  if (orderAutomationReady) {
    return;
  }

  const functionsSql = loadSql("sql/controllers/order/functions.sql");
  const triggersSql = loadSql("sql/controllers/order/triggers.sql");

  await dbExecutor.query(functionsSql);
  await dbExecutor.query(triggersSql);

  orderAutomationReady = true;
};

module.exports = {
  ensureOrderAutomationSchema,
};
