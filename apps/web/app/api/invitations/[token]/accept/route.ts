import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { acceptInvitation } from "@/lib/invitations"
import { prisma } from "@workspace/database"

/**
 * POST /api/invitations/[token]/accept
 * 接受邀请
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授权，请先登录" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // 接受邀请
    await acceptInvitation(params.token, userId)

    // 获取文档 ID
    const invitation = await prisma.documentInvitation.findUnique({
      where: { token: params.token },
      select: { documentId: true },
    })

    return NextResponse.json({
      success: true,
      documentId: invitation?.documentId,
    })
  } catch (error: any) {
    console.error("接受邀请失败:", error)
    return NextResponse.json(
      { error: error.message || "接受邀请失败" },
      { status: 500 }
    )
  }
}
