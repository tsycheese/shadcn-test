# 富文本协同编辑器规划

> 创建日期：2026 年 3 月 19 日  
> 状态：规划阶段

---

## 一、技术选型

| 模块 | 技术选型 | 说明 |
|------|---------|------|
| **富文本编辑器** | **Tiptap** | 基于 ProseMirror，无头编辑器，高度可定制 |
| **协同算法** | **Yjs** | CRDT（无冲突复制数据类型），实时协同核心 |
| **实时通信** | **WebSocket** + y-websocket | 双向通信，广播文档更新 |
| **离线存储** | **y-indexeddb** | 浏览器 IndexedDB 持久化 |
| **用户感知** | **Yjs Awareness** | 显示其他用户光标和状态 |

---

## 二、系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    前端 (Next.js on Vercel)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    编辑器页面                             │  │
│  │  /editor/[docId]                                         │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │  │
│  │  │   Toolbar   │  │   Tiptap     │  │   User List     │ │  │
│  │  │  (工具栏)    │  │   Editor     │  │   (在线用户)     │ │  │
│  │  └─────────────┘  │   (编辑器)    │  └─────────────────┘ │  │
│  │                   └──────┬───────┘                       │  │
│  │                          │                                │  │
│  │  ┌───────────────────────▼───────────────────────────────┐│  │
│  │  │              Yjs Document                              ││  │
│  │  │  - 文档内容 (Y.Text)                                   ││  │
│  │  │  - 协同状态 (Awareness)                                ││  │
│  │  └───────────────────────┬───────────────────────────────┘│  │
│  │                          │                                 │  │
│  │  ┌───────────────────────▼───────────────────────────────┐│  │
│  │  │           WebSocket Provider (y-websocket)             ││  │
│  │  │  - 连接到协同服务器                                     ││  │
│  │  │  - 广播本地更新                                         ││  │
│  │  │  - 接收远程更新                                         ││  │
│  │  └───────────────────────────────────────────────────────┘│  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                         WebSocket                                │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│              协同服务器 (WebSocket on Railway)                    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   y-websocket Server                        │ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │ │
│  │  │  Room 管理   │  │  文档同步     │  │  Awareness 广播  │   │ │
│  │  │  (房间管理)  │  │  (Y.Update)  │  │  (光标/状态)     │   │ │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘   │ │
│  │                                                             │ │
│  │  房间 1: doc-1 → [Y.Doc, clients: [ws1, ws2, ...]]         │ │
│  │  房间 2: doc-2 → [Y.Doc, clients: [ws3, ws4, ...]]         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │   Redis (可选)     │  房间状态缓存           │
│                    └───────────────────┘                        │
└──────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                   业务 API (Next.js API Routes)                   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  /api/documents                                             │ │
│  │  - POST: 创建文档                                           │ │
│  │  - GET:  获取文档列表                                        │ │
│  │                                                             │ │
│  │  /api/documents/[id]                                        │ │
│  │  - GET:    获取文档详情                                      │ │
│  │  - PUT:    更新文档                                          │ │
│  │  - DELETE: 删除文档                                          │ │
│  │                                                             │ │
│  │  /api/documents/[id]/versions                               │ │
│  │  - GET: 获取版本历史                                         │ │
│  │  - POST: 创建版本快照                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │   PostgreSQL       │  文档元数据 + 快照       │
│                    │   (Neon)           │                        │
│                    └───────────────────┘                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 三、目录结构

```
shadcn-test/
├── apps/
│   └── web/
│       ├── app/
│       │   └── (dashboard)/
│       │       ├── editor/
│       │       │   ├── [docId]/
│       │       │   │   └── page.tsx          # 编辑器页面
│       │       │   └── new/
│       │       │       └── page.tsx          # 创建新文档
│       │       └── documents/
│       │           └── page.tsx              # 文档列表（已有）
│       │
│       ├── components/
│       │   └── editor/
│       │       ├── editor-container.tsx      # 编辑器容器
│       │       ├── editor-toolbar.tsx        # 工具栏
│       │       ├── editor-content.tsx        # 编辑区域
│       │       ├── user-list.tsx             # 在线用户列表
│       │       ├── collaboration-cursor.tsx  # 协同光标
│       │       └── sync-status.tsx           # 同步状态指示器
│       │
│       └── lib/
│           └── editor/
│               ├── use-editor.ts             # 编辑器 Hook
│               ├── yjs-provider.ts           # Yjs Provider
│               └── extensions/               # Tiptap 扩展
│                   ├── collaboration.ts
│                   └── cursor.ts
│
└── packages/
    └── ui/src/components/
        ├── editor/                           # 可复用的编辑器组件
        │   ├── tiptap-editor.tsx
        │   └── ...
        └── ...
```

