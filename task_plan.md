# NewAPI 模型可用性检测平台 — 任务计划 (V2)

## 项目概述
在现有模型检测工具基础上，增加用户注册登录系统和管理端。登录用户可保存检测配置（API 地址 + API Key）、查看检测历史、快速二次检测。未登录用户保持现有游客模式。

## 技术栈
- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: SQLite (better-sqlite3)
- **ORM**: Drizzle ORM（轻量、类型安全、原生支持 SQLite）
- **认证**: JWT (jose) + bcrypt (bcryptjs)
- **接口**: OpenAI 标准兼容 API

---

## V1 Phase 1-5: 基础检测功能 `[done]`

> 已完成：项目初始化、API 路由、前端 UI、核心逻辑、优化收尾

---

## Phase 6: 数据库与 ORM 搭建 `[done]`
- [x] 6.1 安装依赖：better-sqlite3、drizzle-orm、drizzle-kit
- [x] 6.2 设计数据库 Schema（3 张表）
  - `users` — id, email, password_hash, created_at
  - `saved_configs` — id, user_id, name, base_url, api_key_enc, created_at, updated_at
  - `check_histories` — id, user_id, config_id, total, success, failed, results_json, created_at
- [x] 6.3 初始化数据库连接（单例模式 + WAL）
- [x] 6.4 生成 migration 并 push 建表成功

**预期产出**: SQLite 数据库文件 + 3 张表可用

## Phase 7: 用户认证系统 `[done]`
- [x] 7.1 安装依赖：bcryptjs、jose
- [x] 7.2 实现 `/api/auth/register` — 邮箱注册（bcrypt 加密密码）
- [x] 7.3 实现 `/api/auth/login` — 邮箱登录（返回 JWT HttpOnly Cookie）
- [x] 7.4 实现 `/api/auth/me` — 获取当前用户信息（JWT 验证）
- [x] 7.5 实现 JWT 工具函数（signToken, verifyToken, getUserFromRequest, cookie 管理）
- [x] 7.6 前端：注册/登录弹窗组件 AuthModal
- [x] 7.7 前端：顶部导航栏 Navbar（登录状态、登录/注册/退出、我的配置/检测历史入口）
- [x] 7.8 前端：AuthContext + AuthProvider 全局认证状态管理
- [x] 7.9 集成到 layout.tsx（AuthProvider + Navbar）

**预期产出**: 完整的注册/登录流程，JWT 认证可用

## Phase 8: 配置管理（管理端） `[done]`
- [x] 8.1 实现 `/api/configs` — CRUD 接口（需登录）
  - GET: 获取当前用户的保存配置列表
  - POST: 新增保存配置
  - PUT: 编辑配置
  - DELETE: 删除配置
- [x] 8.2 API Key 加密存储（AES-256-GCM 加密存入数据库，读取时解密）
- [x] 8.3 前端：保存配置管理页面 `/dashboard`
  - 配置列表（表格：名称、地址、创建时间、操作）
  - 新增/编辑配置弹窗
  - 删除确认
- [x] 8.4 前端：检测页面集成 — 登录用户可从已保存配置快速选择
- [x] 8.5 检测完成后提示"保存此配置"

**预期产出**: 登录用户可 CRUD 管理检测配置，一键填入检测 ✓

## Phase 9: 检测历史记录 `[done]`
- [x] 9.1 实现 `/api/histories` — 历史记录接口（需登录）
  - GET: 获取历史列表（分页 + 搜索）
  - POST: 保存检测结果
  - DELETE: 删除历史记录
- [x] 9.2 检测完成后自动保存历史（登录用户）
- [x] 9.3 前端：历史记录页面 `/history`
  - 历史列表（表格：平台名称、检测时间、模型数、成功/失败数）
  - 搜索过滤（按名称、时间范围）
  - 点击查看详情（展开检测结果）
  - 点击"重新检测"（回到检测页并自动填入配置）

**预期产出**: 登录用户的检测记录自动保存，可搜索查询和二次检测 ✓

