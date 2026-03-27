const fs = require("fs");
const path = require("path");
const db = require("./src/db");

async function runMigration() {
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, "..", "init-database.sql");
    let sql = fs.readFileSync(migrationPath, "utf8");

    // Remove SQL comments (lines starting with --)
    sql = sql
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");

    // Remove block comments /* ... */
    sql = sql.replace(/\/\*[\s\S]*?\*\//g, "");

    console.log("Running database migration...");

    // Split by semicolon and filter empty statements
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
      try {
        await db.query(statement);
        console.log("✓ Done");
      } catch (err) {
        if (
          err.message.includes("already exists") ||
          err.message.includes("does not exist")
        ) {
          console.warn(`⚠️  Warning: ${err.message}`);
        } else {
          console.error(`❌ Error in statement ${i + 1}:`);
          console.error(`First 200 chars: ${statement.substring(0, 200)}...`);
          console.error(`Full error: ${err.message}`);
          throw err;
        }
      }
    }

    console.log("\n✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  }
}

runMigration();
