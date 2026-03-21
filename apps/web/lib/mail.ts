import { Resend } from "resend"

// 延迟初始化 Resend
let resendInstance: Resend | null = null

function getResend() {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY environment variable")
    }
    resendInstance = new Resend(apiKey)
  }
  return resendInstance
}

interface SendEmailOptions {
  /**
   * 收件人邮箱地址
   */
  to: string
  /**
   * 邮件主题
   */
  subject: string
  /**
   * 邮件内容，支持 HTML 格式
   */
  html: string
  /**
   * 回复邮箱（可选）
   * 当收件人点击回复时，邮件会发送到此地址
   */
  replyTo?: string
}

export async function sendEmail({ 
  to, 
  subject, 
  html,
  replyTo 
}: SendEmailOptions) {
  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from: process.env.MAIL_FROM || 'onboarding@resend.dev',
      to,
      subject,
      html,
      ...(replyTo && { replyTo }),
    })

    if (error) {
      console.error("邮件发送失败:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("邮件发送失败:", error)
    return { success: false, error }
  }
}

// 生成验证令牌
export function generateVerificationToken(email: string) {
  const token = Buffer.from(`${email}:${Date.now()}`).toString("base64")
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 小时

  return { token, expires }
}

// 生成重置密码令牌
export function generateResetToken(email: string) {
  const token = Buffer.from(`${email}:${Date.now()}:${Math.random()}`).toString(
    "base64"
  )
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 小时

  return { token, expires }
}
