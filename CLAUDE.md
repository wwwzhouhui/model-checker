# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供在此仓库中工作的指导。

---

## 项目概述

Model Checker - 用于测试第三方代理平台（如 NewAPI）上 AI 模型可用性的 Next.js 应用。支持 OpenAI 兼容、Anthropic (Claude)、Google Gemini 厂商。

**技术栈**：Next.js 16 (App Router)、React 19、TypeScript、Tailwind CSS 4、Drizzle ORM + better-sqlite3、jose (JWT)

---

## 开发命令

```bash
# 开发
npm run dev          # 启动开发服务器 localhost:3000

# 构建与生产
npm run build        # 生产构建
npm start           # 启动生产服务器

# 代码检查
npm run lint        # 运行 ESLint

# 数据库 (Drizzle Kit)
npx drizzle-kit generate    # 生成迁移
npx drizzle-kit migrate     # 执行迁移
npx drizzle-kit studio      # 打开 Drizzle Studio
```

**数据库位置**：`./data/app.db`（首次运行自动创建）

---

## 架构设计

### Provider 适配器模式

应用使用适配器模式通过统一接口支持多个 AI 厂商：

```
src/lib/providers/
├── types.ts      # ProviderAdapter 接口定义
├── openai.ts     # OpenAI 兼容（含第三方代理）
├── anthropic.ts  # Anthropic Claude
├── gemini.ts     # Google Gemini
└── index.ts      # getProvider() 工厂函数
```

**核心接口** (`src/lib/providers/types.ts`)：
```typescript
interface ProviderAdapter {
  fetchModels(baseUrl: string, apiKey: string): Promise<NormalizedModel[]>;
  testModel(baseUrl: string, apiKey: string, modelId: string): Promise<TestModelResult>;
}
```

新增厂商步骤：
1. 创建 `src/lib/providers/[provider].ts` 实现 `ProviderAdapter`
2. 在 `src/types/index.ts` 添加：`export type Provider = "openai" | "anthropic" | "gemini" | "new-provider";`
3. 在 `src/lib/providers/index.ts` 注册

### 认证与安全

- **JWT**：由 `src/lib/auth.ts` 处理，使用 `jose` 库
- **Token 存储**：httpOnly cookie (`token`)，7天有效期
- **API Key 加密**：AES-256-GCM，见 `src/lib/crypto.ts`
  - 密钥加密存储于 DB (`apiKeyEnc` 字段)
  - `ENCRYPTION_KEY` 环境变量（64位十六进制），开发环境默认全零

### 数据库表结构 (`src/lib/db/schema.ts`)

| 表 | 用途 |
|----|------|
| `users` | 用户账户（邮箱 + bcrypt 密码哈希） |
| `savedConfigs` | 保存的 API 配置（加密 API Key） |
| `checkHistories` | 检测历史记录（JSON 结果） |

### API 路由 (`src/app/api/`)

| 路由 | 方法 | 用途 |
|------|------|------|
| `/api/auth/register` | POST | 创建用户账户 |
| `/api/auth/login` | POST | 登录，设置 JWT cookie |
| `/api/auth/logout` | POST | 清除 JWT cookie |
| `/api/auth/me` | GET | 获取当前用户 |
| `/api/configs` | GET/POST | 列出/创建保存的配置 |
| `/api/configs/[id]` | GET/DELETE | 获取/删除指定配置 |
| `/api/models` | POST | 从厂商获取模型列表 |
| `/api/test` | POST | 测试单个模型可用性 |
| `/api/histories` | GET/POST | 列出/创建检测历史 |
| `/api/histories/[id]` | DELETE | 删除历史记录 |

---

## 前端结构

- **App Router**：`src/app/` 使用 Next.js App Router
- **客户端组件**：所有页面组件使用 `"use client"`
- **样式**：Tailwind CSS 4 + CSS 变量主题（默认暗色模式）
- **状态管理**：React Context (`src/components/AuthContext.tsx`) 处理认证

### 页面

| 路径 | 用途 |
|------|------|
| `/` | 主测试界面 |
| `/dashboard` | 用户仪表板（保存的配置 + 历史） |
| `/history` | 检测历史详情 |

---

## 重要模式

### API 路由认证

所有受保护的 API 路由使用此模式：

```typescript
import { getUserFromRequest } from "@/lib/auth";

export async function GET() {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... 使用 user.userId
}
```

### Provider 使用

```typescript
import { getProvider } from "@/lib/providers";

const adapter = getProvider("openai");  // 或 "anthropic" | "gemini"
const models = await adapter.fetchModels(baseUrl, apiKey);
const result = await adapter.testModel(baseUrl, apiKey, modelId);
```

### 数据库访问

```typescript
import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";

const db = getDb();
const user = db.select().from(users).where(eq(users.id, id)).get();
```

---

## URL 参数

主页支持 URL 参数注入以便快速测试：

- `?baseUrl=https://api.example.com&apiKey=sk-xxx&provider=openai`
- `?configId=123`（按 ID 加载保存的配置，解密 API Key 使用）

---

## 环境变量

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | JWT 签名密钥 | `dev-secret-change-in-production` |
| `ENCRYPTION_KEY` | AES-256 密钥（64位十六进制） | 全零 |

---

## 路径别名

- `@/*` → `./src/*`（在 `tsconfig.json` 中配置）
