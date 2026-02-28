import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/** 用户表 */
export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").unique(), // 邮箱注册用户必填，OAuth 用户可选
    passwordHash: text("password_hash"), // 邮箱注册用户必填，OAuth 用户为空
    // OAuth 相关字段
    oauthProvider: text("oauth_provider"), // 'github' | 'linuxdo' | null
    oauthId: text("oauth_id"), // OAuth 平台的用户 ID
    avatarUrl: text("avatar_url"), // 用户头像 URL
    username: text("username"), // OAuth 用户名
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    // OAuth 联合唯一索引：同一 OAuth 平台的同一用户只能绑定一个账号
    oauthUnique: uniqueIndex("oauth_unique").on(table.oauthProvider, table.oauthId),
  })
);

/** 保存的检测配置 */
export const savedConfigs = sqliteTable("saved_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKeyEnc: text("api_key_enc").notNull(),
  provider: text("provider").notNull().default("openai"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/** 检测历史记录 */
export const checkHistories = sqliteTable("check_histories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  configId: integer("config_id").references(() => savedConfigs.id),
  configName: text("config_name").notNull(),
  baseUrl: text("base_url").notNull(),
  total: integer("total").notNull(),
  success: integer("success").notNull(),
  failed: integer("failed").notNull(),
  resultsJson: text("results_json").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
