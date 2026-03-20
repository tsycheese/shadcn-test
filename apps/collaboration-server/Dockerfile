FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖配置
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建 TypeScript
RUN pnpm build

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["pnpm", "start"]
