import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@workspace/database"
import bcrypt from "bcryptjs"
import { resetPasswordSchema, type ResetPasswordSchema } from "@/lib/validations/auth"

/**
 * POST /api/auth/reset-password
 * 重置密码
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = resetPasswordSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors?.[0]?.message ?? "验证失败" },
        { status: 400 }
      )
    }

    const data = validated.data as ResetPasswordSchema
    const { token, password } = data

    // 查找 token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: "重置链接无效或已过期" },
        { status: 400 }
      )
    }

    // 检查 token 是否过期
    if (resetToken.expires < new Date()) {
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      })
      return NextResponse.json(
        { error: "重置链接已过期，请重新申请" },
        { status: 400 }
      )
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 400 }
      )
    }

    // 哈希新密码
    const passwordHash = await bcrypt.hash(password, 12)

    // 更新密码
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    // 删除 token（单次使用）
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("重置密码失败:", error)
    return NextResponse.json(
      { error: "重置失败，请稍后重试" },
      { status: 500 }
    )
  }
}
