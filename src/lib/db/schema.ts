import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { pgTable, serial, text as pgText, integer as pgInteger, uniqueIndex as pgUniqueIndex, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 检测是否使用 Postgres
const usePostgres = !!process.env.POSTGRES_URL || !!process.env.DATABASE_URL;

// 统一列构建器（绕过 TypeScript 联合类型不可调用问题）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = (usePostgres ? pgText : text) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const int = (usePostgres ? pgInteger : integer) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const uIdx = (usePostgres ? pgUniqueIndex : uniqueIndex) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createTable = (usePostgres ? pgTable : sqliteTable) as any;

// 主键列
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pk = usePostgres ? () => serial("id").primaryKey() : () => integer("id").primaryKey({ autoIncrement: true }) as any;

// 时间戳列
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createdAtCol(): any {
  return usePostgres
    ? timestamp("created_at").defaultNow().notNull()
    : t("created_at").notNull().default(sql`(datetime('now'))`);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updatedAtCol(): any {
  return usePostgres
    ? timestamp("updated_at").defaultNow().notNull()
    : t("updated_at").notNull().default(sql`(datetime('now'))`);
}

// ==================== 用户表 ====================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const users: any = createTable(
  "users",
  {
    id: pk(),
    email: t("email").unique(),
    passwordHash: t("password_hash"),
    oauthProvider: t("oauth_provider"),
    oauthId: t("oauth_id"),
    avatarUrl: t("avatar_url"),
    username: t("username"),
    createdAt: createdAtCol(),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (table: any) => ({
    oauthUnique: uIdx("oauth_unique").on(table.oauthProvider, table.oauthId),
  })
);

// ==================== 保存的检测配置 ====================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const savedConfigs: any = createTable("saved_configs", {
  id: pk(),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  name: t("name").notNull(),
  baseUrl: t("base_url").notNull(),
  apiKeyEnc: t("api_key_enc").notNull(),
  provider: t("provider").notNull().default("openai"),
  createdAt: createdAtCol(),
  updatedAt: updatedAtCol(),
});

// ==================== 检测历史记录 ====================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const checkHistories: any = createTable("check_histories", {
  id: pk(),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  configId: int("config_id").references(() => savedConfigs.id),
  configName: t("config_name").notNull(),
  baseUrl: t("base_url").notNull(),
  total: int("total").notNull(),
  success: int("success").notNull(),
  failed: int("failed").notNull(),
  resultsJson: t("results_json").notNull(),
  createdAt: createdAtCol(),
});