## Phase 10: 游客模式兼容与整体优化 `[done]`
- [x] 10.1 游客模式：不显示保存/历史功能入口（Navbar 仅登录用户可见）
- [x] 10.2 游客模式：检测页保持现有功能不变（游客可使用全部检测功能）
- [x] 10.3 页面布局整合：顶部导航（首页检测 / 我的配置 / 检测历史）
- [x] 10.4 响应式适配（Tailwind CSS 响应式布局）
- [x] 10.5 整体构建验证 + 功能测试（Next.js build 通过）

**预期产出**: 游客/登录两种模式无缝切换，全功能可用 ✓

---

## 关键决策记录

| # | 决策 | 选择 | 理由 |
|---|------|------|------|
| D1 | API Route 代理 | 后端代理 | 避免 CORS，保护 Key |
| D2 | 并发检测数 | 3 并发 | 平衡速度与限流 |
| D3 | 测试 prompt | `"hi"`, max_tokens=5 | 最小 token 消耗 |
| D4 | 超时时间 | 30s | 兼容大模型慢响应 |
| D5 | 数据库 | SQLite + Drizzle ORM | 零配置、类型安全、适合单机部署和 Vercel Edge |
| D6 | 认证方案 | JWT (jose) | 无状态、Next.js API Route 友好、无需 session 存储 |
| D7 | 密码加密 | bcryptjs | 纯 JS 实现、无需 native 编译、Vercel 兼容 |
| D8 | API Key 存储 | AES-256 加密 | 不能明文存储用户的第三方 Key |
| D9 | ORM 选择 | Drizzle 而非 Prisma | 更轻量、SQLite 支持更好、无需 generate 步骤 |

---

## 风险与应对

| 风险 | 应对 |
|------|------|
| SQLite 并发写入 | WAL 模式 + 单例连接 |
| Vercel Serverless 不支持持久化 SQLite | 可切换为 Turso (libSQL) 远程 SQLite |
| JWT 泄露 | HttpOnly Cookie 存储、短过期时间 (7d) |
| 用户 API Key 泄露 | AES 加密存储、仅在服务端解密 |

---

## 数据库 ER 关系

```
users (1) ──< saved_configs (N)
users (1) ──< check_histories (N)
saved_configs (1) ──< check_histories (N)  [可选关联]
```

---

## 项目完成总结

### V2 开发完成情况

| Phase | 内容 | 状态 | 备注 |
|-------|------|------|------|
| Phase 1-5 | 基础检测功能 | ✅ done | 模型检测、批量测试、结果导出 |
| Phase 6 | 数据库与 ORM 搭建 | ✅ done | SQLite + Drizzle ORM，3 张表 |
| Phase 7 | 用户认证系统 | ✅ done | JWT + bcryptjs + HttpOnly Cookie |
| Phase 8 | 配置管理（管理端） | ✅ done | CRUD + AES-256-GCM 加密 |
| Phase 9 | 检测历史记录 | ✅ done | 自动保存 + 分页搜索 + 二次检测 |
| Phase 10 | 游客模式兼容与整体优化 | ✅ done | 双模式无缝切换 |

### 构建验证

```
✓ Compiled successfully in 7.2s
✓ Generating static pages (14/14) in 22.1s

Route (app)
├ ○ /            ─ 检测首页（游客 + 登录）
├ ○ /dashboard   ─ 配置管理（仅登录）
├ ○ /history     ─ 检测历史（仅登录）
└ ƒ /api/*       ─ 12 个动态 API 路由
```

### 核心功能

1. **模型检测**：输入 API Key → 拉取模型列表 → 批量检测可用性（3 并发）
2. **用户系统**：注册/登录/退出，JWT 认证，7 天有效期
3. **配置管理**：CRUD 保存的配置，API Key AES 加密存储
4. **检测历史**：自动保存历史记录，支持搜索、分页、二次检测
5. **游客模式**：未登录用户可使用基础检测功能，不保存配置和历史

### 技术亮点

- **零配置数据库**：SQLite 单文件，无需额外部署
- **类型安全**：Drizzle ORM 提供完整的 TypeScript 支持
- **安全存储**：API Key 使用 AES-256-GCM 加密，服务端解密
- **无状态认证**：JWT + HttpOnly Cookie，XSS/CSRF 防护

---

