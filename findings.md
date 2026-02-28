# Findings — 研究与发现

## V1 调研（已完成）

### OpenAI 兼容接口
- GET /v1/models → 模型列表
- POST /v1/chat/completions → 测试可用性
- 详见 V1 findings

---

## V2 新增调研

### 数据库选型：SQLite + Drizzle ORM

**为什么选 Drizzle 而非 Prisma**：
- Drizzle 更轻量（~50KB vs Prisma ~8MB engine）
- 原生支持 better-sqlite3，无需额外 engine
- 类型推导更自然（SQL-like API）
- 无需 `prisma generate` 步骤
- 适合 Vercel Serverless 环境

**依赖清单**：
```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3
```

### 认证方案：JWT (jose)

**为什么选 jose 而非 jsonwebtoken**：
- jose 基于 Web Crypto API，Vercel Edge Runtime 兼容
- jsonwebtoken 依赖 Node.js crypto，在 Edge 环境不可用
- jose 包更小、更现代

**JWT 流程**：
```
注册: POST /api/auth/register { email, password }
      → 创建用户 → 返回 JWT

登录: POST /api/auth/login { email, password }
      → 验证密码 → 返回 JWT

鉴权: 请求头 Cookie: token=xxx
      → 中间件验证 JWT → 注入 userId
```

**Token 策略**：
- 存储位置：HttpOnly Cookie（防 XSS）
- 过期时间：7 天
- 签名算法：HS256
- 密钥：环境变量 `JWT_SECRET`

### 密码加密：bcryptjs

- 纯 JavaScript 实现，无需 native 编译
- Vercel Serverless 兼容
- salt rounds: 10（平衡安全性与性能）

### API Key 加密存储

用户保存的第三方平台 API Key 不能明文存储：
- 加密算法：AES-256-GCM
- 加密密钥：环境变量 `ENCRYPTION_KEY`
- 存储格式：`iv:authTag:ciphertext`（base64）
- 仅在服务端解密，前端展示时脱敏（`sk-****xxxx`）

### 数据库 Schema 设计

```sql
-- 用户表
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 保存的检测配置
CREATE TABLE saved_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,              -- 配置别名（如"Hotaru API"）
  base_url TEXT NOT NULL,
  api_key_enc TEXT NOT NULL,       -- AES 加密后的 API Key
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 检测历史记录
CREATE TABLE check_histories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  config_id INTEGER REFERENCES saved_configs(id),
  config_name TEXT NOT NULL,       -- 冗余存储，防止配置被删后丢失
  base_url TEXT NOT NULL,
  total INTEGER NOT NULL,
  success INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  results_json TEXT NOT NULL,      -- JSON 序列化的检测结果
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 页面路由规划

| 路由 | 页面 | 权限 |
|------|------|------|
| `/` | 检测页（现有功能） | 游客 + 登录 |
| `/dashboard` | 配置管理 | 仅登录 |
| `/history` | 检测历史 | 仅登录 |

### API 路由规划

| 路由 | 方法 | 功能 | 权限 |
|------|------|------|------|
| `/api/auth/register` | POST | 注册 | 公开 |
| `/api/auth/login` | POST | 登录 | 公开 |
| `/api/auth/logout` | POST | 退出 | 公开 |
| `/api/auth/me` | GET | 当前用户 | 登录 |
| `/api/configs` | GET | 配置列表 | 登录 |
| `/api/configs` | POST | 新增配置 | 登录 |
| `/api/configs/[id]` | PUT | 编辑配置 | 登录 |
| `/api/configs/[id]` | DELETE | 删除配置 | 登录 |
| `/api/histories` | GET | 历史列表 | 登录 |
| `/api/histories` | POST | 保存历史 | 登录 |
| `/api/histories/[id]` | DELETE | 删除历史 | 登录 |
| `/api/models` | POST | 获取模型列表 | 公开 |
| `/api/test` | POST | 测试模型 | 公开 |

### Vercel 部署注意事项

- SQLite 文件在 Vercel Serverless 上不持久化（每次冷启动重置）
- **解决方案**：如需生产部署，切换为 Turso (libSQL) 远程 SQLite
- 本地开发阶段使用本地 SQLite 文件即可
- 环境变量需在 Vercel Dashboard 中配置：`JWT_SECRET`、`ENCRYPTION_KEY`

---

## V3 新增调研：多厂商模型接口支持

### 现有架构瓶颈分析

项目当前仅支持 OpenAI 兼容的 `/v1/models` + `/v1/chat/completions` 接口：

| 代码位置 | 硬编码内容 |
|----------|-----------|
| `src/types/index.ts` | `ApiConfig` 无 `provider` 字段 |
| `src/app/api/models/route.ts` | 固定拼接 `/v1/models` 路径，`Authorization: Bearer` 认证 |
| `src/app/api/test/route.ts` | 固定拼接 `/v1/chat/completions`，固定 `choices[0].message.content` 校验 |
| `src/components/ConfigForm.tsx` | 仅 baseUrl + apiKey 两个输入项 |
| `src/lib/db/schema.ts` | `savedConfigs` 表无 provider 列 |

### 1. Anthropic (Claude) API

#### 模型列表接口

| 项目 | 详情 |
|------|------|
| **端点** | `GET https://api.anthropic.com/v1/models` |
| **认证头** | `x-api-key: {ANTHROPIC_API_KEY}`（非 Bearer Token） |
| **必需头** | `anthropic-version: 2023-06-01` |
| **分页参数** | `limit` (1-1000, 默认20), `after_id`, `before_id` |

