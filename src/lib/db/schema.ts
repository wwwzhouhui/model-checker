import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { pgTable, serial, text as pgText, integer as pgInteger, uniqueIndex as pgUniqueIndex, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 检测是否使用 Postgres
const usePostgres = !!process.env.POSTGRES_URL || !!process.env.DATABASE_URL;

// ==================== 用户表 ====================
const usersCore = {
  email: (usePostgres ? pgText : text)("email").unique(),
  passwordHash: (usePostgres ? pgText : text)("password_hash"),
  // OAuth 相关字段
  oauthProvider: (usePostgres ? pgText : text)("oauth_provider"),
  oauthId: (usePostgres ? pgText : text)("oauth_id"),
  avatarUrl: (usePostgres ? pgText : text)("avatar_url"),
  username: (usePostgres ? pgText : text)("username"),
  createdAt: (usePostgres
    ? timestamp("created_at").defaultNow().notNull()
    : (usePostgres ? pgText : text)("created_at")
        .notNull()
        .default(sql`(datetime('now'))`)),
};

const usersExtras = (table: any) => ({
  oauthUnique: (usePostgres ? pgUniqueIndex : uniqueIndex)("oauth_unique").on(
    table.oauthProvider,
    table.oauthId
  ),
});

export const users = usePostgres
  ? pgTable("users", {
      id: serial("id").primaryKey(),
      ...usersCore,
    }, usersExtras)
  : sqliteTable(
      "users",
      {
        id: integer("id").primaryKey({ autoIncrement: true }),
        ...usersCore,
      },
      usersExtras
    );

// ==================== 保存的检测配置 ====================
const savedConfigsCore = {
  name: (usePostgres ? pgText : text)("name").notNull(),
  baseUrl: (usePostgres ? pgText : text)("base_url").notNull(),
  apiKeyEnc: (usePostgres ? pgText : text)("api_key_enc").notNull(),
  provider: (usePostgres ? pgText : text)("provider").notNull().default("openai"),
  createdAt: (usePostgres
    ? timestamp("created_at").defaultNow().notNull()
    : (usePostgres ? pgText : text)("created_at")
        .notNull()
        .default(sql`(datetime('now'))`)),
  updatedAt: (usePostgres
    ? timestamp("updated_at").defaultNow().notNull()
    : (usePostgres ? pgText : text)("updated_at")
        .notNull()
        .default(sql`(datetime('now'))`)),
};

export const savedConfigs = usePostgres
  ? pgTable("saved_configs", {
      id: serial("id").primaryKey(),
      userId: pgInteger("user_id")
        .notNull()
        .references(() => users.id),
      ...savedConfigsCore,
    })
  : sqliteTable("saved_configs", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      userId: integer("user_id")
        .notNull()
        .references(() => users.id),
      ...savedConfigsCore,
    });

// ==================== 检测历史记录 ====================
const checkHistoriesCore = {
  configName: (usePostgres ? pgText : text)("config_name").notNull(),
  baseUrl: (usePostgres ? pgText : text)("base_url").notNull(),
  total: (usePostgres ? pgInteger : integer)("total").notNull(),
  success: (usePostgres ? pgInteger : integer)("success").notNull(),
  failed: (usePostgres ? pgInteger : integer)("failed").notNull(),
  resultsJson: (usePostgres ? pgText : text)("results_json").notNull(),
  createdAt: (usePostgres
    ? timestamp("created_at").defaultNow().notNull()
    : (usePostgres ? pgText : text)("created_at")
        .notNull()
        .default(sql`(datetime('now'))`)),
};

export const checkHistories = usePostgres
  ? pgTable("check_histories", {
      id: serial("id").primaryKey(),
      userId: pgInteger("user_id")
        .notNull()
        .references(() => users.id),
      configId: pgInteger("config_id").references(() => savedConfigs.id),
      ...checkHistoriesCore,
    })
  : sqliteTable("check_histories", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      userId: integer("user_id")
        .notNull()
        .references(() => users.id),
      configId: integer("config_id").references(() => savedConfigs.id),
      ...checkHistoriesCore,
    });
