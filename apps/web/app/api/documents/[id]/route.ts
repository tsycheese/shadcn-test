import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@workspace/database"

/**
 * GET /api/documents/:id
 * 获取单个文档详情
 */
export async function GET(
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

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: "文档不存在" },
        { status: 404 }
      )
    }

    // 检查权限：只有所有者可以访问
    if (document.owner.id !== session.user.id) {
      return NextResponse.json(
        { error: "无权访问" },
        { status: 403 }
      )
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error("获取文档失败:", error)
    return NextResponse.json(
      { error: "获取文档失败" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/documents/:id
 * 更新文档
 */
export async function PUT(
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

    const body = await req.json()
    const { title } = body

    // 检查文档是否存在且属于当前用户
    const existingDoc = await prisma.document.findUnique({
      where: { id: params.id },
    })

    if (!existingDoc) {
      return NextResponse.json(
        { error: "文档不存在" },
        { status: 404 }
      )
    }

    if (existingDoc.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "无权修改" },
        { status: 403 }
      )
    }

    // 更新文档
    const document = await prisma.document.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
      },
    })

    return NextResponse.json({ document })
  } catch (error) {
    console.error("更新文档失败:", error)
    return NextResponse.json(
      { error: "更新文档失败" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/documents/:id
 * 删除文档
 */
export async function DELETE(
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

    // 检查文档是否存在且属于当前用户
    const existingDoc = await prisma.document.findUnique({
      where: { id: params.id },
    })

    if (!existingDoc) {
      return NextResponse.json(
        { error: "文档不存在" },
        { status: 404 }
      )
    }

    if (existingDoc.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "无权删除" },
        { status: 403 }
      )
    }

    // 删除文档
    await prisma.document.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("删除文档失败:", error)
    return NextResponse.json(
      { error: "删除文档失败" },
      { status: 500 }
    )
  }
}
