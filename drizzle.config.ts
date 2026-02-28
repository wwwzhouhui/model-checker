import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  // 根据环境变量选择数据库类型
  dialect: process.env.POSTGRES_URL || process.env.DATABASE_URL ? "postgresql" : "sqlite",
  dbCredentials: process.env.POSTGRES_URL || process.env.DATABASE_URL
    ? {
        url: process.env.POSTGRES_URL || process.env.DATABASE_URL!,
      }
    : {
        url: "./data/app.db",
      },
} satisfies Config;
