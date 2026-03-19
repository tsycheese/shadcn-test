import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html,
    })
    return { success: true }
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
  const token = Buffer.from(`${email}:${Date.now()}:${Math.random()}`).toString("base64")
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 小时
  
  return { token, expires }
}
