# 文档协作邀请系统完善计划

> 创建日期：2026 年 3 月 21 日  
> 状态：部分完成 - 核心功能已实现，待完善辅助功能

---

## 一、当前实现状态

### ✅ 已完成功能

| 模块 | 功能 | 文件位置 | 说明 |
|------|------|---------|------|
| **邀请发送** | 邀请表单组件 | `components/editor/invite-dialog.tsx` | 输入邮箱和权限 |
| **邀请发送** | 协作者面板 | `components/editor/collaborators-panel.tsx` | 协作者管理入口 |
| **邀请发送** | 协作者列表 | `components/editor/collaborators-list.tsx` | 显示/管理协作者 |
| **邀请发送** | 权限徽章 | `components/editor/permission-badge.tsx` | 权限可视化 |
| **邀请发送** | 创建邀请 API | `app/api/documents/[id]/invite/route.ts` | POST 接口 |
| **邀请逻辑** | 邀请服务 | `lib/invitations.ts` | 核心业务逻辑 |
| **邀请逻辑** | 邮件发送 | `lib/mail.ts` | Resend 集成 |
| **邀请逻辑** | 权限检查 | `lib/permissions.ts` | 权限验证工具 |
| **邀请接受** | 邀请页面 | `app/invite/[token]/page.tsx` | 落地页 |
| **邀请接受** | 获取邀请 API | `app/api/invitations/[token]/route.ts` | GET 接口 |
| **邀请接受** | 接受邀请 API | `app/api/invitations/[token]/accept/route.ts` | POST 接口 |
| **协作者管理** | 协作者列表 API | `app/api/documents/[id]/collaborators/route.ts` | GET/POST |
| **协作者管理** | 修改/移除 API | `app/api/documents/[id]/collaborators/[id]/route.ts` | PUT/DELETE |
| **数据库** | Prisma Schema | `packages/database/prisma/schema.prisma` | 数据模型 |

### 📧 邮件功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 发件人配置 | ✅ | `Collab Editor <email@resend.tsycheese.icu>` |
| 回复邮箱 | ✅ | `replyTo` 设置为邀请人邮箱 |
| 邀请人联系方式 | ✅ | 邮件底部显示邀请人邮箱链接 |
| 权限显示 | ✅ | 邮件中显示权限级别 |
| 有效期显示 | ✅ | 邮件中显示邀请过期时间 |

---

## 二、待实现功能

### 🔴 高优先级

#### 1. 拒绝邀请功能

**需求**：用户可以在邀请页面点击"拒绝"按钮，将邀请标记为已拒绝。

**实现**：
- API: `POST /api/invitations/[token]/reject`
- 更新 `DocumentInvitation.status` 为 `REJECTED`
- 前端：`app/invite/[token]/page.tsx` 已有"拒绝"按钮，需连接 API

**文件**：
```
app/api/invitations/[token]/reject/route.ts  (新建)
lib/invitations.ts  (新增 rejectInvitation 函数)
```

**参考代码**：
```typescript
// lib/invitations.ts
export async function rejectInvitation(token: string): Promise<void> {
  const invitation = await prisma.documentInvitation.findUnique({
    where: { token },
  })

  if (!invitation) {
    throw new Error("邀请不存在")
  }

  if (invitation.status !== "PENDING") {
    throw new Error("邀请已失效")
  }

  await prisma.documentInvitation.update({
    where: { id: invitation.id },
    data: { status: "REJECTED" },
  })
}
```

---

#### 2. 取消邀请功能

**需求**：邀请人可以取消已发送但待处理的邀请。

**实现**：
- API: `DELETE /api/documents/[id]/invitations/[invitationId]`
- 仅允许邀请人或文档所有者取消
- 更新 `DocumentInvitation.status` 为 `EXPIRED` 或直接删除

**文件**：
```
app/api/documents/[id]/invitations/[invitationId]/route.ts  (新建)
lib/invitations.ts  (新增 cancelInvitation 函数)
```

---

### 🟡 中优先级

#### 3. 邀请列表功能

**需求**：文档所有者可以查看已发送的所有邀请（包括待处理、已接受、已拒绝）。

