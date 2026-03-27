import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@workspace/database"
import { requirePermission } from "@/lib/permissions"
import { Permission } from "@prisma/client"

/**
 * GET /api/documents/[id]/collaborators
 * 获取文档所有协作者
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id: documentId } = await params

    // 检查权限（READ 及以上即可查看协作者列表）
    const check = await requirePermission(userId, documentId, Permission.READ)
    if (!check.allowed) {
      return NextResponse.json({ error: check.error }, { status: 403 })
    }

    // 获取协作者列表
    const collaborators = await prisma.documentCollaborator.findMany({
      where: { documentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      collaborators: collaborators.map((c) => ({
        id: c.id,
        userId: c.userId,
        name: c.user.name,
        email: c.user.email,
        image: c.user.image,
        permission: c.permission,
        createdAt: c.createdAt,
      })),
    })
  } catch (error) {
    console.error("获取协作者列表失败:", error)
    return NextResponse.json(
      { error: "获取协作者列表失败" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/documents/[id]/collaborators
 * 添加协作者
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id: documentId } = await params

    // 检查权限（需要 ADMIN 权限）
    const check = await requirePermission(userId, documentId, Permission.ADMIN)
    if (!check.allowed) {
      return NextResponse.json({ error: check.error }, { status: 403 })
    }

    const body = await req.json()
    const { userId: collaboratorId, permission = "READ" } = body

    if (!collaboratorId) {
      return NextResponse.json(
        { error: "请提供用户 ID" },
        { status: 400 }
      )
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: collaboratorId },
    })

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      )
    }

    // 检查是否已是协作者
    const existing = await prisma.documentCollaborator.findFirst({
      where: {
        documentId,
        userId: collaboratorId,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "该用户已是协作者" },
        { status: 400 }
      )
    }

    // 添加协作者
    const collaborator = await prisma.documentCollaborator.create({
      data: {
        documentId,
        userId: collaboratorId,
        permission,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      collaborator: {
        id: collaborator.id,
        userId: collaborator.userId,
        name: collaborator.user.name,
        email: collaborator.user.email,
        image: collaborator.user.image,
        permission: collaborator.permission,
      },
    })
  } catch (error: any) {
    console.error("添加协作者失败:", error)
    return NextResponse.json(
      { error: error.message || "添加协作者失败" },
      { status: 500 }
    )
  }
}