# V3: 多厂商模型接口支持

## 目标
在现有 OpenAI 兼容接口基础上，新增 Anthropic (Claude) 和 Google Gemini 两个模型厂商的标准 API 支持，实现多厂商模型获取与可用性检测。

## Phase 11: 类型系统与 Provider 基础架构 `[done]`

- [ ] 11.1 扩展类型定义 (`src/types/index.ts`)
  - 新增 `Provider` 联合类型: `"openai" | "anthropic" | "gemini"`
  - 扩展 `ApiConfig` 接口，增加 `provider: Provider` 字段
  - 新增 `NormalizedModel` 接口（统一三种厂商的模型格式）
- [ ] 11.2 创建 Provider 适配层 (`src/lib/providers/`)
  - `types.ts` — ProviderAdapter 接口定义
  - `openai.ts` — OpenAI 适配器（从现有 route.ts 提取重构）
  - `anthropic.ts` — Anthropic 适配器
  - `gemini.ts` — Gemini 适配器
  - `index.ts` — 工厂函数 `getProvider(type: Provider): ProviderAdapter`

**Provider 接口定义:**
```typescript
interface ProviderAdapter {
  fetchModels(baseUrl: string, apiKey: string): Promise<NormalizedModel[]>;
  testModel(baseUrl: string, apiKey: string, modelId: string): Promise<{ success: boolean; latency: number; error?: string }>;
}
```

**预期产出**: 统一的 Provider 适配器架构，三种厂商可插拔

## Phase 12: Anthropic Provider 实现 `[done]`

- [ ] 12.1 实现 Anthropic 模型列表获取
  - 端点: `GET {baseUrl}/v1/models`
  - 请求头: `x-api-key: {apiKey}`, `anthropic-version: 2023-06-01`
  - 分页处理: 循环请求直到 `has_more === false`（设 `limit=1000`）
  - 归一化: `{ id, display_name, type }` → `NormalizedModel`
  - 默认 baseUrl: `https://api.anthropic.com`
- [ ] 12.2 实现 Anthropic 模型测试
  - 端点: `POST {baseUrl}/v1/messages`
  - 请求头: `x-api-key`, `anthropic-version: 2023-06-01`
  - 请求体: `{ model, max_tokens: 5, messages: [{ role: "user", content: "hi" }] }`
  - 成功判断: `data.content?.length > 0 && data.content[0].text !== undefined`

**预期产出**: Anthropic 模型获取 + 可用性测试可用

## Phase 13: Google Gemini Provider 实现 `[done]`

- [ ] 13.1 实现 Gemini 模型列表获取
  - 端点: `GET https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}`
  - 分页: `pageSize=1000` + `nextPageToken` 循环
  - 过滤: 仅保留 `supportedGenerationMethods` 包含 `generateContent` 的模型
  - 模型 ID 处理: `models/gemini-2.0-flash` → 提取 `gemini-2.0-flash` 展示
  - baseUrl 固定，忽略用户自定义
- [ ] 13.2 实现 Gemini 模型测试
  - 端点: `POST /v1beta/models/{modelName}:generateContent?key={apiKey}`
  - 请求体: `{ contents: [{ parts: [{ text: "hi" }] }] }`
  - 自动处理 `models/` 前缀
  - 成功判断: `data.candidates?.length > 0 && data.candidates[0].content?.parts?.length > 0`

**预期产出**: Gemini 模型获取 + 可用性测试可用

## Phase 14: 后端 API 路由改造 `[done]`

- [ ] 14.1 改造 `/api/models` 路由
  - 请求体新增 `provider` 参数（默认 `"openai"`）
  - 根据 provider 调用对应适配器的 `fetchModels()`
  - 统一返回: `{ data: NormalizedModel[] }`
- [ ] 14.2 改造 `/api/test` 路由
  - 请求体新增 `provider` 参数（默认 `"openai"`）
  - 根据 provider 调用对应适配器的 `testModel()`
  - 返回格式不变: `{ success, latency, error? }`

**预期产出**: API 路由支持多厂商，向后兼容（默认 openai）

## Phase 15: 前端 UI 改造 `[done]`

