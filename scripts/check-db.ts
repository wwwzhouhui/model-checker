import Database from "better-sqlite3";
import { join } from "path";

const DB_PATH = join(process.cwd(), "data", "app.db");

console.log("🔍 Checking database state...");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

try {
  // 获取所有表
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all();
  console.log("Tables:", tables.map((t: any) => t.name));

  // 获取 users 表结构
  const usersSchema = db.pragma("table_info(users)");
  console.log("\n📋 users table structure:");
  console.log(usersSchema);

  // 检查是否有 __new_users 表
  const hasNewUsers = tables.some((t: any) => t.name === "__new_users");
  if (hasNewUsers) {
    console.log("\n⚠️ __new_users table exists, cleaning up...");

    // 删除 __new_users 表
    db.exec("DROP TABLE IF EXISTS __new_users");
    console.log("✅ Dropped __new_users table");
  }

  // 检查 users 表是否有新字段
  const columns = usersSchema as any[];
  const hasOauthFields =
    columns.some((c) => c.name === "oauth_provider") &&
    columns.some((c) => c.name === "oauth_id");

  if (!hasOauthFields) {
    console.log("\n⚠️ users table missing OAuth fields, migration needed");
  } else {
    console.log("\n✅ users table already has OAuth fields");
  }
} catch (error) {
  console.error("Error:", error);
} finally {
  db.close();
}
