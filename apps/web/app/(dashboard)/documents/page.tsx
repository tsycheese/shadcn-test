import { auth } from "@/lib/auth"
import { prisma } from "@workspace/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import Link from "next/link"
import { FileText, Plus } from "lucide-react"

export default async function DocumentsPage() {
  const session = await auth()
  
  const documents = session?.user?.id
    ? await prisma.document.findMany({
        where: { ownerId: session.user.id },
        orderBy: { updatedAt: "desc" },
      })
    : []
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">我的文档</h1>
          <p className="text-muted-foreground">管理和编辑你的文档</p>
        </div>
        <Button asChild>
          <Link href="/editor/new">
            <Plus className="mr-2 h-4 w-4" />
            新建文档
          </Link>
        </Button>
      </div>
      
      {documents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>暂无文档</CardTitle>
            <CardDescription>创建你的第一个文档开始协作</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/editor/new">
                <Plus className="mr-2 h-4 w-4" />
                创建文档
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="group hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="line-clamp-1">{doc.title || "未命名文档"}</CardTitle>
                <CardDescription>
                  更新于 {new Date(doc.updatedAt).toLocaleDateString("zh-CN")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/editor/${doc.id}`}>打开文档</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
