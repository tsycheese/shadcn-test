import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@workspace/database"
import { requirePermission, Permission } from "@/lib/permissions"

/**
 * PUT /api/documents/[id]/collaborators/[collaboratorId]
 * 修改协作者权限
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
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
    const { id: documentId, collaboratorId } = await params

    // 检查权限（需要 ADMIN 权限）
    const check = await requirePermission(userId, documentId, Permission.ADMIN)
    if (!check.allowed) {
      return NextResponse.json({ error: check.error }, { status: 403 })
    }

    const body = await req.json()
    const { permission } = body

    if (!permission || !["READ", "WRITE", "ADMIN"].includes(permission)) {
      return NextResponse.json(
        { error: "无效的权限值" },
        { status: 400 }
      )
    }

    // 检查协作者是否存在
    const collaborator = await prisma.documentCollaborator.findFirst({
      where: {
        id: collaboratorId,
        documentId,
      },
    })

    if (!collaborator) {
      return NextResponse.json(
        { error: "协作者不存在" },
        { status: 404 }
      )
    }

    // 更新权限
    await prisma.documentCollaborator.update({
      where: { id: collaboratorId },
      data: { permission },
    })

    return NextResponse.json({
      success: true,
      message: "权限已更新",
    })
  } catch (error: any) {
    console.error("修改权限失败:", error)
    return NextResponse.json(
      { error: error.message || "修改权限失败" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/documents/[id]/collaborators/[collaboratorId]
 * 移除协作者
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
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
    const { id: documentId, collaboratorId } = await params

    // 检查权限（需要 ADMIN 权限）
    const check = await requirePermission(userId, documentId, Permission.ADMIN)
    if (!check.allowed) {
      return NextResponse.json({ error: check.error }, { status: 403 })
    }

    // 检查协作者是否存在
    const collaborator = await prisma.documentCollaborator.findFirst({
      where: {
        id: collaboratorId,
        documentId,
      },
    })

    if (!collaborator) {
      return NextResponse.json(
        { error: "协作者不存在" },
        { status: 404 }
      )
    }

    // 删除协作者
    await prisma.documentCollaborator.delete({
      where: { id: collaboratorId },
    })

    return NextResponse.json({
      success: true,
      message: "协作者已移除",
    })
  } catch (error: any) {
    console.error("移除协作者失败:", error)
    return NextResponse.json(
      { error: error.message || "移除协作者失败" },
      { status: 500 }
    )
  }
}
