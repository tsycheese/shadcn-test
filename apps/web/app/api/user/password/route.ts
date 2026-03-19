import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@workspace/database"
import bcrypt from "bcryptjs"

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await req.json()
    const { currentPassword, newPassword } = body

    // 获取用户
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "用户不存在或未设置密码" },
        { status: 400 }
      )
    }

    // 验证旧密码
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isMatch) {
      return NextResponse.json(
        { error: "当前密码错误" },
        { status: 400 }
      )
    }

    // 哈希新密码
    const newPasswordHash = await bcrypt.hash(newPassword, 12)

    // 更新密码
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newPasswordHash },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("修改密码失败:", error)
    return NextResponse.json(
      { error: "修改密码失败" },
      { status: 500 }
    )
  }
}
