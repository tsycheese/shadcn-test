"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import Link from "next/link"
import { FileText, Plus, Users, User } from "lucide-react"

interface Document {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  ownerId: string
  type: "owned" | "collaborated"
  collaboratorCount: number
  owner: {
    id: string
    name: string | null
    email: string
  }
}

interface DocumentsListProps {
  documents: Document[]
}

export function DocumentsList({ documents }: DocumentsListProps) {
  const ownedDocs = documents.filter((doc) => doc.type === "owned")
  const collaboratedDocs = documents.filter((doc) => doc.type === "collaborated")

  if (documents.length === 0) {
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
      </div>
    )
  }

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

      <div className="space-y-8">
        {/* 我的文档 */}
        {ownedDocs.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">我的文档</h2>
              <Badge variant="secondary">{ownedDocs.length}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ownedDocs.map((doc) => (
                <Card key={doc.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <Badge variant="default" className="text-xs">
                        <User className="mr-1 h-3 w-3" />
                        所有者
                      </Badge>
                    </div>
                    <CardTitle className="line-clamp-1">{doc.title || "未命名文档"}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span>更新于 {new Date(doc.updatedAt).toLocaleDateString("zh-CN")}</span>
                      {doc.collaboratorCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {doc.collaboratorCount} 人协作
                        </span>
                      )}
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
          </section>
        )}

        {/* 协作文档 */}
        {collaboratedDocs.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold">协作文档</h2>
              <Badge variant="secondary">{collaboratedDocs.length}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {collaboratedDocs.map((doc) => (
                <Card key={doc.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs">
                        <Users className="mr-1 h-3 w-3" />
                        协作
                      </Badge>
                    </div>
                    <CardTitle className="line-clamp-1">{doc.title || "未命名文档"}</CardTitle>
                    <CardDescription className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        所有者：{doc.owner.name || doc.owner.email.split("@")[0]}
                      </div>
                      <div>更新于 {new Date(doc.updatedAt).toLocaleDateString("zh-CN")}</div>
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
          </section>
        )}
      </div>
    </div>
  )
}
