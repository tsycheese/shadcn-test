# 富文本协同编辑系统规划

> 创建日期：2026 年 3 月 19 日  
> 状态：规划阶段

## 一、需求确认

| 需求项 | 选择 |
|--------|------|
| **规模** | 小型 (2-10 人/文档) |
| **离线支持** | 需要 |
| **数据库** | PostgreSQL + Prisma |
| **部署** | Vercel + 独立 WebSocket 服务 |

---

## 二、技术选型

| 模块 | 方案 |
|------|------|
| **富文本编辑器** | Tiptap (基于 ProseMirror) |
| **协同算法** | Yjs (CRDT) |
| **实时通信** | WebSocket + y-websocket |
| **后端框架** | Node.js + Hono/Express |
| **数据库** | PostgreSQL + Prisma ORM |
| **离线存储** | y-indexeddb |
| **前端框架** | Next.js 16 + React 19 |
| **部署** | Vercel (前端) + Railway/Render (WebSocket) |

---

## 三、系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (Next.js on Vercel)                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │   编辑器 UI  │  │  协同状态管理  │  │  用户感知 (光标/选中)    │ │
│  │  (Tiptap)   │◄─┤   (Yjs)      │◄─┤  (Awareness Protocol) │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
│                            │                                      │
│                         WebSocket                                 │
└────────────────────────────┼──────────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│              协同服务 (WebSocket on Railway/Render)                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │  y-websocket    │  │  Awareness API  │  │  房间/权限管理    │  │
│  │  (Yjs Provider) │  │  (光标/状态)     │  │                  │  │
│  └─────────────────┘  └─────────────────┘  └──────────────────┘  │
│                            │                                      │
│                    ┌───────▼───────┐                              │
│                    │    Redis      │  (房间状态缓存 - 可选)        │
│                    └───────────────┘                              │
└───────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                    业务服务层 (API - Next.js API Routes)           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │   文档 CRUD     │  │   用户/权限      │  │  版本历史/快照    │  │
│  └─────────────────┘  └─────────────────┘  └──────────────────┘  │
│                            │                                      │
│                    ┌───────▼───────┐                              │
│                    │  PostgreSQL   │  (文档元数据 + 用户数据)       │
│                    │  (Vercel PG   │                              │
│                    │   或外部 DB)   │                              │
│                    └───────────────┘                              │
└───────────────────────────────────────────────────────────────────┘
```

---

## 四、Monorepo 目录结构

```
shadcn-test/
├── apps/
│   ├── web/                        # Next.js 主应用 (Vercel 部署)
│   │   ├── app/
│   │   │   ├── editor/
│   │   │   │   └── [docId]/        # 编辑器页面
│   │   │   └── ...
│   │   └── components/
│   │       └── editor/             # 编辑器相关组件
│   │
│   └── collaboration-server/       # WebSocket 服务 (独立部署)
│       ├── src/
│       │   ├── index.ts            # 服务入口
│       │   ├── rooms.ts            # 房间管理
│       │   └── persistence.ts      # 持久化回调
│       └── package.json
│
├── packages/
│   ├── ui/                         # shadcn/ui 组件库
│   │
│   ├── editor-core/                # 编辑器核心封装 (新建)
│   │   ├── src/
│   │   │   ├── editor/
│   │   │   │   ├── index.ts        # Tiptap 配置
│   │   │   │   ├── extensions/     # 自定义扩展
│   │   │   │   └── schema/         # 文档 Schema
│   │   │   ├── yjs/
│   │   │   │   ├── provider.ts     # WebSocket Provider
│   │   │   │   ├── indexeddb.ts    # 离线持久化
│   │   │   │   └── awareness.ts    # 用户感知
│   │   │   └── hooks/
│   │   │       └── useEditor.ts    # React Hook
│   │   └── package.json
│   │
│   ├── database/                   # 数据库层 (新建)
│   │   ├── src/
│   │   │   ├── client.ts           # Prisma Client
│   │   │   └── schema/             # Prisma Schema
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── package.json
│   │
│   ├── eslint-config/              # 共享 ESLint 配置 (保留)
│   └── typescript-config/          # 共享 TS 配置 (保留)
│
└── turbo.json                      # Turborepo 配置 (更新)
```

---

## 五、数据库 Schema

```prisma
// packages/database/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  image     String?
  documents Document[] @relation("DocumentOwner")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Document {
  id          String   @id @default(uuid())
  title       String
  content     Bytes?   // Yjs 二进制快照
  ownerId     String
  owner       User     @relation("DocumentOwner", fields: [ownerId], references: [id])
  versions    Version[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([ownerId])
}

model Version {
  id         String   @id @default(uuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  content    Bytes    // Yjs 二进制快照
  note       String?  // 版本备注
  createdAt  DateTime @default(now())

  @@index([documentId])
}
```

---

## 六、核心代码示例

### 1. 编辑器 Hook (`packages/editor-core/src/hooks/useEditor.ts`)

```typescript
import { useEffect, useState, useCallback } from 'react'
import { useEditor as useTiptap, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'

interface UseEditorOptions {
  docId: string
  userId: string
  userName?: string
  userColor?: string
  wsUrl?: string
}

export function useEditor({ 
  docId, 
  userId, 
  userName = '匿名用户',
  userColor = '#958DF1',
  wsUrl = process.env.NEXT_PUBLIC_WS_URL 
}: UseEditorOptions) {
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null)
  const [isSynced, setIsSynced] = useState(false)

  useEffect(() => {
    const doc = new Y.Doc()
    
    // 离线持久化 (IndexedDB)
    const indexeddbProvider = new IndexeddbPersistence(docId, doc)
    indexeddbProvider.on('synced', () => setIsSynced(true))

    // WebSocket 协同
    if (wsUrl) {
      const wsProvider = new WebsocketProvider(wsUrl, docId, doc)
      
      // 设置用户感知
      wsProvider.awareness.setLocalStateField('user', {
        id: userId,
        name: userName,
        color: userColor
      })

      setProvider(wsProvider)
    }

    setYdoc(doc)

    return () => {
      provider?.destroy()
      doc.destroy()
    }
  }, [docId, userId, userName, userColor, wsUrl])

  const editor = useTiptap({
    extensions: [
      StarterKit.configure({
        collaborative: false,
      }),
      Collaboration.configure({ 
        document: ydoc,
        field: 'content'
      }),
      CollaborationCursor.configure({ 
        provider,
        user: {
          name: userName,
          color: userColor
        }
      }),
    ],
    editable: true,
    immediatelyRender: false,
  })

  return { 
    editor, 
    provider, 
    ydoc, 
    isSynced,
    isOffline: !provider?.connected
  }
}
```

### 2. WebSocket 服务 (`apps/collaboration-server/src/index.ts`)

```typescript
import http from 'http'
import { WebSocketServer } from 'ws'
import { WebSocket } from 'ws'
import * as Y from 'yjs'
import { encodeStateAsUpdate, applyUpdate } from 'yjs'
import { setupWSConnection } from 'y-websocket/bin/utils'

const PORT = process.env.PORT || 3001

// 房间存储
const docs = new Map<string, {
  doc: Y.Doc,
  clients: Set<WebSocket>,
  lastUpdate: number
}>()

const server = http.createServer((req, res) => {
  // 健康检查
  if (req.url === '/health') {
    res.writeHead(200)
    res.end('OK')
    return
  }
  
  // 获取房间状态
  if (req.url === '/rooms') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      rooms: Array.from(docs.keys()),
      count: docs.size
    }))
    return
  }
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const docId = new URL(req.url!, 'http://localhost').pathname.slice(1)
  
  if (!docId) {
    ws.close()
    return
  }

  // 创建或获取房间
  if (!docs.has(docId)) {
    docs.set(docId, {
      doc: new Y.Doc(),
      clients: new Set(),
      lastUpdate: Date.now()
    })
  }

  const room = docs.get(docId)!
  room.clients.add(ws)

  // 发送当前文档状态
  const state = encodeStateAsUpdate(room.doc)
  ws.send(state)

  // 设置连接
  setupWSConnection(ws, req, { docName: docId })

  ws.on('close', () => {
    room.clients.delete(ws)
    
    // 房间为空时清理 (可选：保留一段时间)
    if (room.clients.size === 0) {
      // 可以选择持久化后删除
      // persistDocument(docId, room.doc)
      // docs.delete(docId)
    }
  })

  ws.on('error', () => {
    room.clients.delete(ws)
  })
})