- [ ] 15.1 ConfigForm 增加 Provider 选择器
  - 新增 Provider 下拉框（OpenAI / Anthropic / Google Gemini）
  - Gemini 选中时隐藏/禁用 Base URL（固定地址）
  - Anthropic 预填 `https://api.anthropic.com`（允许自定义代理）
  - OpenAI 保留现有 Base URL 自定义功能
  - API Key placeholder 根据 provider 变化（`sk-...` / `sk-ant-...` / `AI...`）
- [ ] 15.2 主页逻辑适配
  - `config` state 包含 `provider` 字段
  - 调用 `/api/models` 和 `/api/test` 时传递 `provider`
  - URL 参数支持 `?provider=anthropic&apiKey=...`

**预期产出**: 用户可在 UI 切换厂商并执行检测

## Phase 16: 数据库 Schema 更新 `[done]`

- [ ] 16.1 savedConfigs 表增加 provider 列
  - `provider TEXT NOT NULL DEFAULT 'openai'`（向后兼容现有数据）
  - 生成 migration 并 push
- [ ] 16.2 配置管理/历史页面适配
  - `/api/configs` CRUD 接口支持 provider 字段
  - Dashboard 页面新建/编辑配置时可选 provider
  - 配置列表/历史列表展示 provider 标签
  - 历史保存时包含 provider 信息

**预期产出**: 数据库支持多厂商配置存储，UI 展示厂商标签

## Phase 17: 测试与验证 `[done]`

- [ ] 17.1 端到端功能验证
  - 使用 Anthropic API Key 测试模型获取 + 可用性检测
  - 使用 Gemini API Key 测试模型获取 + 可用性检测
  - 验证 OpenAI 兼容接口回归（无破坏性变更）
  - 验证配置保存/历史记录含 provider 信息
  - 构建验证 `npm run build`

**预期产出**: 三种厂商全流程可用，回归测试通过

---

## V3 依赖关系

```
Phase 11 (类型 & 架构)
  ├──> Phase 12 (Anthropic 实现)
  ├──> Phase 13 (Gemini 实现)
  └──> Phase 14 (API 路由改造) ──> Phase 15 (前端 UI) ──> Phase 17 (测试)
                                      └──> Phase 16 (DB Schema) ──> Phase 17
```

## V3 新增风险与应对

| 风险 | 应对 |
|------|------|
| Gemini API 地区限制 | Gemini 也支持用户配置自定义代理地址作为备选 |
| Anthropic 分页性能 | 设置 `limit=1000` 减少请求次数 |
| 向后兼容（DB 无 provider 列） | 数据库默认值 `"openai"` 保证现有数据不受影响 |
| Gemini 模型名 `models/` 前缀 | 适配层统一转换，前后端透明处理 |

## V3 新增关键决策

| # | 决策 | 选择 | 理由 |
|---|------|------|------|
| D10 | 多厂商架构模式 | Provider 策略模式 | 三种 API 差异大，适配器解耦易扩展 |
| D11 | Anthropic 认证 | `x-api-key` 头 | Anthropic 官方标准，非 Bearer Token |
| D12 | Gemini 认证 | URL `?key=` 参数 | Google 官方标准，非 Header |
| D13 | Gemini Base URL | 固定但可选配置代理 | 官方地址固定，但考虑地区限制 |

---

## V3 开发完成情况

| Phase | 内容 | 状态 | 备注 |
|-------|------|------|------|
| Phase 11 | 类型系统与 Provider 基础架构 | ✅ done | Provider 联合类型 + 适配器接口 + 工厂函数 |
| Phase 12 | Anthropic Provider 实现 | ✅ done | x-api-key 认证 + cursor 分页 + /v1/messages 测试 |
| Phase 13 | Google Gemini Provider 实现 | ✅ done | URL ?key= 认证 + generateContent 过滤 + models/ 前缀处理 |
| Phase 14 | 后端 API 路由改造 | ✅ done | /api/models + /api/test 支持 provider 参数，向后兼容 |
| Phase 15 | 前端 UI 改造 | ✅ done | Provider 选择器 + 动态 baseUrl/placeholder + URL 参数支持 |
| Phase 16 | 数据库 Schema 更新 | ✅ done | provider 列 + migration + configs/dashboard 全适配 |
| Phase 17 | 测试与验证 | ✅ done | 7 项端到端测试全部通过 + 构建验证通过 |

