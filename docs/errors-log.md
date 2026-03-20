# 常见错误记录

> 记录开发过程中遇到的常见错误和解决方案，避免重复犯错

---

## 2026-03-19: Next.js 16 params Promise 问题

### 错误现象

API 路由返回 500 错误，错误信息：
```
Error: Route "api/documents/[id]/permissions" used `params.id`. 
`params` is a Promise and must be unwrapped with `await` or `React.use()` 
before accessing its properties.
```

### 错误原因

在 **Next.js 16** 中，动态路由的 `params` 参数是 **Promise** 类型，而不是直接的对象。

**错误写法：**
```typescript
// ❌ 错误：直接访问 params.id
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const documentId = params.id  // 错误！params 是 Promise
}
```

**正确写法：**
```typescript
// ✅ 正确：使用 await 解包
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params  // 正确
}
```

### 影响范围

所有使用动态路由的 API 路由：
- `app/api/documents/[id]/permissions/route.ts`
- `app/api/documents/[id]/collaborators/route.ts`
- `app/api/documents/[id]/collaborators/[collaboratorId]/route.ts`
- `app/api/documents/[id]/invite/route.ts`
- `app/api/invitations/[token]/route.ts`
- `app/api/invitations/[token]/accept/route.ts`

### 解决方案

统一使用 `await params` 解包：

```typescript
// 单个参数
const { id } = await params

// 多个参数
const { id: documentId, collaboratorId } = await params

// token 参数
const { token } = await params
```

### 如何避免

**✅ 最佳实践：**
1. 在 API 路由中，始终将 `params` 类型声明为 `Promise<{...}>`
2. 第一时间使用 `await params` 解包
3. 使用解构赋值获取参数

**❌ 避免：**
- 直接访问 `params.xxx`
- 忘记添加 `await`
- 类型声明错误（声明为对象而不是 Promise）

---

## 2026-03-19: NEXTAUTH_SECRET 未设置警告

### 错误现象

服务器启动时持续输出警告：
```
NEXTAUTH_SECRET is not set
NEXTAUTH_SECRET is not set
...
```

### 错误原因

Auth.js (NextAuth.js) v5 需要设置 `NEXTAUTH_SECRET` 环境变量，但 `.env.local` 文件中未配置或配置错误。

### 解决方案

1. **生成随机密钥：**
   ```bash
   openssl rand -base64 32
   ```

2. **添加到 `.env.local`：**
   ```bash
   NEXTAUTH_SECRET=your-random-secret-here
   NEXTAUTH_URL=http://localhost:3000
   ```

3. **在 Auth.js 配置中使用：**
   ```typescript
   const config: NextAuthConfig = {
     secret: process.env.NEXTAUTH_SECRET,
     // ...
   }
   ```

### 注意事项

- 生产环境必须使用强随机字符串
- 不要将 `.env.local` 提交到 Git
- 每个环境（开发/测试/生产）应该有独立的 secret

---

## 2026-03-19: 权限检查 API 500 错误

### 错误现象

访问 `/api/documents/[id]/permissions` 返回 500 错误：
```json
{
  "error": "检查权限失败"
}
```

### 错误原因

访问 `PermissionLevel[permission]` 时类型不匹配：
- `permission` 是从数据库返回的字符串
- `PermissionLevel` 是 `Record<Permission, number>`
- TypeScript 无法确定 `permission` 是有效的键名

### 解决方案

使用类型断言和安全的访问方式：

```typescript
// ❌ 错误：可能返回 undefined
canEdit: (PermissionLevel[permission] || 0) >= (PermissionLevel.WRITE || 0)

// ✅ 正确：类型安全
const permissionLevel = PermissionLevel[permission as keyof typeof PermissionLevel] || 0
canEdit: permissionLevel >= 2  // WRITE = 2
canInvite: permissionLevel >= 3  // ADMIN = 3
```

---

## 2026-03-19: 浏览器自动填充邮箱 TypeError

### 错误现象

浏览器自动填充邮箱时，控制台报错：
```
Uncaught TypeError: Cannot read properties of undefined (reading 'toLowerCase')
    at onKeyDown (theme-provider.tsx:50:21)
```

### 错误原因

浏览器自动填充时会触发键盘事件，但某些事件的 `event.key` 可能是 `undefined`，直接调用 `.toLowerCase()` 导致错误。

