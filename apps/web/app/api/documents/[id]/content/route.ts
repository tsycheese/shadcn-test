import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@workspace/database"
import { requirePermission, Permission } from "@/lib/permissions"

/**
 * GET /api/documents/[id]/content
 * 获取文档内容（Yjs 二进制快照）
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

    // 检查权限（READ 及以上即可）
    const check = await requirePermission(userId, documentId, Permission.READ)
    if (!check.allowed) {
      return NextResponse.json({ error: check.error }, { status: 403 })
    }

    // 获取文档内容
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        content: true,
        title: true,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: "文档不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      document: {
        id: document.id,
        title: document.title,
        hasContent: !!document.content,
      },
      content: document.content ? Buffer.from(document.content).toString("base64") : null,
    })
  } catch (error) {
    console.error("获取文档内容失败:", error)
    return NextResponse.json(
      { error: "获取文档内容失败" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/documents/[id]/save
 * 保存文档内容（Yjs 二进制快照）
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

    // 检查权限（WRITE 及以上才能保存）
    const check = await requirePermission(userId, documentId, Permission.WRITE)
    if (!check.allowed) {
      return NextResponse.json({ error: check.error }, { status: 403 })
    }

    const body = await req.json()
    const { content } = body

    if (!content) {
      return NextResponse.json(
        { error: "请提供内容数据" },
        { status: 400 }
      )
    }

    // 将 base64 转换回 Buffer
    const contentBuffer = Buffer.from(content, "base64")

    // 保存文档内容
    await prisma.document.update({
      where: { id: documentId },
      data: {
        content: contentBuffer,
      },
    })

    return NextResponse.json({
      success: true,
      savedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("保存文档内容失败:", error)
    return NextResponse.json(
      { error: "保存文档内容失败" },
      { status: 500 }
    )
  }
}