---

## 四、核心组件设计

### 1. 编辑器 Hook (`use-editor.ts`)

```typescript
"use client"

import { useEffect, useState } from 'react'
import { useEditor as useTiptap } from '@tiptap/react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'

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
    
    // 1. 离线持久化 (IndexedDB)
    const indexeddbProvider = new IndexeddbPersistence(docId, doc)
    indexeddbProvider.on('synced', () => setIsSynced(true))

    // 2. WebSocket 协同
    if (wsUrl) {
      const wsProvider = new WebsocketProvider(wsUrl, docId, doc)
      
      // 设置用户感知（光标、颜色等）
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

  // 3. 创建 Tiptap 编辑器实例
  const editor = useTiptap({
    extensions: [
      StarterKit.configure({
        collaborative: false, // 使用 Yjs 协同
      }),
      Collaboration.configure({ 
        document: ydoc,
        field: 'content' // Yjs 字段名
      }),
      CollaborationCursor.configure({ 
        provider,
        user: { name: userName, color: userColor }
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

### 2. 编辑器页面 (`editor/[docId]/page.tsx`)

```typescript
"use client"

import { EditorContent } from '@tiptap/react'
import { useEditor } from '@/lib/editor/use-editor'
import { EditorToolbar } from '@/components/editor/editor-toolbar'
import { UserList } from '@/components/editor/user-list'
import { SyncStatus } from '@/components/editor/sync-status'

export default function EditorPage({ params }: { params: { docId: string } }) {
  const { editor, provider, isSynced, isOffline } = useEditor({
    docId: params.docId,
    userId: 'user-' + Math.random().toString(36).slice(2, 9),
    userName: '匿名用户',
    userColor: '#' + Math.floor(Math.random()*16777215).toString(16)
  })

  if (!editor) {
    return <div className="flex items-center justify-center h-screen">
      加载编辑器...
    </div>
  }

  return (
    <div className="flex flex-col h-screen">
      {/* 顶部工具栏 */}
      <EditorToolbar editor={editor} />
      
      {/* 编辑器内容 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <EditorContent editor={editor} className="prose max-w-none" />
        </div>
      </div>
      
      {/* 底部状态栏 */}
      <div className="border-t p-2 flex items-center justify-between">
        <SyncStatus synced={isSynced} offline={isOffline} />
        <UserList provider={provider} />
      </div>
    </div>
  )
}
```

### 3. 工具栏组件 (`editor-toolbar.tsx`)

```typescript
"use client"

import { Editor } from '@tiptap/react'
import { Button } from "@workspace/ui/components/button"
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered
} from "lucide-react"

interface EditorToolbarProps {
  editor: Editor | null
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null

