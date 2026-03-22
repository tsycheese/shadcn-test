import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@workspace/database"

/**
 * GET /api/documents
 * 获取当前用户的文档列表（包括我的文档和协作文档）
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

    const userId = session.user.id

    // 查询我的文档（创建的）
    const myDocs = await prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        collaborators: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // 查询协作文档（他人创建，我参与协作的）
    const collaboratedDocs = await prisma.document.findMany({
      where: {
        collaborators: {
          some: {
            userId: userId,
          },
        },
        ownerId: {
          not: userId, // 排除自己创建的文档
        },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        collaborators: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // 合并并标记文档类型
    const documents = [
      ...myDocs.map((doc) => ({
        ...doc,
        type: "owned" as const,
        collaboratorCount: doc.collaborators.length,
      })),
      ...collaboratedDocs.map((doc) => ({
        ...doc,
        type: "collaborated" as const,
        collaboratorCount: doc.collaborators.length,
      })),
    ]

    // 按更新时间排序
    documents.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

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
