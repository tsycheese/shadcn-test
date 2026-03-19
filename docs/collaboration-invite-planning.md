# 文档协作邀请系统规划

> 创建日期：2026 年 3 月 19 日  
> 状态：规划阶段

---

## 一、需求分析

### 当前问题

1. **文档访问控制缺失**
   - 任何知道文档 ID 的用户都能访问
   - 无法区分所有者和协作者
   - 无法实现权限分级

2. **协作邀请功能缺失**
   - 无法邀请他人协作文档
   - 无法管理协作者权限
   - 无法追踪邀请状态

---

### 目标功能

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **文档权限控制** | 只有所有者和协作者可访问 | 🔴 高 |
| **协作者管理** | 添加/修改/移除协作者 | 🔴 高 |
| **权限分级** | 只读/编辑/管理员 | 🔴 高 |
| **邮箱邀请** | 通过邮件邀请协作者 | 🟡 中 |
| **邀请管理** | 查看/取消待处理邀请 | 🟢 低 |

---

## 二、数据库设计

### 1. 新增协作者表

```prisma
// 权限级别枚举
enum Permission {
  READ      // 只读 - 只能查看文档
  WRITE     // 可编辑 - 可以编辑文档
  ADMIN     // 管理员 - 可邀请他人、修改权限
}

// 协作者表
model DocumentCollaborator {
  id         String   @id @default(uuid())
  documentId String
  userId     String
  permission Permission @default(READ)
  
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // 确保同一用户不能重复协作同一文档
  @@unique([documentId, userId])
  @@index([userId])
  @@index([documentId])
}

// 更新 Document 模型
model Document {
  id            String    @id @default(uuid())
  title         String
  content       Bytes?
  ownerId       String
  owner         User      @relation("DocumentOwner", fields: [ownerId], references: [id])
  
  collaborators DocumentCollaborator[] @relation("DocumentCollaborators")
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([ownerId])
}

// 更新 User 模型
model User {
  // ... 现有字段 ...
  
  collaborations DocumentCollaborator[] @relation("UserCollaborations")
  
  // ... 其他关系 ...
}
```

---

### 2. 新增邀请表

```prisma
// 邀请状态枚举
enum InvitationStatus {
  PENDING   // 待处理
  ACCEPTED  // 已接受
  REJECTED  // 已拒绝
  EXPIRED   // 已过期
}

// 文档邀请表
model DocumentInvitation {
  id         String           @id @default(uuid())
  documentId String
  email      String           // 被邀请人邮箱
  permission Permission        @default(READ)
  status     InvitationStatus @default(PENDING)
  token      String           @unique
  expires    DateTime
  
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  invitedBy  String   // 邀请人 ID
  inviter    User     @relation("InvitationsSent", fields: [invitedBy], references: [id])
  
  createdAt  DateTime @default(now())
  acceptedAt DateTime?
  
  @@index([token])
  @@index([documentId])
  @@index([email])
}

// 更新 User 模型
model User {
  // ... 现有字段 ...
  
  invitationsSent DocumentInvitation[] @relation("InvitationsSent")
  
  // ... 其他关系 ...
}
```

---

## 三、API 设计

