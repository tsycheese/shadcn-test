import { auth } from "@/lib/auth"
import { prisma } from "@workspace/database"
import { DocumentsList } from "./documents-list"
import { Suspense } from "react"
import { DocumentsSkeleton } from "./documents-skeleton"

export default async function DocumentsPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return null
  }

  const userId = session.user.id

  // 并行查询两个数据集
  const [myDocs, collaboratedDocs] = await Promise.all([
    prisma.document.findMany({
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
    }),
    prisma.document.findMany({
      where: {
        collaborators: {
          some: {
            userId: userId,
          },
        },
        ownerId: {
          not: userId,
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
    }),
  ])

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

  return (
    <Suspense fallback={<DocumentsSkeleton />}>
      <DocumentsList documents={documents} />
    </Suspense>
  )
}