---

# V4: 前端 UI 重设计

## 目标
将当前泛型白色/灰色 Tailwind UI 重设计为独特的、生产级暗色监控仪表盘，采用毛玻璃拟态卡片、动画状态指示器和青色/翡翠绿配色方案。**所有现有功能保持不变 — 仅视觉/样式变更。**

## 设计方向
「Terminal Monitor」暗色监控仪表盘风格 — 深海军蓝底色、青色/翡翠绿强调色、DM Sans + JetBrains Mono 字体。

## Phase 18: 基础设施（globals.css + layout.tsx） `[done]`

- [x] 18.1 重设计 globals.css
- [x] 18.2 更新 layout.tsx

## Phase 19: 导航组件（Navbar + AuthModal） `[done]`

- [x] 19.1 重设计 Navbar
- [x] 19.2 重设计 AuthModal

## Phase 20: 首页组件（ConfigForm, ProgressBar, ModelTable） `[done]`

- [x] 20.1 重设计 ConfigForm
- [x] 20.2 重设计 ProgressBar
- [x] 20.3 重设计 ModelTable

## Phase 21: 首页整体（page.tsx） `[done]`

- [x] 21.1 重设计首页

## Phase 22: 配置管理页（dashboard） `[done]`

- [x] 22.1 重设计 Dashboard

## Phase 23: 检测历史页（history） `[done]`

- [x] 23.1 重设计 History

## Phase 24: 打磨 & QA `[done]`

- [x] 24.1 视觉打磨
  - Navbar position:relative 修复
  - btn-success:disabled:hover 修复
  - 移动端响应式优化（sm断点搜索框/分页/标题栏）
  - 小屏 glass-card 圆角和表格内边距调整
- [x] 24.2 功能验证（npm run build 通过，逻辑代码零变更）

---

## V4 关键决策

| # | 决策 | 选择 | 理由 |
|---|------|------|------|
| D14 | 主题方向 | 暗色主题为主 | 监控/诊断工具天然适合暗色；开发者偏好暗色 UI |
| D15 | 强调色 | Cyan + Emerald | 终端/健康检查联想；暗色背景上高对比度 |
| D16 | 新增依赖 | 无 | 纯 CSS + Tailwind 保持包体积不变 |
| D17 | 字体 | DM Sans + JetBrains Mono | Google Fonts CDN，分别用于 UI 和代码/数据 |
| D18 | 卡片风格 | 毛玻璃拟态 | 增加深度和现代感，无需厚重阴影 |
| D19 | 动画方案 | 纯 CSS 关键帧 | 无需 Motion/Framer，CSS keyframes 足够微交互 |

## V4 文件变更矩阵

| 文件 | Phase | 类型 | 风险 |
|------|-------|------|------|
| `src/app/globals.css` | 18 | 基础设施 | 低 |
| `src/app/layout.tsx` | 18 | 基础设施 | 低 |
| `src/components/Navbar.tsx` | 19 | 组件 | 低 |
| `src/components/AuthModal.tsx` | 19 | 组件 | 低 |
| `src/components/ConfigForm.tsx` | 20 | 组件 | 低 |
| `src/components/ProgressBar.tsx` | 20 | 组件 | 低 |
| `src/components/ModelTable.tsx` | 20 | 组件 | 低 |
| `src/app/page.tsx` | 21 | 页面 | 中 |
| `src/app/dashboard/page.tsx` | 22 | 页面 | 中 |
| `src/app/history/page.tsx` | 23 | 页面 | 中 |

## V4 依赖关系

```
Phase 18 (基础设施: CSS + Layout)
  ├──> Phase 19 (导航: Navbar + AuthModal)
  ├──> Phase 20 (首页组件: ConfigForm, ProgressBar, ModelTable)
  │       └──> Phase 21 (首页整体)
  ├──> Phase 22 (Dashboard 页)
  ├──> Phase 23 (History 页)
  └──> Phase 24 (打磨 & QA) ← 依赖以上所有
```
