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

/**
 * 发送密码重置邮件参数
 */
interface SendPasswordResetEmailOptions {
  to: string
  token: string
  expires: Date
}

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail({
  to,
  token,
  expires,
}: SendPasswordResetEmailOptions): Promise<void> {
  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

  await sendEmail({
    to,
    subject: "重置你的密码",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">密码重置请求</h2>
        <p style="color: #666;">你请求重置密码，请点击下方按钮设置新密码：</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}"
             style="background-color: #0066cc; color: white; padding: 12px 30px;
                    text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            重置密码
          </a>
        </div>

        <p style="color: #999; font-size: 14px; margin-top: 15px;">
          或者复制以下链接到浏览器：<br/>
          <a href="${resetLink}" style="color: #0066cc;">${resetLink}</a>
        </p>

        <p style="color: #999; font-size: 14px; margin-top: 15px;">
          链接有效期至：${expires.toLocaleString("zh-CN")}
        </p>

        <p style="color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          ⚠️ 如果你没有请求重置密码，请忽略此邮件。
        </p>
      </div>
    `,
  })
}

/**
 * 发送邮箱验证邮件参数
 */
interface SendVerificationEmailOptions {
  to: string
  token: string
  expires: Date
}

/**
 * 发送邮箱验证邮件
 */
export async function sendVerificationEmail({
  to,
  token,
  expires,
}: SendVerificationEmailOptions): Promise<void> {
  const verifyLink = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`

  await sendEmail({
    to,
    subject: "验证你的邮箱地址",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">欢迎加入！</h2>
        <p style="color: #666;">感谢你的注册，请点击下方按钮验证你的邮箱地址：</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}"
             style="background-color: #0066cc; color: white; padding: 12px 30px;
                    text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            验证邮箱
          </a>
        </div>

        <p style="color: #999; font-size: 14px; margin-top: 15px;">
          或者复制以下链接到浏览器：<br/>
          <a href="${verifyLink}" style="color: #0066cc;">${verifyLink}</a>
        </p>

        <p style="color: #999; font-size: 14px; margin-top: 15px;">
          链接有效期至：${expires.toLocaleString("zh-CN")}
        </p>

        <p style="color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          ⚠️ 如果你没有注册此账户，请忽略此邮件。
        </p>
      </div>
    `,
  })
}

/**
 * 发送删除账户确认邮件参数
 */
interface SendDeletionConfirmationEmailOptions {
  to: string
  token: string
  expires: Date
}

/**
 * 发送删除账户确认邮件
 */
export async function sendDeletionConfirmationEmail({
  to,
  token,
  expires,
}: SendDeletionConfirmationEmailOptions): Promise<void> {
  const confirmLink = `${process.env.NEXTAUTH_URL}/settings/danger?token=${token}`

  await sendEmail({
    to,
    subject: "确认删除你的账户",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc3545;">删除账户确认</h2>
        <p style="color: #666;">你请求删除账户，请点击下方按钮确认：</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmLink}"
             style="background-color: #dc3545; color: white; padding: 12px 30px;
                    text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            确认删除账户
          </a>
        </div>

        <p style="color: #999; font-size: 14px; margin-top: 15px;">
          或者复制以下链接到浏览器：<br/>
          <a href="${confirmLink}" style="color: #dc3545;">${confirmLink}</a>
        </p>

        <p style="color: #999; font-size: 14px; margin-top: 15px;">
          链接有效期至：${expires.toLocaleString("zh-CN")}
        </p>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 4px; margin-top: 20px;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            ⚠️ <strong>警告：</strong>删除账户后，你的所有文档和数据将被永久删除，此操作不可恢复。
          </p>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          ⚠️ 如果你没有请求删除账户，请忽略此邮件，你的账户不会被删除。
        </p>
      </div>
    `,
  })
}