**响应格式:**
```json
{
  "data": [
    {
      "id": "claude-opus-4-6",
      "created_at": "2025-05-14T00:00:00Z",
      "display_name": "Claude Opus 4 (June)",
      "type": "model"
    }
  ],
  "has_more": true,
  "first_id": "claude-opus-4-6",
  "last_id": "claude-sonnet-4-6"
}
```

**与 OpenAI 的关键差异:**
- 认证使用 `x-api-key` 头而非 `Authorization: Bearer`
- 需要额外的 `anthropic-version` 头
- 模型对象字段不同：`display_name`, `created_at`, `type` 代替 `object`, `owned_by`
- 支持 cursor 分页（`has_more` + `after_id`）

#### 模型测试接口

| 项目 | 详情 |
|------|------|
| **端点** | `POST https://api.anthropic.com/v1/messages`（非 `/v1/chat/completions`） |
| **认证头** | `x-api-key: {ANTHROPIC_API_KEY}` |
| **必需头** | `anthropic-version: 2023-06-01`, `content-type: application/json` |

**最小测试请求体:**
```json
{
  "model": "claude-opus-4-6",
  "max_tokens": 5,
  "messages": [{ "role": "user", "content": "hi" }]
}
```

**响应格式:**
```json
{
  "id": "msg_xxx",
  "type": "message",
  "content": [{ "type": "text", "text": "Hello!" }],
  "stop_reason": "end_turn",
  "usage": { "input_tokens": 10, "output_tokens": 5 }
}
```

**验证成功条件:** `data.content?.length > 0 && data.content[0].text !== undefined`

---

### 2. Google Gemini API

#### 模型列表接口

| 项目 | 详情 |
|------|------|
| **端点** | `GET https://generativelanguage.googleapis.com/v1beta/models` |
| **认证方式** | URL 查询参数 `?key={GEMINI_API_KEY}`（非 Header） |
| **分页参数** | `pageSize` (默认50, 最大1000), `pageToken` |

**响应格式:**
```json
{
  "models": [
    {
      "name": "models/gemini-2.0-flash",
      "displayName": "Gemini 2.0 Flash",
      "description": "...",
      "version": "2.0",
      "inputTokenLimit": 1048576,
      "outputTokenLimit": 8192,
      "supportedGenerationMethods": ["generateContent", "countTokens"]
    }
  ],
  "nextPageToken": "..."
}
```

**与 OpenAI 的关键差异:**
- 认证通过 URL 参数而非 Header
- Base URL 固定为 `generativelanguage.googleapis.com`
- 模型 ID 格式为 `models/gemini-xxx`，需提取名称部分
- 响应结构为 `models` 数组而非 `data`
- 需过滤 `supportedGenerationMethods` 包含 `generateContent` 的模型

#### 模型测试接口

| 项目 | 详情 |
|------|------|
| **端点** | `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={API_KEY}` |
| **认证方式** | URL 查询参数 |

**最小测试请求体:**
```json
{
  "contents": [{ "parts": [{ "text": "hi" }] }]
}
```

**响应格式:**
```json
{
  "candidates": [
    {
      "content": { "parts": [{ "text": "Hello!" }], "role": "model" },
      "finishReason": "STOP"
    }
  ]
}
```

**验证成功条件:** `data.candidates?.length > 0 && data.candidates[0].content?.parts?.length > 0`

**注意:** 模型 ID 嵌入 URL 路径中而非请求体，需处理 `models/` 前缀

