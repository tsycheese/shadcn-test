import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@workspace/database"

/**
 * POST /api/user/delete-confirm
 * 确认删除账户 - 验证 token 并执行删除
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: "缺少确认 token" }, { status: 400 })
    }

    // 查找 token
    const user = await prisma.user.findFirst({
      where: {
        deletionToken: token,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "确认链接无效或已过期" },
        { status: 400 }
      )
    }

    // 检查 token 是否过期
    if (user.deletionTokenExpires && user.deletionTokenExpires < new Date()) {
      // 清除过期的 token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          deletionToken: null,
          deletionTokenExpires: null,
          deletionRequestedAt: null,
        },
      })
      return NextResponse.json(
        { error: "确认链接已过期，请重新申请" },
        { status: 400 }
      )
    }

    // 执行级联删除
    await prisma.$transaction([
      // 1. 删除用户发出的邀请
      prisma.documentInvitation.deleteMany({
        where: { invitedBy: user.id },
      }),
      // 2. 删除用户的协作者关系
      prisma.documentCollaborator.deleteMany({
        where: { userId: user.id },
      }),
      // 3. 删除用户拥有的文档
      prisma.document.deleteMany({
        where: { ownerId: user.id },
      }),
      // 4. 删除 OAuth 账户
      prisma.account.deleteMany({
        where: { userId: user.id },
      }),
      // 5. 删除会话
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
      // 6. 最后删除用户
      prisma.user.delete({
        where: { id: user.id },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("确认删除账户失败:", error)
    return NextResponse.json(
      { error: "确认删除失败，请稍后重试" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/user/delete-confirm
 * 验证 token 有效性（用于前端检查）
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ valid: false })
    }

    const user = await prisma.user.findFirst({
      where: {
        deletionToken: token,
        deletionTokenExpires: {
          gt: new Date(),
        },
      },
    })

    return NextResponse.json({ valid: !!user })
  } catch (error) {
    console.error("验证删除 token 失败:", error)
    return NextResponse.json({ valid: false })
  }
}