### 权限检查

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/documents/:id/permissions` | 检查当前用户对文档的权限 | ✅ |

**响应示例：**
```json
{
  "documentId": "doc-123",
  "userId": "user-456",
  "permission": "WRITE",
  "isOwner": false,
  "canEdit": true,
  "canInvite": false
}
```

---

### 协作者管理

| 方法 | 路径 | 描述 | 权限要求 |
|------|------|------|---------|
| GET | `/api/documents/:id/collaborators` | 获取文档所有协作者 | READ+ |
| POST | `/api/documents/:id/collaborators` | 添加协作者 | ADMIN+ |
| PUT | `/api/documents/:id/collaborators/:id` | 修改协作者权限 | ADMIN+ |
| DELETE | `/api/documents/:id/collaborators/:id` | 移除协作者 | ADMIN+ |

**添加协作者 - 请求体：**
```json
{
  "userId": "user-789",
  "permission": "WRITE"
}
```

**响应：**
```json
{
  "success": true,
  "collaborator": {
    "id": "collab-1",
    "userId": "user-789",
    "name": "张三",
    "email": "zhang@example.com",
    "permission": "WRITE"
  }
}
```

---

### 邀请管理

| 方法 | 路径 | 描述 | 权限要求 |
|------|------|------|---------|
| POST | `/api/documents/:id/invite` | 发送邮箱邀请 | ADMIN+ |
| GET | `/api/documents/:id/invitations` | 获取文档邀请列表 | ADMIN+ |
| DELETE | `/api/invitations/:id` | 取消邀请 | ADMIN+ |
| POST | `/api/invitations/:token/accept` | 接受邀请 | ✅ |
| POST | `/api/invitations/:token/reject` | 拒绝邀请 | ✅ |

**发送邀请 - 请求体：**
```json
{
  "email": "user@example.com",
  "permission": "WRITE",
  "expiresIn": 86400 // 秒，默认 24 小时
}
```

**响应：**
```json
{
  "success": true,
  "invitation": {
    "id": "invite-1",
    "email": "user@example.com",
    "permission": "WRITE",
    "expires": "2026-03-20T12:00:00Z",
    "inviteLink": "https://yourapp.com/invite/abc123token"
  }
}
```

---

## 四、核心代码设计

### 1. 权限检查工具

```typescript
// lib/permissions.ts
import { Permission } from "@prisma/client"
import { prisma } from "@workspace/database"

export const PermissionLevel = {
  [Permission.READ]: 1,
  [Permission.WRITE]: 2,
  [Permission.ADMIN]: 3,
} as const

interface CheckPermissionOptions {
  userId: string
  documentId: string
  requiredPermission: Permission
}

/**
 * 检查用户是否有文档的指定权限
 */
export async function checkPermission({
  userId,
  documentId,
  requiredPermission,
}: CheckPermissionOptions): Promise<boolean> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      owner: true,
      collaborators: true,
    },
  })

  if (!doc) return false

  // 文档所有者拥有所有权限
  if (doc.ownerId === userId) {
    return true
  }

  // 检查协作者权限
  const collaboration = doc.collaborators.find(
    (c) => c.userId === userId
  )

  if (!collaboration) return false

  // 权限级别比较
  return PermissionLevel[collaboration.permission] >= 
         PermissionLevel[requiredPermission]
}

/**
 * 获取用户对文档的权限
 */
export async function getUserPermission(
  userId: string,
  documentId: string
): Promise<Permission | null> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      owner: true,
      collaborators: true,
    },
  })

  if (!doc) return null

  // 文档所有者
  if (doc.ownerId === userId) {
    return Permission.ADMIN
  }

  // 协作者
  const collaboration = doc.collaborators.find(
    (c) => c.userId === userId
  )

  return collaboration?.permission || null
}

/**
 * 权限检查中间件
 */
export function requirePermission(requiredPermission: Permission) {
  return async (
    userId: string,
    documentId: string
  ): Promise<{ allowed: boolean; error?: string }> => {
    const hasPermission = await checkPermission({
      userId,
      documentId,
      requiredPermission,
    })

    if (!hasPermission) {
      return {
        allowed: false,
        error: "无权访问",
      }
    }

    return { allowed: true }
  }
}
```

---

### 2. 邀请服务

```typescript
// lib/invitations.ts
import { DocumentInvitation, Permission } from "@prisma/client"
import { prisma } from "@workspace/database"
import { sendEmail } from "@/lib/mail"
import { nanoid } from "nanoid"

interface CreateInvitationOptions {
  documentId: string
  email: string
  permission: Permission
  invitedBy: string
  expiresIn?: number // 秒
}

/**
 * 创建文档邀请
 */
