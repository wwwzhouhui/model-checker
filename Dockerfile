# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:24-alpine AS deps

# 安装编译依赖（better-sqlite3 需要）
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci

# ============================================
# Stage 2: Builder
# ============================================
FROM node:24-alpine AS builder

RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置构建时环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建应用
RUN npm run build

# ============================================
# Stage 3: Runner
# ============================================
FROM node:24-alpine AS runner

RUN apk add --no-cache sqlite

WORKDIR /app

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# 复制 .next 目录
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 创建 data 目录用于 SQLite 数据库
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "server.js"]
