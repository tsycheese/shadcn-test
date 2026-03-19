import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@workspace/database"

/**
 * GET /api/documents
 * 获取当前用户的文档列表
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授权" },
        { status: 401 }
      )
    }

    const documents = await prisma.document.findMany({
      where: { ownerId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("获取文档列表失败:", error)
    return NextResponse.json(
      { error: "获取文档列表失败" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/documents
 * 创建新文档
 */
export async function POST(req: NextRequest) {
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

    // 创建文档
    const document = await prisma.document.create({
      data: {
        title: title || "未命名文档",
        ownerId: session.user.id,
      },
    })

    return NextResponse.json({
      id: document.id,
      title: document.title,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    }, { status: 201 })
  } catch (error) {
    console.error("创建文档失败:", error)
    return NextResponse.json(
      { error: "创建文档失败" },
      { status: 500 }
    )
  }
}