**实现**：
- API: `GET /api/documents/[id]/invitations`
- 返回邀请列表，包含状态、被邀请人邮箱、权限等
- 前端：在协作者面板中新增"待处理邀请"标签页

**文件**：
```
app/api/documents/[id]/invitations/route.ts  (新建)
components/editor/invitations-list.tsx  (新建)
```

**返回数据结构**：
```typescript
{
  invitations: Array<{
    id: string
    email: string
    permission: Permission
    status: InvitationStatus
    createdAt: Date
    expires: Date
    acceptedAt?: Date
  }>
}
```

---

#### 4. 邀请过期清理

**需求**：定期清理已过期的邀请，避免数据库膨胀。

**实现**：
- 方案 A：定时任务（Vercel Cron / Railway Cron）
- 方案 B：每次查询时软清理（推荐）

**文件**：
```
app/api/cron/expire-invitations/route.ts  (新建)
lib/invitations.ts  (新增 expireInvitations 函数)
```

**参考代码**：
```typescript
// 方案 B：软清理
export async function expireInvitations(documentId?: string) {
  const where = documentId 
    ? { documentId, status: "PENDING", expires: { lt: new Date() } }
    : { status: "PENDING", expires: { lt: new Date() } }

  await prisma.documentInvitation.updateMany({
    where,
    data: { status: "EXPIRED" },
  })
}
```

---

### 🟢 低优先级

#### 5. 直接添加协作者

**需求**：文档所有者可以直接添加站内用户为协作者，无需通过邮箱邀请。

**实现**：
- 前端：添加"搜索用户"输入框
- API: `POST /api/documents/[id]/collaborators` (已有，需完善前端)
- 验证：检查用户是否存在、是否已是协作者

**文件**：
```
components/editor/add-collaborator-dialog.tsx  (新建)
```

---

#### 6. 邀请模板优化

**需求**：优化邮件模板，增加品牌标识、社交分享等。

**实现**：
- 添加 Logo
- 添加页脚（退订链接、联系方式）
- 优化移动端显示

**文件**：
```
lib/invitations.ts  (修改 sendInvitationEmail 函数)
```

---

#### 7. 批量邀请

**需求**：一次性邀请多个协作者。

**实现**：
- 前端：多邮箱输入（逗号分隔）
- API: 批量创建邀请
- 邮件：每封邮件独立发送

**文件**：
```
components/editor/batch-invite-dialog.tsx  (新建)
app/api/documents/[id]/invite/batch/route.ts  (新建)
```

---

## 三、数据库模型

### 当前模型

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
  email      String
  permission Permission        @default(READ)
  status     InvitationStatus @default(PENDING)
  token      String           @unique
  expires    DateTime

  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  invitedBy  String
  inviter    User     @relation("InvitationsSent", fields: [invitedBy], references: [id])

  createdAt  DateTime  @default(now())
  acceptedAt DateTime?

  @@index([token])
  @@index([documentId])
  @@index([email])
}
```

### 可能需要的新增字段

| 字段 | 类型 | 说明 | 优先级 |
|------|------|------|--------|
| `rejectedAt` | `DateTime?` | 拒绝时间 | 🟢 低 |
| `reminderSent` | `Boolean` | 是否发送过提醒 | 🟢 低 |

---

## 四、API 路由完整列表

### 已实现

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/api/documents/[id]/invite` | 发送邮箱邀请 | ADMIN |
| GET | `/api/documents/[id]/collaborators` | 获取协作者列表 | READ+ |
| POST | `/api/documents/[id]/collaborators` | 添加协作者 | ADMIN |
| PUT | `/api/documents/[id]/collaborators/[id]` | 修改权限 | ADMIN |
| DELETE | `/api/documents/[id]/collaborators/[id]` | 移除协作者 | ADMIN |
| GET | `/api/documents/[id]/permissions` | 检查权限 | 登录 |
| GET | `/api/invitations/[token]` | 获取邀请信息 | 公开 |
| POST | `/api/invitations/[token]/accept` | 接受邀请 | 登录 |

### 待实现