---

### 3. 三种厂商 API 对比总结

| 特性 | OpenAI | Anthropic | Google Gemini |
|------|--------|-----------|---------------|
| 模型列表端点 | `GET /v1/models` | `GET /v1/models` | `GET /v1beta/models` |
| 测试端点 | `POST /v1/chat/completions` | `POST /v1/messages` | `POST /v1beta/models/{m}:generateContent` |
| 认证方式 | `Authorization: Bearer` | `x-api-key` 头 | URL `?key=` 参数 |
| 额外必需头 | 无 | `anthropic-version` | 无 |
| Base URL | 用户自定义 | 默认官方，支持自定义代理 | 固定 Google 地址 |
| 模型 ID 格式 | `gpt-4o` | `claude-opus-4-6` | `models/gemini-2.0-flash` |
| 分页方式 | 无标准分页 | cursor 分页 | token 分页 |
| 请求体格式 | `messages` + `max_tokens` | `messages` + `max_tokens` | `contents[].parts[].text` |
| 响应校验字段 | `choices[0].message.content` | `content[0].text` | `candidates[0].content.parts[0].text` |

### 4. 设计方案：Provider 策略模式

在后端 API 路由中引入 `provider` 参数，根据不同 provider 使用不同的请求构建和响应解析策略：

```typescript
// Provider 适配器接口
interface ProviderAdapter {
  fetchModels(baseUrl: string, apiKey: string): Promise<NormalizedModel[]>;
  testModel(baseUrl: string, apiKey: string, modelId: string): Promise<TestModelResult>;
}

// 工厂函数
function getProvider(type: Provider): ProviderAdapter;
```

**归一化模型格式:**
```typescript
interface NormalizedModel {
  id: string;            // 原始模型 ID
  displayName?: string;  // 可选展示名称
  provider: string;      // 所属厂商
}
```

---

## V4 新增调研：前端 UI 重设计

### 现有前端设计问题诊断

#### 视觉问题（9项）
1. **泛型美学** — 纯白卡片 + gray-50 背景，看起来像默认 Tailwind 模板
2. **无品牌识别** — 没有独特的 logo、色彩或字体
3. **单调配色** — 仅 blue-600 作为主色，其余全是灰度
4. **扁平视觉层级** — 所有区块视觉权重相同（白色卡片 + shadow）
5. **无微交互** — 仅有基础 hover 状态，没有入场动画
6. **无视觉反馈** — 状态变化生硬（除颜色外无过渡）
7. **基础表格设计** — 标准 HTML 表格，样式极少
8. **无空状态插图** — 空状态仅为纯文本
9. **模态框设计简单** — 简单白盒 + 关闭按钮

#### UX 问题（5项）
1. **无视觉分组** — 各区块融为一体
2. **Provider 选择器朴素** — 纯文字按钮，无图标
3. **进度条缺乏个性** — 简单彩色条
4. **导航栏无 active 状态指示**
5. **不支持暗色模式**

### 现有前端文件清单

| 文件 | 角色 |
|------|------|
| `src/app/globals.css` | 仅 `@import "tailwindcss"`，无自定义 CSS |
| `src/app/layout.tsx` | 根布局，`bg-gray-50 text-gray-900` |
| `src/app/page.tsx` | 首页（配置表单 + 进度条 + 结果表格） |
| `src/app/dashboard/page.tsx` | 配置管理页 |
| `src/app/history/page.tsx` | 检测历史页 |
| `src/components/AuthContext.tsx` | 认证上下文（逻辑文件，无需改UI） |
| `src/components/AuthModal.tsx` | 登录/注册模态框 |
| `src/components/ConfigForm.tsx` | API 配置输入表单 |
| `src/components/ModelTable.tsx` | 检测结果表格 |
| `src/components/Navbar.tsx` | 顶部导航栏 |
| `src/components/ProgressBar.tsx` | 检测进度可视化 |

### 设计方向：「Terminal Monitor」暗色监控仪表盘

#### 设计理念
一种**技术前瞻性监控仪表盘**美学，结合：
- **暗色主题**为主（契合"模型检测/监控"使用场景）
- **翡翠绿/青色强调色**（如终端绿，象征"系统健康"）
- **微妙噪点纹理**背景增加深度
- **毛玻璃拟态卡片**配细边框
- **等宽展示字体**用于数据，简洁无衬线字体用于 UI
- **动画状态指示器**（脉冲点、扫描线）

