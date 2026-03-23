import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@workspace/database"
import { generateResetToken, sendPasswordResetEmail } from "@/lib/mail"
import { forgotPasswordSchema, type ForgotPasswordSchema } from "@/lib/validations/auth"

/**
 * POST /api/auth/forgot-password
 * 发送密码重置邮件
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = forgotPasswordSchema.safeParse(body)

    if (!validated.success) {
      // 不泄露具体错误，统一返回成功
      return NextResponse.json({ success: true })
    }

    const data = validated.data as ForgotPasswordSchema
    const { email } = data

    // 查询用户是否存在
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // 无论用户是否存在，都返回成功（防止枚举攻击）
    if (!user) {
      return NextResponse.json({ success: true })
    }

    // 生成 token
    const { token, expires } = generateResetToken(email)

    // 删除该用户之前的未过期 token
    await prisma.passwordResetToken.deleteMany({
      where: {
        email: email.toLowerCase(),
        expires: {
          gt: new Date(),
        },
      },
    })

    // 保存新 token
    await prisma.passwordResetToken.create({
      data: {
        email: email.toLowerCase(),
        token,
        expires,
      },
    })

    // 发送重置邮件
    await sendPasswordResetEmail({
      to: email.toLowerCase(),
      token,
      expires,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("忘记密码请求失败:", error)
    return NextResponse.json(
      { error: "请求失败，请稍后重试" },
      { status: 500 }
    )
  }
}
