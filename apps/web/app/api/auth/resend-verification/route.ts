import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@workspace/database"
import { generateVerificationToken, sendVerificationEmail } from "@/lib/mail"

/**
 * POST /api/auth/resend-verification
 * 重发邮箱验证邮件
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "邮箱不能为空" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // 不泄露邮箱是否存在
      return NextResponse.json({ success: true })
    }

    // 已验证则无需重发
    if (user.emailVerified) {
      return NextResponse.json({ error: "邮箱已验证" }, { status: 400 })
    }

    // 删除旧 token
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    })

    // 生成新 token
    const { token, expires } = generateVerificationToken(email)

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    })

    // 发送邮件
    await sendVerificationEmail({
      to: email,
      token,
      expires,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("重发验证邮件失败:", error)
    return NextResponse.json(
      { error: "发送失败，请稍后重试" },
      { status: 500 }
    )
  }
}
