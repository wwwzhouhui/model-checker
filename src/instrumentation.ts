/**
 * Next.js Instrumentation - 服务器启动时执行，早于任何请求处理
 * 用于 Vercel Postgres 自动建表
 */
export async function register() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    const pgUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!pgUrl) return;

    const { Pool } = await import("pg");
    const url = new URL(pgUrl);
    url.searchParams.delete("sslmode");

    const pool = new Pool({
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: false },
    });

    try {
      const { rows } = await pool.query(
        `SELECT to_regclass('public.users') AS exists`
      );
      if (rows[0].exists) return;

      await pool.query(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" SERIAL PRIMARY KEY,
          "email" TEXT UNIQUE,
          "password_hash" TEXT,
          "oauth_provider" TEXT,
          "oauth_id" TEXT,
          "avatar_url" TEXT,
          "username" TEXT,
          "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "oauth_unique"
          ON "users" ("oauth_provider", "oauth_id");

        CREATE TABLE IF NOT EXISTS "saved_configs" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
          "name" TEXT NOT NULL,
          "base_url" TEXT NOT NULL,
          "api_key_enc" TEXT NOT NULL,
          "provider" TEXT NOT NULL DEFAULT 'openai',
          "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
          "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
        );

        CREATE TABLE IF NOT EXISTS "check_histories" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
          "config_id" INTEGER REFERENCES "saved_configs"("id"),
          "config_name" TEXT NOT NULL,
          "base_url" TEXT NOT NULL,
          "total" INTEGER NOT NULL,
          "success" INTEGER NOT NULL,
          "failed" INTEGER NOT NULL,
          "results_json" TEXT NOT NULL,
          "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      console.log("[DB] Postgres tables created successfully");
    } catch (err) {
      console.error("[DB] Failed to init Postgres tables:", err);
    } finally {
      await pool.end();
    }
  }
}
