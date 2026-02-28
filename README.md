# Model Checker

一键检测第三方 AI 模型代理平台的模型可用性，快速识别哪些模型能用、哪些不能用。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-v0.1.0-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg)

> 输入 API Key 和 Base URL，自动拉取模型列表并逐个验证，结果一目了然。

---

## 项目介绍

### 项目概述

Model Checker 是一个基于 Next.js 的 Web 工具，专为使用 NewAPI / OneAPI 等第三方代理平台的用户设计。它通过 OpenAI 标准兼容接口，自动获取平台上的所有模型，并逐个发送测试请求验证可用性，帮助用户快速筛选出可正常调用的模型。

体验地址https://model-checker-shkl.vercel.app/

![image-20260228101913696](https://mypicture-1258720957.cos.ap-nanjing.myqcloud.com/image-20260228101913696.png)

### 核心功能

- **多厂商支持** — 支持 OpenAI 兼容、Anthropic (Claude)、Google Gemini 三大厂商
- **模型列表拉取** — 通过标准接口获取全部模型
- **批量可用性检测** — 并发调用逐个验证模型可用性
- **实时状态展示** — ✓ 可用 / ✗ 不可用 / ○ 待检测，进度条实时更新
- **用户系统** — 注册登录，保存配置和历史记录
- **配置管理** — 保存常用配置，一键快速加载
- **历史记录** — 查看过往检测结果，支持对比分析
- **结果导出** — 一键复制为 Markdown 表格

### 适用场景

- **API 选型** — 测试多个代理平台，选择响应最快、最稳定的
- **模型验证** — 确认购买的 API Key 支持哪些模型
- **故障排查** — 快速定位是平台问题还是模型问题
- **成本优化** — 找出可用的免费/低价模型替代方案

---

## 功能清单

| 功能名称 | 功能说明 | 技术栈 | 更新时间 | 版本 |
|---------|---------|--------|----------|------|
| 多厂商支持 | OpenAI 兼容 / Anthropic / Gemini | TypeScript | 2026-02-28 | v0.1.0 |
| 模型列表拉取 | 调用 /v1/models 接口获取所有模型 | Next.js API | 2026-02-28 | v0.1.0 |
| 批量检测 | 3 并发队列逐个测试模型可用性 | React | 2026-02-28 | v0.1.0 |
| 单个重测 | 对任意模型单独重新检测 | React | 2026-02-28 | v0.1.0 |
| 进度条 | 实时显示检测进度和统计数据 | Tailwind CSS | 2026-02-28 | v0.1.0 |
| 用户认证 | 注册 / 登录 / JWT Token | jose | 2026-02-28 | v0.1.0 |
| 配置保存 | 加密存储 API Key 到数据库 | Drizzle ORM | 2026-02-28 | v0.1.0 |
| 历史记录 | 保存检测结果，支持查看 | SQLite | 2026-02-28 | v0.1.0 |
| URL 参数注入 | 支持 ?baseUrl=&apiKey= 快速测试 | Next.js | 2026-02-28 | v0.1.0 |
| Markdown 导出 | 复制检测结果为 Markdown 表格 | Clipboard API | 2026-02-28 | v0.1.0 |
| 响应式布局 | 适配桌面端和移动端 | Tailwind CSS | 2026-02-28 | v0.1.0 |
| 暗色主题 | 终端风格暗色 UI | CSS Variables | 2026-02-28 | v0.1.0 |

---

## 功能详解

### Provider 适配器模式

项目采用适配器模式统一不同厂商的 API 差异：

```
ProviderAdapter 接口
├── fetchModels()  — 获取模型列表
└── testModel()    — 测试单个模型
```

支持厂商：
- **OpenAI 兼容** — 包含 NewAPI、OneAPI 等所有第三方代理
- **Anthropic** — Claude 系列模型官方 API
- **Gemini** — Google Gemini 系列 API

### API Key 安全机制

- **传输安全** — 通过 Next.js API Route 代理转发，Key 不暴露在浏览器端
- **存储安全** — 使用 AES-256-GCM 加密存储到数据库
- **显示脱敏** — 界面只显示末 4 位，如 `sk-****1234`

### URL 参数快速测试

支持直接通过 URL 参数注入配置，无需手动输入：

```
https://your-site.com?baseUrl=https://api.example.com&apiKey=sk-xxx&provider=openai
```

或使用已保存的配置 ID：

```
https://your-site.com?configId=123
```

---

## 技术栈

| 技术 | 版本 | 用途 | 官网 |
|------|------|------|------|
| Next.js | 16 | 全栈框架（App Router） | [nextjs.org](https://nextjs.org) |
| React | 19 | UI 渲染 | [react.dev](https://react.dev) |
| TypeScript | 5 | 类型安全 | [typescriptlang.org](https://www.typescriptlang.org) |
| Tailwind CSS | 4 | 样式框架 | [tailwindcss.com](https://tailwindcss.com) |
| Drizzle ORM | 0.45 | 数据库 ORM | [orm.drizzle.team](https://orm.drizzle.team) |
| better-sqlite3 | 12 | SQLite 驱动 | [github.com/WiseLibs/better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| jose | 6 | JWT 处理 | [github.com/panva/jose](https://github.com/panva/jose) |
| bcryptjs | 3 | 密码哈希 | [github.com/dcodeIO/bcrypt.js](https://github.com/dcodeIO/bcrypt.js) |

### 技术架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                           浏览器端 (React)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  ConfigForm  │  │  ModelTable  │  │ ProgressBar  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                               │ HTTP/JSON
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Next.js API Routes                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ /api/models  │  │  /api/test   │  │ /api/configs │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ /api/auth/*  │  │/api/histories│  │ Provider层   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Provider 适配器层                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   OpenAI     │  │  Anthropic   │  │   Gemini     │             │
│  │   Adapter    │  │   Adapter    │  │   Adapter    │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    第三方 AI 平台 / 官方 API                         │
│  OpenAI兼容 / Anthropic / Gemini                                    │
└─────────────────────────────────────────────────────────────────────┘

                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SQLite 数据库 (本地)                            │
│  users / saved_configs / check_histories                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 项目结构

```
model-checker/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── register/route.ts    # 用户注册
│   │   │   │   ├── login/route.ts       # 用户登录
│   │   │   │   ├── logout/route.ts      # 用户登出
│   │   │   │   └── me/route.ts          # 获取当前用户
│   │   │   ├── models/route.ts          # 获取模型列表
│   │   │   ├── test/route.ts            # 测试单个模型
│   │   │   ├── configs/
│   │   │   │   ├── route.ts             # 配置 CRUD
│   │   │   │   └── [id]/route.ts        # 单个配置操作
│   │   │   └── histories/
│   │   │       ├── route.ts             # 历史 CRUD
│   │   │       └── [id]/route.ts        # 删除历史
│   │   ├── dashboard/page.tsx           # 用户仪表板
│   │   ├── history/page.tsx             # 历史详情页
│   │   ├── layout.tsx                   # 根布局
│   │   ├── page.tsx                     # 主检测页面
│   │   └── globals.css                  # 全局样式
│   ├── components/
│   │   ├── AuthContext.tsx              # 认证状态管理
│   │   ├── AuthModal.tsx                # 登录/注册弹窗
│   │   ├── ConfigForm.tsx               # 配置输入表单
│   │   ├── ModelTable.tsx               # 模型列表表格
│   │   ├── Navbar.tsx                   # 导航栏
│   │   └── ProgressBar.tsx              # 进度条组件
│   ├── lib/
│   │   ├── providers/
│   │   │   ├── types.ts                 # Provider 接口定义
│   │   │   ├── openai.ts                # OpenAI 适配器
│   │   │   ├── anthropic.ts             # Anthropic 适配器
│   │   │   ├── gemini.ts                # Gemini 适配器
│   │   │   └── index.ts                 # Provider 工厂
│   │   ├── db/
│   │   │   ├── schema.ts                # 数据库表定义
│   │   │   └── index.ts                 # DB 连接
│   │   ├── auth.ts                      # JWT 工具
│   │   └── crypto.ts                    # 加密工具
│   └── types/
│       └── index.ts                     # 核心类型定义
├── data/
│   └── app.db                           # SQLite 数据库文件
├── public/                              # 静态资源
├── drizzle.config.ts                    # Drizzle 配置
├── next.config.ts                       # Next.js 配置
├── package.json                         # 项目依赖
├── tsconfig.json                        # TypeScript 配置
└── CLAUDE.md                            # Claude Code 工作指南
```

---

## 安装说明

### 环境要求

- Node.js 18+
- npm 9+ 或 pnpm 8+

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/your-username/model-checker.git

# 进入目录
cd model-checker

# 安装依赖
npm install
```

### 配置说明

项目使用 SQLite 本地数据库，无需额外配置。生产环境建议配置以下环境变量：

```bash
# .env.local
JWT_SECRET=your-random-64-character-string
ENCRYPTION_KEY=your-64-character-hex-string
```

生成随机密钥：
```bash
# 生成 JWT_SECRET
openssl rand -base64 64

# 生成 ENCRYPTION_KEY (64 hex chars)
openssl rand -hex 32
```

---

## 使用说明

### 快速开始

```bash
# 启动开发服务器
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)

### 使用示例

**方式一：手动输入**

1. 选择厂商类型（OpenAI 兼容 / Anthropic / Gemini）

2. 输入 Base URL（Anthropic/Gemini 有默认值，可省略）

3. 输入 API Key

4. 点击「获取模型列表」

5. 点击「全部检测」开始批量验证

6. 查看结果，✓ 表示可用，✗ 表示不可用

   ![image-20260228102305326](https://mypicture-1258720957.cos.ap-nanjing.myqcloud.com/image-20260228102305326.png)

**方式二：已保存配置（登录后）**

1. 从「快速选择配置」下拉框选择已保存的配置
2. 系统自动加载配置并获取模型列表

**方式三：URL 参数注入**

```
https://your-site.com?baseUrl=https://api.example.com&apiKey=sk-xxx&provider=openai
```

### 高级用法

**单个模型重测**：对检测失败或想重新验证的模型，点击该行的「重测」按钮。

**导出结果**：检测完成后，点击「复制为 Markdown」按钮。

**保存配置**：检测完成后会提示保存配置，下次可快速加载。

**查看历史**：登录后访问「Dashboard」查看所有历史记录。

---

## 开发指南

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 代码检查
npm run lint
```

### 构建部署

```bash
# 生产构建
npm run build

# 启动生产服务
npm run start
```

### 数据库操作

```bash
# 生成迁移文件
npx drizzle-kit generate

# 执行迁移
npx drizzle-kit migrate

# 打开数据库管理界面
npx drizzle-kit studio
```

### 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/xxx`)
3. 提交变更 (`git commit -m 'Add xxx'`)
4. 推送分支 (`git push origin feature/xxx`)
5. 提交 Pull Request

---

## 常见问题

<details>
<summary>获取模型列表失败怎么办？</summary>

1. 检查 Base URL 是否正确，确保包含协议前缀 `https://`
2. 检查 API Key 是否有效
3. 确认第三方平台是否正常运行
4. 查看浏览器控制台的错误信息
5. Anthropic/Gemini 可尝试不填 Base URL 使用默认值

</details>

<details>
<summary>部分模型检测失败是什么原因？</summary>

常见原因：
- **HTTP 401/403**：API Key 无权限访问该模型
- **HTTP 429**：触发了平台限流，稍后重试
- **HTTP 500**：上游模型服务异常
- **请求超时（30s）**：模型响应过慢或不可用
- **响应中无有效内容**：模型不支持 chat 接口（如 embedding 模型）

</details>

<details>
<summary>检测会消耗多少 Token？</summary>

每个模型的测试请求发送 `"hi"` 并限制 `max_tokens=5`，消耗极少。按 100 个模型估算，总消耗不超过 1000 tokens。

</details>

<details>
<summary>支持哪些平台？</summary>

支持所有兼容 OpenAI 标准接口的平台，包括但不限于：
- NewAPI / OneAPI 等聚合代理平台
- OpenAI 官方 API
- 各类 OpenAI 反向代理
- Anthropic Claude 官方 API
- Google Gemini 官方 API

</details>

<details>
<summary>数据库文件在哪里？</summary>

SQLite 数据库文件位于 `./data/app.db`，首次运行自动创建。如需重置，删除该文件即可。

</details>

<details>
<summary>如何部署到生产环境？</summary>

推荐使用 Vercel 或其他支持 Next.js 的平台：

```bash
# Vercel 部署
npm install -g vercel
vercel

# 注意：Vercel Serverless 环境不支持 better-sqlite3
# 需改用 Vercel Postgres 或其他云数据库
```

传统服务器部署：
```bash
npm run build
npm run start
```

</details>

---

## 路线图

### 计划功能

- [ ] 支持 Stream 模式检测
- [ ] 支持自定义并发数
- [ ] 支持按模型名称筛选/搜索
- [ ] 支持批量检测中止功能
- [ ] 导出为 CSV/JSON 格式
- [ ] 检测结果对比分析

### 优化计划

- [ ] 添加亮色主题切换
- [ ] 支持多平台对比检测
- [ ] 优化移动端体验
- [ ] 添加 PWA 支持

---

## License

SPDX-License-Identifier: MIT

---

## Star History

如果觉得项目不错，欢迎点个 Star ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=wwwzhouhui/model-checker&type=Date)](https://star-history.com/#wwwzhouhui/model-checker&Date)

---

**文档生成时间**: 2026-02-28