### 解决方案

在调用方法前检查值是否存在：

```typescript
// ❌ 错误：直接调用
if (event.key.toLowerCase() !== "d") {

// ✅ 正确：先检查
if (!event.key || event.key.toLowerCase() !== "d") {
```

---

## 2026-03-19: 无限循环问题 (Maximum update depth exceeded)

### 错误现象

控制台报错：
```
Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, 
but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
```

### 错误原因

在编辑器页面中，`userId` 和 `userColor` 每次渲染都重新计算，导致 `useEffect` 依赖项变化，触发无限循环：

```typescript
// ❌ 错误：每次渲染都生成新值
userId: 'user-' + Math.random().toString(36).slice(2, 9),
userColor: '#' + Math.floor(Math.random()*16777215).toString(16),
```

### 解决方案

使用 `useMemo` 固定这些值：

```typescript
// ✅ 正确：使用 useMemo 固定值
const userId = useMemo(() => 'user-' + Math.random().toString(36).slice(2, 9), [])
const userColor = useMemo(() => '#' + Math.floor(Math.random()*16777215).toString(16), [])
```

---

## 2026-03-19: Monorepo 环境变量位置问题

### 错误现象

只有 `DATABASE_URL` 能正常加载，其他环境变量（`RESEND_API_KEY`, `MAIL_FROM`, `NEXTAUTH_SECRET` 等）都是 `undefined`。

### 错误原因

在 **monorepo 结构**中，错误地将 `.env.local` 放在了**根目录**：

```
shadcn-test/
├── apps/
│   └── web/
│       └── ...
├── packages/
└── .env.local  ❌ 错误位置！
```

**Next.js 只会读取自己目录下的环境变量文件**，不会读取 monorepo 根目录的 `.env.local`。

### 解决方案

**`.env.local` 应该放在 `apps/web/.env.local`：**

```
shadcn-test/
├── apps/
│   └── web/
│       ├── .env.local  ✅ 正确位置
│       └── ...
├── packages/
│   └── database/
│       └── .env        ✅ Prisma 的环境变量
└── .env.example        ✅ 示例文件可以放在根目录
```

### 正确的环境变量配置

**apps/web/.env.local：**
```bash
# NextAuth 配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Resend 邮件服务
RESEND_API_KEY=re_xxxxxxxxxxxxx
MAIL_FROM=onboarding@resend.dev

# WebSocket 协同服务器
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

**packages/database/.env：**
```bash
DATABASE_URL=postgresql://...
```

### 如何避免

1. **Next.js 应用的环境变量** → 放在 `apps/web/.env.local`
2. **Prisma 的数据库连接** → 放在 `packages/database/.env`
3. **示例文件** → 可以放在根目录 `.env.example`

### 学习要点

- Monorepo 结构中，每个应用有自己的环境变量文件
- Next.js 不会读取 monorepo 根目录的 `.env.local`
- Prisma 读取自己包目录下的 `.env` 文件

---

## 通用调试技巧

### 1. 查看服务器日志

当 API 返回 500 错误时，查看终端输出：
```bash
# 运行开发服务器
pnpm dev

# 查看错误堆栈
# 错误信息通常包含文件路径和行号
```

### 2. 使用浏览器开发者工具

**Network 标签：**
- 查看请求/响应
- 检查状态码
- 查看请求头和请求体

**Console 标签：**
- 查看 JavaScript 错误
- 查看 console.log 输出
- 运行测试代码

### 3. 数据库检查

使用 Prisma Studio 查看数据：
```bash
cd packages/database
pnpm db:studio
```
访问 http://localhost:5555

### 4. 类型检查

提交前运行类型检查：
```bash
pnpm typecheck
```

---

## 提交前检查清单

- [ ] 代码已测试通过
- [ ] 类型检查通过 (`pnpm typecheck`)
- [ ] 没有控制台错误
- [ ] Git commit message 清晰
- [ ] 更新了相关文档（如适用）

---

## 学习要点

1. **Next.js 16 的 params 是 Promise** - 必须使用 await 解包
2. **环境变量必须设置** - 特别是认证相关的 secret
3. **类型安全很重要** - 使用类型断言和空值检查
4. **避免无限循环** - 使用 useMemo 固定不变化的值
5. **浏览器事件要检查** - 某些属性可能是 undefined

---

**最后更新：** 2026-03-19