| 方法 | 路径 | 描述 | 权限 | 优先级 |
|------|------|------|------|--------|
| POST | `/api/invitations/[token]/reject` | 拒绝邀请 | 登录 | 🔴 高 |
| DELETE | `/api/documents/[id]/invitations/[id]` | 取消邀请 | ADMIN | 🔴 高 |
| GET | `/api/documents/[id]/invitations` | 获取邀请列表 | ADMIN | 🟡 中 |
| POST | `/api/cron/expire-invitations` | 过期清理 | Cron | 🟡 中 |

---

## 五、前端组件完整列表

### 已实现

| 组件 | 文件 | 说明 |
|------|------|------|
| 协作者面板 | `components/editor/collaborators-panel.tsx` | 侧边栏面板 |
| 协作者列表 | `components/editor/collaborators-list.tsx` | 列表 + 管理 |
| 邀请对话框 | `components/editor/invite-dialog.tsx` | 发送邀请 |
| 权限徽章 | `components/editor/permission-badge.tsx` | 权限显示 |
| 邀请页面 | `app/invite/[token]/page.tsx` | 落地页 |

### 待实现

| 组件 | 文件 | 说明 | 优先级 |
|------|------|------|--------|
| 邀请列表 | `components/editor/invitations-list.tsx` | 待处理邀请列表 | 🟡 中 |
| 添加协作者 | `components/editor/add-collaborator-dialog.tsx` | 搜索并添加用户 | 🟢 低 |
| 批量邀请 | `components/editor/batch-invite-dialog.tsx` | 批量发送邀请 | 🟢 低 |

---

## 六、开发路线图

### Phase 1 - 完善核心流程（🔴 高优先级）

1. **拒绝邀请 API** - 30 分钟
2. **取消邀请 API** - 30 分钟
3. **前端连接** - 30 分钟

**预计时间**: 1.5 小时

---

### Phase 2 - 管理功能（🟡 中优先级）

1. **邀请列表 API** - 30 分钟
2. **邀请列表 UI** - 1 小时
3. **过期清理** - 30 分钟

**预计时间**: 2 小时

---

### Phase 3 - 体验优化（🟢 低优先级）

1. **直接添加协作者** - 1 小时
2. **邮件模板优化** - 1 小时
3. **批量邀请** - 2 小时

**预计时间**: 4 小时

---

## 七、测试清单

### 功能测试

- [ ] 发送邀请到有效邮箱
- [ ] 发送邀请到无效邮箱（验证错误处理）
- [ ] 重复发送邀请到同一邮箱
- [ ] 接受邀请（已登录）
- [ ] 接受邀请（未登录 → 登录）
- [ ] 拒绝邀请
- [ ] 取消邀请
- [ ] 过期邀请自动失效
- [ ] 修改协作者权限
- [ ] 移除协作者

### 边界测试

- [ ] 邀请过期后尝试接受
- [ ] 已接受的邀请再次接受
- [ ] 已拒绝的邀请再次接受
- [ ] 无权限用户尝试发送邀请
- [ ] 协作者权限升级/降级

### 邮件测试

- [ ] 邮件正常发送
- [ ] 邮件内容正确显示
- [ ] replyTo 功能正常
- [ ] 邀请人邮箱链接可点击

---

## 八、已知问题

### 问题 1：WebSocket 协同服务器版本不匹配

**描述**：客户端 `y-websocket@^3.0.0`，服务器 `y-websocket@^2.0.4`

**解决**：升级服务器依赖并使用官方实现

**状态**：待修复

---

### 问题 2：协作者光标显示异常

**描述**：`CollaborationCursor` 扩展存在兼容性问题

**解决**：暂时禁用，后续修复

**状态**：已禁用

---

## 九、参考资料

- [NextAuth.js 官方文档](https://authjs.dev/)
- [Resend 官方文档](https://resend.com/docs)
- [Prisma 官方文档](https://www.prisma.io/docs/)
- [Tiptap 官方文档](https://tiptap.dev/)
- [Yjs 官方文档](https://docs.yjs.dev/)

---

## 十、更新日志

| 日期 | 更新内容 | 作者 |
|------|---------|------|
| 2026-03-21 | 初始版本，记录待实现功能 | - |
| 2026-03-21 | 添加 replyTo 功能和邀请人邮箱链接 | - |

---

**备注**：本规划文档用于记录文档协作邀请系统的完善计划，日后有时间可继续开发。
