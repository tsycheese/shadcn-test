# shadcn-test Monorepo 项目概览

## 项目概述

这是一个基于 **Next.js** 的 monorepo 模板，使用 **shadcn/ui** 组件库。项目采用 Turborepo 进行构建编排，pnpm 作为包管理器，支持多应用协作开发。

### 核心特性

- **UI 组件系统**: 基于 shadcn/ui 和 Radix UI 的可复用组件库
- **数据库集成**: 使用 Prisma ORM 进行数据库管理
- **实时协作**: 集成 Yjs 实现协同编辑功能
- **认证系统**: 基于 NextAuth.js 的身份验证
- **完整测试**: 包含 Vitest 单元测试和 Playwright E2E 测试

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16, React 19 |
| 语言 | TypeScript 5.9 |
| 样式 | Tailwind CSS 4, shadcn/ui |
| 数据库 | Prisma 6 |
| 认证 | NextAuth.js 5 (beta) |
| 协作 | Yjs, Tiptap |
| 测试 | Vitest, Playwright |
| 构建工具 | Turborepo, pnpm |

## 项目结构

```
shadcn-test/
├── apps/
│   ├── web/                 # Next.js 主应用
│   └── collaboration-server/ # Yjs 协作服务器
├── packages/
│   ├── ui/                  # shadcn/ui 组件库
│   ├── database/            # Prisma 数据库配置
│   ├── eslint-config/       # ESLint 共享配置
│   └── typescript-config/   # TypeScript 共享配置
└── docs/                    # 文档
```

## 构建与运行

### 环境要求

- Node.js >= 20
- pnpm >= 9.15.9

### 安装依赖

```bash
pnpm install
```

### 开发命令

```bash
# 启动所有应用的开发服务器
pnpm dev

# 构建所有项目
pnpm build

# 运行代码检查
pnpm lint

# 格式化代码
pnpm format

# 类型检查
pnpm typecheck
```

### Web 应用特定命令

```bash
# 进入 web 应用目录
cd apps/web

# 开发服务器 (使用 Turbopack)
pnpm dev

# 生产构建
pnpm build

# 启动生产服务器
pnpm start

# 运行单元测试
pnpm test
pnpm test:run        # 一次性运行
pnpm test:ui        # 带 UI 界面
pnpm test:coverage  # 带覆盖率报告

# 运行 E2E 测试
pnpm test:e2e
pnpm test:e2e:ui    # 带 UI 界面
```

### 数据库命令

```bash
# 进入 database 包
cd packages/database

# 生成 Prisma 客户端
pnpm db:generate

# 推送 schema 到数据库
pnpm db:push

# 运行迁移
pnpm db:migrate

# 打开 Prisma Studio
pnpm db:studio
```

### 协作服务器命令

```bash
# 进入 collaboration-server 目录
cd apps/collaboration-server

# 启动开发服务器
pnpm dev

# 构建
pnpm build

# 启动生产服务器
pnpm start
```

## 添加 UI 组件

在 `apps/web` 目录下运行：

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

组件将被放置在 `packages/ui/src/components` 目录中。

### 使用组件

```tsx
import { Button } from "@workspace/ui/components/button";
```

## 开发规范

### 代码风格

- **缩进**: 2 空格
- **引号**: 双引号
- **分号**: 不使用分号
- **行尾**: LF (Unix 风格)
- **行宽**: 80 字符
- **尾随逗号**: ES5 风格 (对象/数组最后一项后加逗号)

### 工具配置

- **ESLint**: 每个 workspace 有独立的 `eslint.config.js`
- **Prettier**: 集成 Tailwind CSS 插件，识别 `cn` 和 `cva` 函数
- **TypeScript**: 严格模式，使用 `NodeNext` 模块解析

### VS Code 推荐设置

项目包含 `.vscode/settings.json`，推荐配置：

- TypeScript SDK 路径指向 `node_modules/typescript/lib`
- Prisma 固定到 v6 版本

## 部署配置

项目使用 Vercel 部署，配置见 `vercel.json`：

- 构建命令：`pnpm turbo build --filter=@workspace/database --filter=web`
- 安装命令：`pnpm install`
- 框架：Next.js

## 包管理器配置

- 使用 pnpm workspace 管理多包依赖
- 工作区协议：`workspace:*` 或 `workspace:^`
- 引擎要求：Node.js >= 20

## 测试实践

- **单元测试**: Vitest + Testing Library
- **E2E 测试**: Playwright
- 测试文件位于 `__tests__/` 目录
- 支持测试覆盖率报告