export async function createInvitation({
  documentId,
  email,
  permission,
  invitedBy,
  expiresIn = 86400, // 24 小时
}: CreateInvitationOptions): Promise<DocumentInvitation> {
  // 生成唯一 token
  const token = nanoid(32)
  const expires = new Date(Date.now() + expiresIn * 1000)

  // 检查是否已有待处理邀请
  const existing = await prisma.documentInvitation.findFirst({
    where: {
      documentId,
      email,
      status: "PENDING",
    },
  })

  if (existing) {
    throw new Error("该邮箱已有待处理的邀请")
  }

  // 创建邀请
  const invitation = await prisma.documentInvitation.create({
    data: {
      documentId,
      email,
      permission,
      invitedBy,
      token,
      expires,
    },
    include: {
      document: {
        select: {
          id: true,
          title: true,
        },
      },
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  // 发送邀请邮件
  const inviteLink = `${process.env.NEXTAUTH_URL}/invite/${token}`
  await sendInvitationEmail({
    to: email,
    documentTitle: invitation.document.title,
    inviterName: invitation.inviter.name || invitation.inviter.email,
    permission,
    inviteLink,
    expires,
  })

  return invitation
}

/**
 * 接受邀请
 */
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<void> {
  const invitation = await prisma.documentInvitation.findUnique({
    where: { token },
    include: { document: true },
  })

  if (!invitation) {
    throw new Error("邀请不存在")
  }

  if (invitation.status !== "PENDING") {
    throw new Error("邀请已失效")
  }

  if (invitation.expires < new Date()) {
    await prisma.documentInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    })
    throw new Error("邀请已过期")
  }

  // 检查被邀请人邮箱是否匹配
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user || user.email !== invitation.email) {
    throw new Error("邮箱不匹配")
  }

  // 添加协作者
  await prisma.documentCollaborator.create({
    data: {
      documentId: invitation.documentId,
      userId,
      permission: invitation.permission,
    },
  })

  // 更新邀请状态
  await prisma.documentInvitation.update({
    where: { id: invitation.id },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  })
}

/**
 * 发送邀请邮件
 */
async function sendInvitationEmail({
  to,
  documentTitle,
  inviterName,
  permission,
  inviteLink,
  expires,
}: {
  to: string
  documentTitle: string
  inviterName: string
  permission: Permission
  inviteLink: string
  expires: Date
}): Promise<void> {
  const permissionText = {
    READ: "只读权限",
    WRITE: "编辑权限",
    ADMIN: "管理员权限",
  }[permission]

  await sendEmail({
    to,
    subject: `${inviterName} 邀请你协作文档：${documentTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>文档协作邀请</h2>
        <p><strong>${inviterName}</strong> 邀请你协作文档：</p>
        <h3 style="color: #0066cc;">${documentTitle}</h3>
        <p>你的权限：<strong>${permissionText}</strong></p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" 
             style="background-color: #0066cc; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            接受邀请
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          邀请有效期至：${expires.toLocaleString("zh-CN")}
        </p>
        <p style="color: #999; font-size: 12px;">
          如果按钮无法点击，请复制以下链接到浏览器：<br/>
          ${inviteLink}
        </p>
      </div>
    `,
  })
}
```

---

### 3. API 路由实现

#### GET `/api/documents/:id/permissions`

```typescript
// apps/web/app/api/documents/[id]/permissions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserPermission, Permission, PermissionLevel } from "@/lib/permissions"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const permission = await getUserPermission(
      session.user.id,
      params.id
    )

    if (!permission) {
      return NextResponse.json({ error: "文档不存在" }, { status: 404 })
    }

    return NextResponse.json({
      documentId: params.id,
      userId: session.user.id,
      permission,
      isOwner: false, // 会在 API 中判断
      canEdit: PermissionLevel[permission] >= PermissionLevel.WRITE,
      canInvite: PermissionLevel[permission] >= PermissionLevel.ADMIN,
    })
  } catch (error) {
    console.error("检查权限失败:", error)
    return NextResponse.json(
      { error: "检查权限失败" },
      { status: 500 }
    )
  }
}
```

#### POST `/api/documents/:id/invite`

```typescript
// apps/web/app/api/documents/[id]/invite/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requirePermission, Permission } from "@/lib/permissions"
import { createInvitation } from "@/lib/invitations"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 检查权限
    const check = await requirePermission(Permission.ADMIN)(
      session.user.id,
      params.id
    )
    if (!check.allowed) {
      return NextResponse.json({ error: check.error }, { status: 403 })
    }

    const body = await req.json()
    const { email, permission = "READ", expiresIn = 86400 } = body

    // 验证邮箱格式
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "请输入有效的邮箱地址" },
        { status: 400 }
      )
    }

    // 创建邀请
    const invitation = await createInvitation({
      documentId: params.id,
      email,
      permission,
      invitedBy: session.user.id,
      expiresIn,
    })

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        permission: invitation.permission,
        expires: invitation.expires,
      },
    })
  } catch (error: any) {
    console.error("发送邀请失败:", error)
    return NextResponse.json(
      { error: error.message || "发送邀请失败" },
      { status: 500 }
    )
  }
}
```

#### POST `/api/invitations/:token/accept`

```typescript
// apps/web/app/api/invitations/[token]/accept/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { acceptInvitation } from "@/lib/invitations"
import { prisma } from "@workspace/database"

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 接受邀请
    await acceptInvitation(params.token, session.user.id)

    // 获取文档 ID
    const invitation = await prisma.documentInvitation.findUnique({
      where: { token: params.token },
      select: { documentId: true },
    })

    return NextResponse.json({
      success: true,
      documentId: invitation?.documentId,
    })
  } catch (error: any) {
    console.error("接受邀请失败:", error)
    return NextResponse.json(
      { error: error.message || "接受邀请失败" },
      { status: 500 }
    )
  }
}
```

---

## 五、UI 组件设计

### 1. 协作者列表组件

```typescript
// components/editor/collaborators-list.tsx
"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"