#### 为何选择此方向？
- 应用本质是**诊断/监控工具** — 暗色主题天然适合仪表盘
- 用户是开发者 — 他们期待技术感、精致的美学
- 颜色编码（绿=成功、红=失败）在暗色背景下效果更佳
- 创建令人印象深刻的独特身份，区别于泛型白色 SaaS

#### 色彩体系（CSS 变量）
```
--bg-primary: #0a0f1a          /* 深海军蓝黑 */
--bg-secondary: #111827        /* 卡片背景 */
--bg-tertiary: #1f2937         /* 浮起表面 */
--border: #374151              /* 微妙边框 */
--border-glow: #06b6d440       /* 强调色边框发光 */

--text-primary: #f9fafb        /* 白色文字 */
--text-secondary: #9ca3af      /* 灰色文字 */
--text-muted: #6b7280          /* 弱化文字 */

--accent-primary: #06b6d4      /* Cyan-500 */
--accent-hover: #22d3ee        /* Cyan-400 */
--accent-glow: #06b6d420       /* 发光效果 */

--success: #10b981             /* Emerald-500 */
--success-glow: #10b98130
--error: #ef4444               /* Red-500 */
--error-glow: #ef444430
--warning: #f59e0b             /* Amber-500 */
```

#### 字体选择
- **展示/品牌字体:** `"JetBrains Mono"` — 用于模型 ID、数据、品牌标识
- **正文/UI 字体:** `"DM Sans"` — 干净、现代无衬线，用于标签和文本
- 通过 Google Fonts CDN 加载

#### 关键视觉元素
1. **毛玻璃拟态卡片** — `bg-white/5 backdrop-blur border border-white/10`
2. **渐变强调色** — 活跃元素使用微妙的青色到翡翠绿渐变
3. **动画扫描线** — 进度条上的细动画线
4. **脉冲状态点** — 用动画圆点替代文字状态图标
5. **噪点纹理叠层** — SVG 噪点图案用于 body 背景
6. **发光效果** — 聚焦和激活状态的微妙 box-shadow 发光

### 组件级重设计方案

| 组件 | 重设计要点 |
|------|-----------|
| **Navbar** | 暗色背景 + 底部边框发光；等宽字体品牌标识 + 青色强调；导航 active 指示器；用户首字母头像圆圈 |
| **ConfigForm** | 毛玻璃卡片容器；Provider 选择器配彩色标识徽章；暗色输入框（bg-tertiary, 浅色文字, 青色 focus ring）；渐变提交按钮 |
| **ProgressBar** | 暗色进度轨道；渐变填充条（青色到翡翠绿）；检测中扫描线动画；统计数据作为迷你彩色徽章 |
| **ModelTable** | 暗色表格 + 微妙行边框；交替行背景透明度；动画状态点（绿色脉冲=成功、红色=失败、青色旋转=检测中、暗灰=待检测）；悬浮行发光高亮 |
| **AuthModal** | 毛玻璃叠层 + 更强模糊；暗色主题输入框；登录/注册切换动画；错误状态红色发光边框 |
| **Dashboard** | 暗色表格样式；Provider 彩色背景徽章；操作按钮暗色样式；模态表单暗色毛玻璃 |
| **History** | 暗色搜索栏 + 放大镜图标；暗色分页控件；详情模态暗色毛玻璃；统计数据彩色徽章 |

### 不变更文件（逻辑/API）
- `src/app/api/**` — 所有 API 路由不变
- `src/lib/**` — 所有工具/数据库代码不变
- `src/types/**` — 类型定义不变
- `drizzle/**` — 数据库 schema 不变
- 配置文件（package.json, tsconfig 等）— 不变

### 依赖项评估
无需新增 npm 包，重设计仅使用：
- Tailwind CSS 4（已安装）— 所有 utility classes
- CSS 动画（原生）— 微交互
- CSS 自定义属性（原生）— 主题变量
- Google Fonts（CDN 链接）— 字体
- 内联 SVG（原生）— 噪点纹理和图标

### V4 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 暗色主题可读性 | 中 | 测试对比度，确保 WCAG AA 达标（4.5:1） |
| 动画性能 | 低 | 仅使用 CSS 动画，不用 JS 驱动 |
| 移动端响应式 | 中 | 测试所有断点，暗色主题在移动端效果好 |
| 功能回退 | 高 | 仅改 className/样式，不触碰状态/逻辑 |
| 浏览器兼容性 | 低 | Tailwind 处理前缀，CSS vars 广泛支持 |
