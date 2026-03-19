import { NextRequest, NextResponse } from "next/server"
import { getInvitation } from "@/lib/invitations"

/**
 * GET /api/invitations/[token]
 * 获取邀请信息
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invitation = await getInvitation(params.token)

    if (!invitation) {
      return NextResponse.json(
        { error: "邀请不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        permission: invitation.permission,
        status: invitation.status,
        expires: invitation.expires,
        document: {
          id: invitation.document.id,
          title: invitation.document.title,
        },
        inviter: {
          name: invitation.inviter.name,
          email: invitation.inviter.email,
        },
      },
    })
  } catch (error: any) {
    console.error("获取邀请失败:", error)
    return NextResponse.json(
      { error: error.message || "获取邀请失败" },
      { status: 500 }
    )
  }
}