  return (
    <div className="border-b p-2 flex gap-1">
      <Button
        size="sm"
        variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      <Button
        size="sm"
        variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Button>
      
      <Button
        size="sm"
        variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-2" />
      
      <Button
        size="sm"
        variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Button>
      
      <Button
        size="sm"
        variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

### 4. 在线用户列表 (`user-list.tsx`)

```typescript
"use client"

import { WebsocketProvider } from 'y-websocket'
import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"

interface User {
  id: string
  name: string
  color: string
}

interface UserListProps {
  provider: WebsocketProvider | null
}

export function UserList({ provider }: UserListProps) {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    if (!provider) return

    // 获取其他用户
    const updateUsers = () => {
      const states = provider.awareness.getStates()
      const userList: User[] = []
      
      states.forEach((state, clientId) => {
        if (state.user) {
          userList.push(state.user as User)
        }
      })
      
      setUsers(userList)
    }

    updateUsers()
    provider.awareness.on('update', updateUsers)

    return () => {
      provider.awareness.off('update', updateUsers)
    }
  }, [provider])

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">在线:</span>
      <div className="flex -space-x-2">
        {users.map((user) => (
          <Avatar key={user.id} className="h-6 w-6 border-2" style={{ borderColor: user.color }}>
            <AvatarFallback className="text-xs" style={{ backgroundColor: user.color }}>
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
    </div>
  )
}
```

### 5. 同步状态指示器 (`sync-status.tsx`)

```typescript
"use client"

import { Cloud, CloudOff, CloudCog } from "lucide-react"

interface SyncStatusProps {
  synced: boolean
  offline: boolean
}

export function SyncStatus({ synced, offline }: SyncStatusProps) {
  if (offline) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CloudOff className="h-4 w-4" />
        <span>离线模式</span>
      </div>
    )
  }

  if (!synced) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CloudCog className="h-4 w-4 animate-pulse" />
        <span>同步中...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <Cloud className="h-4 w-4" />
      <span>已同步</span>
    </div>
  )
}
```

---

## 五、协同服务器

### 1. 基础版（y-websocket）

```typescript
// apps/collaboration-server/src/index.ts
import http from 'http'
import { WebSocketServer } from 'ws'
import { WebSocket } from 'ws'
import * as Y from 'yjs'
import { setupWSConnection } from 'y-websocket/bin/utils'

const PORT = process.env.PORT || 3001
const docs = new Map<string, {
  doc: Y.Doc,
  clients: Set<WebSocket>,
  lastUpdate: number
}>()

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200)
    res.end('OK')
    return
  }
  
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
  const state = Y.encodeStateAsUpdate(room.doc)
  ws.send(state)

  // 设置连接
  setupWSConnection(ws, req, { docName: docId })

  ws.on('close', () => {
    room.clients.delete(ws)
  })
})

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
})
```

### 2. Dockerfile（部署用）

```dockerfile
# apps/collaboration-server/Dockerfile
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

## 六、开发路线图

| 阶段 | 任务 | 预计时间 |
|------|------|---------|
| **Phase 1** | 安装依赖 | 10 分钟 |
| | - Tiptap 核心 + 扩展 | |
| | - Yjs + y-websocket + y-indexeddb | |
| **Phase 2** | 创建编辑器 Hook | 30 分钟 |
| | - use-editor.ts | |
| | - Yjs Provider 配置 | |
| **Phase 3** | 创建编辑器页面 | 30 分钟 |
| | - editor/[docId]/page.tsx | |
| | - 编辑器容器 | |
| **Phase 4** | 创建工具栏组件 | 30 分钟 |
| | - 基础格式（粗体、斜体等） | |
| | - 列表、对齐 | |
| **Phase 5** | 协同功能 | 30 分钟 |
| | - 在线用户列表 | |
| | - 协同光标 | |
| | - 同步状态指示器 | |
| **Phase 6** | 文档 API | 30 分钟 |
| | - 创建/获取/更新文档 | |
| | - 文档列表 | |
| **Phase 7** | 协同服务器 | 30 分钟 |
| | - y-websocket 服务器 | |
| | - 房间管理 | |
| **Phase 8** | 测试与优化 | 30 分钟 |

**总计**: 约 4 小时

---

## 七、需要安装的依赖

```bash
cd apps/web

# Tiptap 核心
pnpm add @tiptap/core @tiptap/react @tiptap/starter-kit

# Tiptap 扩展
pnpm add @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor

# Yjs 协同
pnpm add yjs y-websocket y-indexeddb
```

---

## 八、环境变量

```bash
# .env.local

# WebSocket 协同服务器地址
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# 生产环境
# NEXT_PUBLIC_WS_URL=wss://your-collaboration-server.railway.app
```

---

## 九、API 设计

### 文档 API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/documents` | 创建新文档 |
| GET | `/api/documents` | 获取文档列表 |
| GET | `/api/documents/:id` | 获取文档详情 |
| PUT | `/api/documents/:id` | 更新文档 |
| DELETE | `/api/documents/:id` | 删除文档 |
| GET | `/api/documents/:id/versions` | 获取版本历史 |
| POST | `/api/documents/:id/versions` | 创建版本快照 |

### 请求/响应示例

**创建文档**
```typescript
// POST /api/documents
// Request
{
  "title": "我的文档",
  "content": null // Yjs 二进制快照（可选）
}

// Response
{
  "id": "doc-123",
  "title": "我的文档",
  "ownerId": "user-456",
  "createdAt": "2026-03-19T12:00:00Z"
}
```

---

## 十、后续扩展

- [ ] 更多格式支持（表格、代码块、图片）
- [ ] 文档版本历史
- [ ] 文档评论/批注
- [ ] 文档权限管理
- [ ] 导出为 PDF/Markdown
- [ ] 全文搜索
- [ ] 文档模板
- [ ] 快捷键自定义

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
- [ProseMirror](https://prosemirror.net/)
