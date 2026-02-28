import Database from "better-sqlite3";
import { join } from "path";

const DB_PATH = join(process.cwd(), "data", "app.db");

console.log("🔄 Running manual migration...");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF");

try {
  // 开始事务
  db.exec("BEGIN TRANSACTION");

  // 1. 创建新表（包含 OAuth 字段）
  db.exec(`
    CREATE TABLE __new_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT,
      oauth_provider TEXT,
      oauth_id TEXT,
      avatar_url TEXT,
      username TEXT,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL
    )
  `);

  console.log("✅ Created __new_users table");

  // 2. 迁移现有数据（只有旧字段）
  db.exec(`
    INSERT INTO __new_users (id, email, password_hash, created_at)
    SELECT id, email, password_hash, created_at FROM users
  `);

  console.log("✅ Migrated existing data");

  // 3. 删除旧表
  db.exec("DROP TABLE users");

  console.log("✅ Dropped old users table");

  // 4. 重命名新表
  db.exec("ALTER TABLE __new_users RENAME TO users");

  console.log("✅ Renamed __new_users to users");

  // 5. 重建索引
  db.exec("CREATE UNIQUE INDEX users_email_unique ON users (email)");
  db.exec("CREATE UNIQUE INDEX oauth_unique ON users (oauth_provider, oauth_id)");

  console.log("✅ Created indexes");

  // 提交事务
  db.exec("COMMIT");

  console.log("\n✅ Migration completed successfully!");

  // 验证结果
  const columns = db.pragma("table_info(users)");
  console.log("\n📋 New users table structure:");
  console.log(columns);
} catch (error) {
  db.exec("ROLLBACK");
  console.error("❌ Migration failed, rolled back:", error);
  throw error;
} finally {
  db.pragma("foreign_keys = ON");
  db.close();
}
