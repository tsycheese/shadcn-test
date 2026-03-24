import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@workspace/database"
import { sendDeletionConfirmationEmail } from "@/lib/mail"

/**
 * POST /api/user/delete-request
 * 请求删除账户 - 发送确认邮件
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const userId = session.user.id

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        deletionRequestedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 400 })
    }

    // 生成删除确认 token
    const token = Buffer.from(`${userId}:${Date.now()}:${Math.random()}`).toString("base64")
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 小时过期

    // 保存 token 到数据库
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletionToken: token,
        deletionTokenExpires: expires,
        deletionRequestedAt: new Date(),
      },
    })

    // 发送确认邮件
    await sendDeletionConfirmationEmail({
      to: user.email,
      token,
      expires,
    })

    return NextResponse.json({
      success: true,
      message: "确认邮件已发送，请检查邮箱",
    })
  } catch (error) {
    console.error("请求删除账户失败:", error)
    return NextResponse.json(
      { error: "请求失败，请稍后重试" },
      { status: 500 }
    )
  }
}
