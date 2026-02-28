import { drizzle } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres/pg";
import * as schema from "./schema";
import path from "path";
import Database from "better-sqlite3";
import { Pool } from "pg";

let _db: ReturnType<typeof drizzle> | ReturnType<typeof drizzlePg> | null = null;

/**
 * 检测是否在 Vercel 环境
 */
function isVercelEnv(): boolean {
  return !!process.env.VERCEL || !!process.env.VERCEL_ENV;
}

/**
 * 获取数据库连接（支持 Vercel Postgres 和 本地 SQLite）
 */
export function getDb() {
  if (_db) return _db;

  // Vercel 环境使用 Postgres
  if (isVercelEnv()) {
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    });

    _db = drizzlePg(pool, { schema });
    return _db;
  }

  // 本地环境使用 SQLite
  const DB_PATH = path.join(process.cwd(), "data", "app.db");

  // 确保 data 目录存在
  const fs = require("fs");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  _db = drizzle(sqlite, { schema });
  return _db;
}
