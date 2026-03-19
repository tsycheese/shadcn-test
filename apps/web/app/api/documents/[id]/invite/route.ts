import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requirePermission, Permission } from "@/lib/permissions"
import { createInvitation } from "@/lib/invitations"

/**
 * POST /api/documents/[id]/invite
 * 发送邮箱邀请
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授权" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const documentId = params.id

    // 检查权限（需要 ADMIN 权限）
    const check = await requirePermission(userId, documentId, Permission.ADMIN)
    if (!check.allowed) {
      return NextResponse.json({ error: check.error }, { status: 403 })
    }

    const body = await req.json()
    const { email, permission = "READ", expiresIn = 86400 } = body

    // 验证邮箱格式
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "请输入有效的邮箱地址" },
        { status: 400 }
      )
    }

    // 验证权限值
    if (!["READ", "WRITE", "ADMIN"].includes(permission)) {
      return NextResponse.json(
        { error: "无效的权限值" },
        { status: 400 }
      )
    }

    // 创建邀请
    const invitation = await createInvitation({
      documentId,
      email,
      permission: permission as Permission,
      invitedBy: userId,
      expiresIn,
    })

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        permission: invitation.permission,
        expires: invitation.expires,
      },
    })
  } catch (error: any) {
    console.error("发送邀请失败:", error)
    return NextResponse.json(
      { error: error.message || "发送邀请失败" },
      { status: 500 }
    )
  }
}
