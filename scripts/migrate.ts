import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join } from "path";

const DB_PATH = join(process.cwd(), "data", "app.db");
const MIGRATION_FILE = join(process.cwd(), "drizzle", "0002_new_rocket_raccoon.sql");

console.log("🔄 Running migration...");
console.log(`Database: ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

try {
  const migrationSQL = readFileSync(MIGRATION_FILE, "utf-8");
  db.exec(migrationSQL);
  console.log("✅ Migration completed successfully!");
} catch (error) {
  console.error("❌ Migration failed:", error);
  process.exit(1);
} finally {
  db.close();
}