interface Collaborator {
  id: string
  userId: string
  name: string | null
  email: string
  permission: "READ" | "WRITE" | "ADMIN"
}

interface CollaboratorsListProps {
  documentId: string
  canManage: boolean
}

export function CollaboratorsList({ documentId, canManage }: CollaboratorsListProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/documents/${documentId}/collaborators`)
      .then((res) => res.json())
      .then((data) => {
        setCollaborators(data.collaborators)
        setLoading(false)
      })
  }, [documentId])

  if (loading) return <div>加载中...</div>

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">协作者</h3>
      
      <div className="space-y-2">
        {collaborators.map((collab) => (
          <div
            key={collab.id}
            className="flex items-center justify-between p-2 rounded-lg border"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {collab.name?.[0] || collab.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {collab.name || "匿名用户"}
                </p>
                <p className="text-xs text-muted-foreground">{collab.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={getPermissionVariant(collab.permission)}>
                {getPermissionLabel(collab.permission)}
              </Badge>
              
              {canManage && (
                <Select
                  value={collab.permission}
                  onValueChange={(value) =>
                    updatePermission(collab.id, value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="READ">只读</SelectItem>
                    <SelectItem value="WRITE">编辑</SelectItem>
                    <SelectItem value="ADMIN">管理员</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

### 2. 邀请对话框组件

```typescript
// components/editor/invite-dialog.tsx
"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button } from "@workspace/ui/components/button"

interface InviteDialogProps {
  documentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onInviteSuccess: () => void
}

export function InviteDialog({
  documentId,
  open,
  onOpenChange,
  onInviteSuccess,
}: InviteDialogProps) {
  const [email, setEmail] = useState("")
  const [permission, setPermission] = useState<"READ" | "WRITE" | "ADMIN">("READ")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleInvite() {
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/documents/${documentId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, permission }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "发送邀请失败")
      }

      onInviteSuccess()
      onOpenChange(false)
      setEmail("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>邀请协作者</DialogTitle>
          <DialogDescription>
            输入邮箱地址邀请他人协作文档
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>权限</Label>
            <Select value={permission} onValueChange={(v: any) => setPermission(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="READ">只读 - 只能查看</SelectItem>
                <SelectItem value="WRITE">编辑 - 可以编辑</SelectItem>
                <SelectItem value="ADMIN">管理员 - 可邀请他人</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleInvite} disabled={loading || !email}>
            {loading ? "发送中..." : "发送邀请"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

### 3. 邀请接受页面

```typescript
// apps/web/app/invite/[token]/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Loader2 } from "lucide-react"

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [invitation, setInvitation] = useState<any>(null)

  useEffect(() => {
    // 获取邀请信息
    fetch(`/api/invitations/${params.token}`)
      .then((res) => res.json())
      .then((data) => {
        setInvitation(data)
        setLoading(false)
      })
      .catch((err) => {
        setError("邀请不存在或已失效")
        setLoading(false)
      })
  }, [params.token])

  async function handleAccept() {
    if (!session) {
      // 未登录，跳转到登录页
      router.push(`/login?callbackUrl=/invite/${params.token}`)
      return
    }

    try {
      const res = await fetch(`/api/invitations/${params.token}/accept`, {
        method: "POST",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "接受邀请失败")
      }

      // 跳转到文档页面
      router.push(`/editor/${data.documentId}`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>文档协作邀请</CardTitle>
          <CardDescription>
            {invitation?.inviterName} 邀请你协作文档
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-semibold">{invitation?.documentTitle}</p>
            <p className="text-sm text-muted-foreground">
              权限：{getPermissionLabel(invitation?.permission)}
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {!session ? (
            <Button onClick={handleAccept} className="w-full">
              登录后接受
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleAccept} className="flex-1">
                接受邀请
              </Button>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                拒绝
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 六、实施步骤

### Phase 1: 数据库迁移（30 分钟）

```bash
# 1. 更新 Prisma Schema
# 2. 创建迁移
cd packages/database
pnpm db:migrate

# 3. 生成 Prisma Client
pnpm db:generate
```

---

### Phase 2: 权限工具函数（30 分钟）

```
□ 创建 lib/permissions.ts
□ 实现 checkPermission 函数
□ 实现 getUserPermission 函数
□ 实现 requirePermission 中间件
```

---

### Phase 3: 邀请服务（45 分钟）

```
□ 创建 lib/invitations.ts
□ 实现 createInvitation 函数
□ 实现 acceptInvitation 函数
□ 实现 sendInvitationEmail 函数
```

---

### Phase 4: API 路由（60 分钟）

```
□ GET  /api/documents/:id/permissions
□ GET  /api/documents/:id/collaborators
□ POST /api/documents/:id/collaborators
□ PUT  /api/documents/:id/collaborators/:id
□ DELETE /api/documents/:id/collaborators/:id
□ POST /api/documents/:id/invite
□ GET  /api/documents/:id/invitations
□ DELETE /api/invitations/:id
□ POST /api/invitations/:token/accept
□ POST /api/invitations/:token/reject
```

---

### Phase 5: UI 组件（60 分钟）

```
□ CollaboratorsList 组件
□ InviteDialog 组件
□ 邀请接受页面
□ 更新编辑器页面集成协作者管理
```

---

### Phase 6: 测试与优化（30 分钟）

```
□ 测试权限检查逻辑
□ 测试邀请流程
□ 测试邮件发送
□ 修复 bug
```

---

**总计**: 约 4.5 小时

---

## 七、环境变量配置

```bash
# .env.local

# 邮件服务
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=noreply@yourapp.com

# 应用 URL
NEXTAUTH_URL=http://localhost:3000
```

---

## 八、安全考虑

| 安全问题 | 解决方案 |
|---------|---------|
| **未授权访问** | 所有 API 都检查权限 |
| **权限提升** | 只有 ADMIN 能修改权限 |
| **邀请链接泄露** | Token 一次性使用 + 过期时间 |
| **邮箱枚举** | 不暴露用户是否存在 |
| **协作者删除文档** | 只有所有者能删除文档 |
| **邀请滥用** | 限制同时待处理邀请数量 |

---

## 九、后续扩展

- [ ] 批量邀请（一次邀请多人）
- [ ] 邀请模板（自定义邀请消息）
- [ ] 邀请历史记录
- [ ] 协作者活动日志
- [ ] 文档转让功能
- [ ] 群组协作（团队管理）

---

## 十、参考资料

- [Prisma 官方文档](https://www.prisma.io/docs/)
- [NextAuth.js 官方文档](https://authjs.dev/)
- [Nodemailer 官方文档](https://nodemailer.com/)
