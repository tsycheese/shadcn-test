# 生产级 Yjs WebSocket 协同服务器 Dockerfile
FROM node:20-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 安装构建依赖（用于 level 原生模块）
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json ./

# 安装所有依赖（包括 devDependencies 用于构建）
RUN pnpm install --no-frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm build

# 生产阶段
FROM base AS runner
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# 复制 package.json
COPY package.json ./

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 复制构建产物
COPY --from=builder /app/dist ./dist

# 创建数据目录（用于 LevelDB）
RUN mkdir -p /app/data && chmod 755 /app/data

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD nc -z localhost 8080 || exit 1

# 启动服务器
CMD ["node", "dist/index.js"]
