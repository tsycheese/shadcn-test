import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@workspace/database"
import { Permission, PermissionLevel } from "@/lib/permissions"

/**
 * GET /api/documents/[id]/permissions
 * 检查当前用户对文档的权限
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 获取当前用户
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授权" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const documentId = params.id

    // 2. 获取文档信息
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        owner: {
          select: { id: true, email: true },
        },
        collaborators: {
          where: { userId },
        },
      },
    })

    if (!doc) {
      return NextResponse.json(
        { error: "文档不存在" },
        { status: 404 }
      )
    }

    // 3. 判断权限
    let permission: Permission = Permission.READ
    let isOwner = false

    if (doc.ownerId === userId) {
      // 文档所有者
      permission = Permission.ADMIN
      isOwner = true
    } else if (doc.collaborators.length > 0) {
      // 协作者
      const collab = doc.collaborators[0]
      if (collab) {
        permission = collab.permission as Permission
      }
    } else {
      // 无权限
      return NextResponse.json(
        { error: "无权访问" },
        { status: 403 }
      )
    }

    // 4. 返回权限信息
    return NextResponse.json({
      documentId,
      userId,
      permission,
      isOwner,
      canEdit: (PermissionLevel[permission] || 0) >= (PermissionLevel.WRITE || 0),
      canInvite: (PermissionLevel[permission] || 0) >= (PermissionLevel.ADMIN || 0),
      canDelete: isOwner, // 只有所有者能删除
    })
  } catch (error) {
    console.error("检查权限失败:", error)
    return NextResponse.json(
      { error: "检查权限失败" },
      { status: 500 }
    )
  }
}