// 定期持久化 (生产环境应连接到数据库)
setInterval(() => {
  docs.forEach((room, docId) => {
    if (Date.now() - room.lastUpdate > 60000) {
      // 超过 1 分钟未更新，可以持久化
      // persistDocument(docId, room.doc)
    }
  })
}, 60000)

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
})
```

### 3. 编辑器页面 (`apps/web/app/editor/[docId]/page.tsx`)

```typescript
'use client'

import { EditorContent } from '@tiptap/react'
import { useEditor } from '@workspace/editor-core/hooks/useEditor'
import { Toolbar } from '@/components/editor/toolbar'
import { UserList } from '@/components/editor/user-list'
import { SyncStatus } from '@/components/editor/sync-status'

interface PageProps {
  params: Promise<{ docId: string }>
}

export default function EditorPage({ params }: PageProps) {
  const { docId } = await params
  
  const { editor, provider, isSynced, isOffline } = useEditor({
    docId,
    userId: 'user-' + Math.random().toString(36).slice(2, 9),
    userName: '匿名用户',
    userColor: '#' + Math.floor(Math.random()*16777215).toString(16)
  })

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse">加载编辑器...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* 顶部工具栏 */}
      <div className="border-b bg-background">
        <div className="flex items-center justify-between p-2">
          <Toolbar editor={editor} />
          <div className="flex items-center gap-4">
            <SyncStatus synced={isSynced} offline={isOffline} />
            <UserList provider={provider} />
          </div>
        </div>
      </div>

      {/* 编辑器内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <EditorContent 
            editor={editor} 
            className="prose prose-sm max-w-none dark:prose-invert"
          />
        </div>
      </div>
    </div>
  )
}
```

---

## 七、依赖包清单

### packages/editor-core

```json
{
  "name": "@workspace/editor-core",
  "version": "0.0.0",
  "dependencies": {
    "@tiptap/core": "^2.0.0",
    "@tiptap/react": "^2.0.0",
    "@tiptap/starter-kit": "^2.0.0",
    "@tiptap/extension-collaboration": "^2.0.0",
    "@tiptap/extension-collaboration-cursor": "^2.0.0",
    "yjs": "^13.6.0",
    "y-websocket": "^2.0.0",
    "y-indexeddb": "^9.0.0"
  }
}
```

### apps/collaboration-server

```json
{
  "name": "collaboration-server",
  "version": "0.0.0",
  "dependencies": {
    "ws": "^8.0.0",
    "y-websocket": "^2.0.0",
    "yjs": "^13.6.0"
  },
  "devDependencies": {
    "@types/ws": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

### packages/database

```json
{
  "name": "@workspace/database",
  "version": "0.0.0",
  "dependencies": {
    "@prisma/client": "^5.0.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0"
  }
}
```

---

## 八、开发路线图

| 阶段 | 任务 | 状态 |
|------|------|------|
| **Phase 1** | 基础架构搭建 | ⏳ 待开始 |
| | - 创建 `packages/editor-core` | |
| | - 创建 `packages/database` | |
| | - 创建 `apps/collaboration-server` | |
| | - 配置 Prisma Schema | |
| **Phase 2** | 编辑器核心 | ⏳ 待开始 |
| | - Tiptap 基础配置 | |
| | - Yjs 集成 | |
| | - 离线持久化 (IndexedDB) | |
| **Phase 3** | 协同服务 | ⏳ 待开始 |
| | - WebSocket 服务搭建 | |
| | - 房间管理 | |
| | - 持久化回调 | |
| **Phase 4** | 用户感知 | ⏳ 待开始 |
| | - 协同光标 | |
| | - 在线用户列表 | |
| | - 用户颜色分配 | |
| **Phase 5** | API 服务 | ⏳ 待开始 |
| | - 文档 CRUD | |
| | - 版本历史 | |
| **Phase 6** | UI 组件 | ⏳ 待开始 |
| | - 工具栏 | |
| | - 同步状态指示器 | |
| | - 快捷键 | |
| **Phase 7** | 测试与优化 | ⏳ 待开始 |

---

## 九、环境变量配置

### 前端 (.env.local)

```bash
# WebSocket 服务地址
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# 生产环境
# NEXT_PUBLIC_WS_URL=wss://your-collaboration-server.railway.app
```

### 协同服务 (.env)

```bash
PORT=3001

# 数据库连接 (用于持久化)
DATABASE_URL=postgresql://user:password@localhost:5432/shadcn_editor
```

### 数据库 (.env)

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/shadcn_editor
```

---

## 十、部署指南

### Vercel (前端)

1. 连接 GitHub 仓库
2. 设置环境变量 `NEXT_PUBLIC_WS_URL`
3. 部署

### Railway/Render (WebSocket 服务)

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .

RUN pnpm build --filter=collaboration-server

EXPOSE 3001

CMD ["pnpm", "start", "--filter=collaboration-server"]
```

---

## 十一、注意事项

1. **Yjs 文档 ID**: 确保每个文档有唯一的 ID
2. **离线同步**: IndexedDB 存储需要处理冲突
3. **权限控制**: 生产环境需要验证用户权限
4. **性能优化**: 大文档需要分块加载
5. **安全性**: WebSocket 连接需要认证

---

## 十二、参考资料

- [Tiptap 官方文档](https://tiptap.dev/)
- [Yjs 官方文档](https://docs.yjs.dev/)
- [y-websocket](https://github.com/yjs/y-websocket)
- [Prisma 官方文档](https://www.prisma.io/docs/)

---

## 十三、登录注册页面规划

> 更新日期：2026 年 3 月 19 日

### 一、需求确认

| 需求项 | 选择 |
|--------|------|
| **登录方式** | 仅邮箱密码 |
| **邮箱验证** | 需要 |
| **密码重置** | 需要 |
| **会话存储** | JWT (默认) |

---

### 二、技术选型

| 模块 | 方案 |
|------|------|
| **认证库** | Auth.js (NextAuth.js) v5 |
| **密码哈希** | bcryptjs |
| **表单验证** | Zod + React Hook Form |
| **会话存储** | JWT (无需额外数据库表) |
| **邮件服务** | Nodemailer + SMTP |

---

### 三、功能特性

| 功能 | 状态 |
|------|------|
| 邮箱密码登录 | ✅ |
| 用户注册 | ✅ |
| 邮箱验证 | ✅ |
| 密码重置 | ✅ |
| OAuth 登录 | ❌ |

---

### 四、数据库 Schema

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  passwordHash  String?
  image         String?
  
  documents     Document[] @relation("DocumentOwner")
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([email])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

---

### 五、目录结构

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── verify-email/page.tsx
│   │   └── layout.tsx
│   │
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/route.ts
│       ├── register/route.ts
│       ├── forgot-password/route.ts
│       ├── reset-password/route.ts
│       └── verify-email/route.ts
│
├── components/
│   └── auth/
│       ├── login-form.tsx
│       ├── register-form.tsx
│       ├── forgot-password-form.tsx
│       ├── reset-password-form.tsx
│       └── auth-provider.tsx
│
└── lib/
    ├── auth.ts
    ├── mail.ts
    └── validations/
        └── auth.ts
```

---

### 六、API 接口设计

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/signin` | 登录 (Auth.js 内置) |
| POST | `/api/auth/signout` | 登出 (Auth.js 内置) |
| POST | `/api/register` | 用户注册 |
| POST | `/api/forgot-password` | 发送重置密码邮件 |
| POST | `/api/reset-password` | 重置密码 |
| GET | `/api/verify-email?token=xxx` | 验证邮箱 |

---

### 七、表单验证 Schema

```typescript
// apps/web/lib/validations/auth.ts
import * as z from "zod"

export const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少 6 位"),
})

export const registerSchema = z.object({
  name: z.string().min(2, "姓名至少 2 个字符").optional(),
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string()
    .min(6, "密码至少 6 位")
    .max(100, "密码最多 100 位")
    .regex(/[A-Z]/, "密码必须包含大写字母")
    .regex(/[a-z]/, "密码必须包含小写字母")
    .regex(/[0-9]/, "密码必须包含数字"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
})

export type LoginSchema = z.infer<typeof loginSchema>
export type RegisterSchema = z.infer<typeof registerSchema>
```

---

### 八、Auth.js 配置

```typescript
// apps/web/lib/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@workspace/database"
import bcrypt from "bcryptjs"
import { loginSchema } from "@/lib/validations/auth"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" }
      },
      authorize: async (credentials) => {
        const validated = loginSchema.safeParse(credentials)
        
        if (!validated.success) return null
        
        const { email, password } = validated.data
        
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.passwordHash) return null
        
        const isMatch = await bcrypt.compare(password, user.passwordHash)
        if (!isMatch) return null
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  
  pages: {
    signIn: "/login",
  },
  
  session: {
    strategy: "jwt",
  },
  
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
```

---

### 九、环境变量配置

```env
# .env.local
DATABASE_URL=postgresql://user:password@localhost:5432/shadcn_editor

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# 邮件服务 (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 邮件配置
MAIL_FROM=noreply@yourapp.com
SITE_NAME=Collab Editor
```

---

### 十、开发路线图

| 阶段 | 任务 | 预计时间 |
|------|------|---------|
| **Phase 1** | 安装依赖 | 10 分钟 |
| | - `next-auth@beta`, `@auth/prisma-adapter` | |
| | - `bcryptjs`, `@types/bcryptjs` | |
| | - `react-hook-form`, `@hookform/resolvers` | |
| | - `nodemailer` | |
| **Phase 2** | 添加 shadcn/ui 组件 | 10 分钟 |
| | - Input, Label, Card, Form | |
| **Phase 3** | 更新 Prisma Schema 并迁移 | 10 分钟 |
| **Phase 4** | 配置 Auth.js 和 JWT 会话 | 20 分钟 |
| **Phase 5** | 创建登录/注册页面和表单 | 30 分钟 |
| **Phase 6** | 实现注册 API 和邮箱验证 | 30 分钟 |
| **Phase 7** | 实现忘记密码/重置密码 | 30 分钟 |
| **Phase 8** | 路由保护和用户状态管理 | 20 分钟 |

**总计**: 约 2.5 小时

---

### 十一、需要安装的依赖

```bash
# 认证
pnpm add next-auth@beta @auth/prisma-adapter

# 密码哈希
pnpm add bcryptjs
pnpm add -D @types/bcryptjs

# 表单
pnpm add react-hook-form @hookform/resolvers

# 邮件
pnpm add nodemailer

# shadcn/ui 组件
pnpm dlx shadcn@latest add input label card form
```

---

### 十二、注意事项

1. **NEXTAUTH_SECRET**: 生产环境必须使用强随机字符串
   ```bash
   openssl rand -base64 32
   ```

2. **邮件服务**: 推荐使用 SendGrid, Resend 或 Gmail App Password

3. **密码安全**: 
   - 密码至少 6 位，建议包含大小写字母和数字
   - bcrypt 哈希成本因子建议为 12

4. **邮箱验证**: 
   - 验证令牌有效期设为 24 小时
   - 防止重复发送验证邮件

5. **会话安全**:
   - JWT 过期时间建议 7 天
   - 启用 HTTP Only Cookie
   - 生产环境启用 HTTPS

---

### 十三、后续扩展

- [ ] GitHub OAuth 登录
- [ ] Google OAuth 登录
- [ ] 双因素认证 (2FA)
- [ ] 记住我功能
- [ ] 账户删除功能
- [ ] 修改邮箱/密码功能
