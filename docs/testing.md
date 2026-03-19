# 测试指南

> 本文档介绍项目的测试框架配置和使用方法

## 测试框架

本项目使用以下测试工具：

| 测试类型 | 框架 | 用途 |
|---------|------|------|
| **单元测试** | Vitest | 工具函数、Hooks 测试 |
| **组件测试** | Testing Library + Vitest | React 组件测试 |
| **E2E 测试** | Playwright | 端到端集成测试 |
| **API 测试** | Vitest + supertest | API 接口测试 |

---

## 快速开始

### 安装依赖

首次使用需要安装测试依赖：

```bash
# 安装 Vitest + Testing Library
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/ui

# 安装 Playwright
pnpm add -D @playwright/test
npx playwright install
```

### 运行测试

```bash
# 运行单元测试（监听模式）
pnpm test

# 运行单元测试（单次）
pnpm test:run

# 打开 Vitest UI
pnpm test:ui

# 生成覆盖率报告
pnpm test:coverage

# 运行 E2E 测试
pnpm test:e2e

# 打开 Playwright UI
pnpm test:e2e:ui
```

---

## 目录结构

```
apps/web/
├── __tests__/
│   ├── setup.ts             # 测试配置文件
│   ├── unit/                # 单元测试
│   │   ├── utils.test.ts
│   │   └── validations/
│   │       └── auth.test.ts
│   ├── components/          # 组件测试
│   │   ├── login-form.test.tsx
│   │   └── register-form.test.tsx
│   └── e2e/                 # E2E 测试
│       ├── login.spec.ts
│       └── register.spec.ts
├── vitest.config.ts         # Vitest 配置
└── playwright.config.ts     # Playwright 配置
```

---

## 编写测试

### 单元测试示例

测试工具函数：

```typescript
// __tests__/unit/utils.test.ts
import { describe, it, expect } from "vitest"
import { cn } from "@workspace/ui/lib/utils"

describe("utils", () => {
  describe("cn", () => {
    it("合并类名", () => {
      expect(cn("foo", "bar")).toBe("foo bar")
    })

    it("处理条件类名", () => {
      expect(cn("foo", true && "bar", false && "baz")).toBe("foo bar")
    })
  })
})
```

### 组件测试示例

测试登录表单：

```typescript
// __tests__/components/login-form.test.tsx
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { LoginForm } from "@/components/auth/login-form"
import { signIn } from "next-auth/react"

// Mock next-auth
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}))

describe("LoginForm", () => {
  it("渲染登录表单", () => {
    render(<LoginForm />)
    
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/密码/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /登录/i })).toBeInTheDocument()
  })

  it("显示邮箱验证错误", async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    
    await user.click(screen.getByRole("button", { name: /登录/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/请输入有效的邮箱地址/i)).toBeInTheDocument()
    })
  })

  it("提交登录表单", async () => {
    const user = userEvent.setup()
    vi.mocked(signIn).mockResolvedValue({ ok: true, error: null })
    
    render(<LoginForm />)
    
    await user.type(screen.getByLabelText(/邮箱/i), "test@example.com")
    await user.type(screen.getByLabelText(/密码/i), "password123")
    await user.click(screen.getByRole("button", { name: /登录/i }))
    
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "test@example.com",
      password: "password123",
      redirect: false,
    })
  })
})
```

### E2E 测试示例

测试登录流程：

```typescript
// __tests__/e2e/login.spec.ts
import { test, expect } from "@playwright/test"

test.describe("登录流程", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
  })

  test("可以访问登录页面", async ({ page }) => {
    await expect(page).toHaveURL("/login")
    await expect(page.getByText("登录")).toBeVisible()
    await expect(page.getByText("输入你的邮箱和密码登录账户")).toBeVisible()
  })

  test("显示表单验证错误", async ({ page }) => {
    await page.click('button[type="submit"]')
    
    await expect(page.getByText("请输入有效的邮箱地址")).toBeVisible()
  })

  test("可以提交登录表单", async ({ page }) => {
    await page.fill('input[type="email"]', "test@example.com")
    await page.fill('input[type="password"]', "password123")
    await page.click('button[type="submit"]')
    
    // 等待 API 响应（可能成功或失败）
    await page.waitForResponse("**/api/auth/callback/credentials")
  })
})
```

---

## 测试最佳实践

### 1. 测试命名规范

```typescript
// ✅ 好的命名
describe("LoginForm", () => {
  it("渲染登录表单", () => {})
  it("显示验证错误", () => {})
  it("提交成功后跳转", () => {})
})

// ❌ 避免的命名
it("test1", () => {})
it("点击按钮", () => {}) // 不够具体
```

### 2. 使用 Page Object 模式（E2E）

```typescript
// __tests__/e2e/pages/login.page.ts
export class LoginPage {
  constructor(private page) {}

  async goto() {
    await this.page.goto("/login")
  }

  async fillEmail(email: string) {
    await this.page.fill('input[type="email"]', email)
  }

  async fillPassword(password: string) {
    await this.page.fill('input[type="password"]', password)
  }

  async submit() {
    await this.page.click('button[type="submit"]')
  }
}

// __tests__/e2e/login.spec.ts
import { test, expect } from "@playwright/test"
import { LoginPage } from "./pages/login.page"

test("登录成功", async ({ page }) => {
  const loginPage = new LoginPage(page)
  
  await loginPage.goto()
  await loginPage.fillEmail("test@example.com")
  await loginPage.fillPassword("password123")
  await loginPage.submit()
  
  await expect(page).toHaveURL("/dashboard")
})
```

### 3. Mock 外部依赖

```typescript
// Mock API 调用
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: "1" } })),
}))

// Mock 环境变量
vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000")
```

### 4. 测试覆盖率目标

```json
// vitest.config.ts
{
  "test": {
    "coverage": {
      "thresholds": {
        "global": {
          "branches": 70,
          "functions": 80,
          "lines": 80,
          "statements": 80
        }
      }
    }
  }
}
```

---

## CI/CD 集成

### GitHub Actions 示例

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      
      - run: pnpm install
      
      - run: pnpm test:run
      
      - run: pnpm test:e2e
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

---

## 常见问题

### Q: 如何处理 Next.js 路由？

使用 `next-router-mock`：

```bash
pnpm add -D next-router-mock
```

```typescript
// __tests__/setup.ts
import { useRouter } from "next-router-mock"
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => useRouter()),
  useRouter: vi.fn(() => useRouter()),
}))
```

### Q: 如何测试 Auth.js？

Mock `next-auth/react`：

```typescript
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "1", email: "test@example.com" } },
    status: "authenticated",
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))
```

### Q: Playwright 测试很慢怎么办？

1. 使用 `fullyParallel: true` 并行执行
2. 减少 `retries` 次数
3. 使用 `reuseExistingServer` 复用开发服务器

---

## 参考资源

- [Vitest 官方文档](https://vitest.dev/)
- [Testing Library 官方文档](https://testing-library.com/)
- [Playwright 官方文档](https://playwright.dev/)
