/**
 * Analytics Service
 * Loads PostgreSQL analytics routines from admin SQL artifacts so controllers can call them directly.
 */

const fs = require("fs");
const path = require("path");

let analyticsSchemaReady = false;

const loadSql = (relativePath) => {
  const absolutePath = path.resolve(__dirname, "..", "..", relativePath);
  return fs.readFileSync(absolutePath, "utf8");
};

const ensureAnalyticsSchema = async (dbExecutor) => {
  if (analyticsSchemaReady) {
    return;
  }

  const functionsSql = loadSql("sql/controllers/admin/functions.sql");
  const proceduresSql = loadSql("sql/controllers/admin/procedures.sql");

  await dbExecutor.query(functionsSql);
  await dbExecutor.query(proceduresSql);
  analyticsSchemaReady = true;
};

module.exports = {
  ensureAnalyticsSchema,
};
