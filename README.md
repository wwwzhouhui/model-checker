# Model Checker

一键检测第三方 NewAPI 代理平台上的 AI 模型可用性，快速识别哪些模型能用、哪些不能用。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-v0.1.0-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)

> 输入 API Key 和 Base URL，自动拉取模型列表并逐个验证，结果一目了然。

---

## 项目介绍

### 项目概述

Model Checker 是一个基于 Next.js 的 Web 工具，专为使用 NewAPI / OneAPI 等第三方代理平台的用户设计。它通过 OpenAI 标准兼容接口，自动获取平台上的所有模型，并逐个发送测试请求验证可用性，帮助用户快速筛选出可正常调用的模型。

### 核心功能

- **模型列表拉取** — 通过 `GET /v1/models` 标准接口获取全部模型
- **批量可用性检测** — 并发调用 `POST /v1/chat/completions` 逐个验证
- **实时状态展示** — ✓ 可用 / ✗ 不可用 / ○ 待检测，进度条实时更新
- **单个重测** — 对任意模型随时重新检测
- **结果导出** — 一键复制为 Markdown 表格
- **API Key 安全** — 通过 Next.js API Route 代理转发，Key 不暴露在浏览器端

### 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16 | 全栈框架（App Router） |
| React | 19 | UI 渲染 |
| TypeScript | 5 | 类型安全 |
| Tailwind CSS | 4 | 样式 |

---

## 功能清单

| 功能名称 | 功能说明 | 状态 |
|---------|---------|------|
| 配置输入 | 输入 Base URL + API Key | ✅ |
| 获取模型列表 | 调用 /v1/models 接口拉取所有模型 | ✅ |
| 批量检测 | 3 并发队列逐个测试模型可用性 | ✅ |
| 单个重测 | 对任意模型单独重新检测 | ✅ |
| 进度条 | 实时显示检测进度和统计数据 | ✅ |
| 状态图标 | ✓ 可用 / ✗ 不可用 / spinner 检测中 / ○ 待检测 | ✅ |
| 响应耗时 | 显示每个模型的请求耗时（ms） | ✅ |
| 错误信息 | 显示失败模型的具体错误原因 | ✅ |
| Markdown 导出 | 复制检测结果为 Markdown 表格 | ✅ |
| 响应式布局 | 适配桌面端和移动端 | ✅ |

---

## 安装说明

### 环境要求

- Node.js 18+
- npm 9+

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/your-username/model-checker.git

# 进入目录
cd model-checker

# 安装依赖
npm install
```

---

## 使用说明

### 快速开始

```bash
# 启动开发服务器
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)，按以下步骤操作：

1. 输入第三方平台的 **Base URL**（如 `https://api.hotaruapi.top`）
2. 输入对应的 **API Key**（如 `sk-xxxx`）
3. 点击 **「获取模型列表」**
4. 点击 **「全部检测」** 开始批量验证
5. 查看结果，✓ 表示可用，✗ 表示不可用

### 配置说明

| 参数 | 说明 | 示例 |
|------|------|------|
| Base URL | 第三方平台的 API 地址 | `https://api.hotaruapi.top` |
| API Key | 平台分配的密钥 | `sk-44Fr3Emk80aGpi...` |

### 使用示例

**批量检测**：点击「全部检测」，系统以 3 个并发逐个测试所有模型，实时更新进度条和状态图标。

**单个重测**：对检测失败或想重新验证的模型，点击该行的「重测」按钮。

**导出结果**：检测完成后，点击「复制为 Markdown」按钮，将结果粘贴到文档或聊天中分享。

---

## 项目结构

```
model-checker/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── models/route.ts    # API 路由：代理获取模型列表
│   │   │   └── test/route.ts      # API 路由：代理测试单个模型
│   │   ├── layout.tsx             # 根布局
│   │   ├── page.tsx               # 主页面（状态管理 + 并发调度）
│   │   └── globals.css            # 全局样式
│   ├── components/
│   │   ├── ConfigForm.tsx         # 配置输入表单
│   │   ├── ModelTable.tsx         # 模型列表表格（响应式）
│   │   └── ProgressBar.tsx        # 进度条 + 统计摘要
│   └── types/
│       └── index.ts               # 核心类型定义
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## 开发指南

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（Turbopack 加速）
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

### 技术架构

```
浏览器                        Next.js Server                    第三方平台
  │                               │                               │
  │  POST /api/models             │                               │
  │  { baseUrl, apiKey }          │                               │
  │ ─────────────────────────────>│  GET {baseUrl}/v1/models      │
  │                               │  Authorization: Bearer {key}  │
  │                               │ ─────────────────────────────>│
  │                               │<─────────────────────────────│
  │<─────────────────────────────│                               │
  │                               │                               │
  │  POST /api/test               │                               │
  │  { baseUrl, apiKey, modelId } │  POST {baseUrl}/v1/chat/...   │
  │ ─────────────────────────────>│ ─────────────────────────────>│
  │                               │<─────────────────────────────│
  │<─────────────────────────────│                               │
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
<summary>支持哪些兼容平台？</summary>

支持所有兼容 OpenAI 标准接口的平台，包括但不限于：
- NewAPI
- OneAPI
- 各类 OpenAI 反向代理

</details>

---

## 路线图

### 计划功能

- [ ] 支持 Embedding 模型检测（使用 `/v1/embeddings` 接口）
- [ ] 支持自定义并发数
- [ ] 支持按模型名称筛选/搜索
- [ ] 检测结果持久化（localStorage）
- [ ] 批量检测中止功能

### 优化项

- [ ] 添加暗色模式
- [ ] 支持多平台对比检测
- [ ] 导出为 CSV/JSON 格式

---

## License

SPDX-License-Identifier: MIT
