import * as z from "zod"

// 登录验证
export const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少 6 位"),
})

// 注册验证（前端表单）- 包含 confirmPassword
export const registerSchema = z.object({
  name: z.string().min(2, "姓名至少 2 个字符").optional().or(z.literal("")),
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

// 注册输入验证（后端 API）- 不包含 confirmPassword
export const registerInputSchema = z.object({
  name: z.string().min(2, "姓名至少 2 个字符").optional().or(z.literal("")),
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string()
    .min(6, "密码至少 6 位")
    .max(100, "密码最多 100 位")
    .regex(/[A-Z]/, "密码必须包含大写字母")
    .regex(/[a-z]/, "密码必须包含小写字母")
    .regex(/[0-9]/, "密码必须包含数字"),
})

// 忘记密码验证
export const forgotPasswordSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
})

// 重置密码验证
export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string()
    .min(6, "密码至少 6 位")
    .max(100, "密码最多 100 位"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
})

// 类型导出
export type LoginSchema = z.infer<typeof loginSchema>
export type RegisterSchema = z.infer<typeof registerSchema>
export type RegisterInputSchema = z.infer<typeof registerInputSchema>
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>
