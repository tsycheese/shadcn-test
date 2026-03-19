export { Permission } from "@prisma/client"
export type { Permission as PermissionType } from "@prisma/client"
import { Permission } from "@prisma/client"
import { prisma } from "@workspace/database"

/**
 * 权限级别映射
 */
export const PermissionLevel: Record<Permission, number> = {
  [Permission.READ]: 1,
  [Permission.WRITE]: 2,
  [Permission.ADMIN]: 3,
}

/**
 * 检查用户是否有文档的指定权限
 */
interface CheckPermissionOptions {
  userId: string
  documentId: string
  requiredPermission: Permission
}

export async function checkPermission({
  userId,
  documentId,
  requiredPermission,
}: CheckPermissionOptions): Promise<boolean> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      owner: true,
      collaborators: true,
    },
  })

  if (!doc) return false

  // 文档所有者拥有所有权限
  if (doc.ownerId === userId) {
    return true
  }

  // 检查协作者权限
  const collaboration = doc.collaborators.find(
    (c) => c.userId === userId
  )

  if (!collaboration) return false

  // 权限级别比较
  return (PermissionLevel[collaboration.permission as Permission] || 0) >= 
         (PermissionLevel[requiredPermission as Permission] || 0)
}

/**
 * 获取用户对文档的权限
 */
export async function getUserPermission(
  userId: string,
  documentId: string
): Promise<Permission | null> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      owner: true,
      collaborators: true,
    },
  })

  if (!doc) return null

  // 文档所有者
  if (doc.ownerId === userId) {
    return Permission.ADMIN
  }

  // 协作者
  const collaboration = doc.collaborators.find(
    (c) => c.userId === userId
  )

  return (collaboration?.permission ?? null) as Permission | null
}

/**
 * 权限检查中间件
 */
export async function requirePermission(
  userId: string,
  documentId: string,
  requiredPermission: Permission
): Promise<{ allowed: boolean; error?: string }> {
  const hasPermission = await checkPermission({
    userId,
    documentId,
    requiredPermission,
  })

  if (!hasPermission) {
    return {
      allowed: false,
      error: "无权访问",
    }
  }

  return { allowed: true }
}
