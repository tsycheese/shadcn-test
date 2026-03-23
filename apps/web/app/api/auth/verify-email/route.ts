import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@workspace/database"
import { unstable_update } from "@/lib/auth";

/**
 * GET /api/auth/verify-email
 * 验证邮箱地址
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.redirect(new URL("/verify-email?error=invalid-token", req.url))
    }

    // 查找 token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    })

    if (!verificationToken) {
      return NextResponse.redirect(new URL("/verify-email?error=invalid-token", req.url))
    }

    // 检查是否过期
    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } })
      return NextResponse.redirect(new URL("/verify-email?error=expired", req.url))
    }

    // 更新用户邮箱验证状态
    const updatedUser = await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    })

    // 删除 token
    await prisma.verificationToken.delete({ where: { token } })

    // 更新会话，让前端获取最新的用户数据
    await unstable_update({
      user: {
        emailVerified: updatedUser.emailVerified?.toISOString() || null,
      },
    })

    // 跳转成功页面
    return NextResponse.redirect(new URL("/verify-email?success=true", req.url))
  } catch (error) {
    console.error("邮箱验证失败:", error)
    return NextResponse.redirect(new URL("/verify-email?error=unknown", req.url))
  }
}
