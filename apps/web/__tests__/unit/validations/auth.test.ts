import { describe, it, expect } from "vitest"
import { loginSchema, registerSchema } from "@/lib/validations/auth"

describe("Auth Validations", () => {
  describe("loginSchema", () => {
    it("验证有效的登录数据", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      })

      expect(result.success).toBe(true)
    })

    it("验证无效的邮箱", () => {
      const result = loginSchema.safeParse({
        email: "invalid-email",
        password: "password123",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toContain("email")
      }
    })

    it("验证密码长度", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "12345", // 少于 6 位
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("至少 6 位")
      }
    })
  })

  describe("registerSchema", () => {
    it("验证有效的注册数据", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "Password123",
        confirmPassword: "Password123",
      })

      expect(result.success).toBe(true)
    })

    it("验证密码不匹配", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "Password123",
        confirmPassword: "Password456",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors.some(e => e.message.includes("不一致"))).toBe(true)
      }
    })

    it("验证密码缺少大写字母", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors.some(e => e.message.includes("大写字母"))).toBe(true)
      }
    })
  })
})
