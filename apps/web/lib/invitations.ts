import type { DocumentInvitation } from "@prisma/client"
import { Permission } from "@prisma/client"
import { prisma } from "@workspace/database"
import { sendEmail } from "@/lib/mail"
import { nanoid } from "nanoid"

interface CreateInvitationOptions {
  documentId: string
  email: string
  permission: Permission
  invitedBy: string
  expiresIn?: number // 秒
}

interface SendInvitationEmailOptions {
  to: string
  documentTitle: string
  inviterName: string
  inviterEmail: string  // 新增：邀请人邮箱
  permission: Permission
  inviteLink: string
  expires: Date
}

/**
 * 创建文档邀请
 */
export async function createInvitation({
  documentId,
  email,
  permission,
  invitedBy,
  expiresIn = 86400, // 24 小时
}: CreateInvitationOptions): Promise<DocumentInvitation> {
  // 生成唯一 token
  const token = nanoid(32)
  const expires = new Date(Date.now() + expiresIn * 1000)

  // 检查是否已有待处理邀请
  const existing = await prisma.documentInvitation.findFirst({
    where: {
      documentId,
      email,
      status: "PENDING",
    },
  })

  if (existing) {
    throw new Error("该邮箱已有待处理的邀请")
  }

  // 创建邀请
  const invitation = await prisma.documentInvitation.create({
    data: {
      documentId,
      email,
      permission,
      invitedBy,
      token,
      expires,
    },
    include: {
      document: {
        select: {
          id: true,
          title: true,
        },
      },
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  // 发送邀请邮件
  const inviteLink = `${process.env.NEXTAUTH_URL}/invite/${token}`
  await sendInvitationEmail({
    to: email,
    documentTitle: invitation.document.title,
    inviterName: invitation.inviter.name || invitation.inviter.email,
    inviterEmail: invitation.inviter.email,  // 传递邀请人邮箱
    permission,
    inviteLink,
    expires,
  })

  return invitation
}

/**
 * 接受邀请
 */
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<void> {
  const invitation = await prisma.documentInvitation.findUnique({
    where: { token },
    include: { document: true },
  })

  if (!invitation) {
    throw new Error("邀请不存在")
  }

  if (invitation.status !== "PENDING") {
    throw new Error("邀请已失效")
  }

  if (invitation.expires < new Date()) {
    await prisma.documentInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    })
    throw new Error("邀请已过期")
  }

  // 检查被邀请人邮箱是否匹配
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user || user.email !== invitation.email) {
    throw new Error("邮箱不匹配，请使用被邀请的邮箱登录")
  }

  // 检查邮箱是否已验证
  if (!user.emailVerified) {
    throw new Error("请先验证你的邮箱地址")
  }

  // 检查是否已是协作者
  const existingCollab = await prisma.documentCollaborator.findFirst({
    where: {
      documentId: invitation.documentId,
      userId,
    },
  })

  if (existingCollab) {
    throw new Error("你已经是该文档的协作者")
  }

  // 添加协作者
  await prisma.documentCollaborator.create({
    data: {
      documentId: invitation.documentId,
      userId,
      permission: invitation.permission,
    },
  })

  // 更新邀请状态
  await prisma.documentInvitation.update({
    where: { id: invitation.id },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  })
}

/**
 * 获取邀请信息
 */
export async function getInvitation(token: string) {
  return prisma.documentInvitation.findUnique({
    where: { token },
    include: {
      document: {
        select: {
          id: true,
          title: true,
        },
      },
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })
}

/**
 * 发送邀请邮件
 */
async function sendInvitationEmail({
  to,
  documentTitle,
  inviterName,
  inviterEmail,
  permission,
  inviteLink,
  expires,
}: SendInvitationEmailOptions): Promise<void> {
  const permissionText: Record<Permission, string> = {
    READ: "只读权限",
    WRITE: "编辑权限",
    ADMIN: "管理员权限",
  }

  await sendEmail({
    to,
    subject: `${inviterName} 邀请你协作文档：${documentTitle}`,
    replyTo: inviterEmail,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">文档协作邀请</h2>
        <p style="color: #666;"><strong>${inviterName}</strong> 邀请你协作文档：</p>
        <h3 style="color: #0066cc; background: #f5f5f5; padding: 10px; border-radius: 4px;">${documentTitle}</h3>
        <p style="color: #666;">你的权限：<strong>${permissionText[permission]}</strong></p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}"
             style="background-color: #0066cc; color: white; padding: 12px 30px;
                    text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            接受邀请
          </a>
        </div>

        <p style="color: #999; font-size: 14px; text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          如有疑问，可以直接联系邀请人：
          <a href="mailto:${inviterEmail}" style="color: #0066cc;">${inviterEmail}</a>
        </p>

        <p style="color: #999; font-size: 14px; margin-top: 15px;">
          邀请有效期至：${expires.toLocaleString("zh-CN")}
        </p>
        <p style="color: #999; font-size: 12px;">
          如果按钮无法点击，请复制以下链接到浏览器：<br/>
          <a href="${inviteLink}" style="color: #0066cc;">${inviteLink}</a>
        </p>
      </div>
    `,
  })
}
