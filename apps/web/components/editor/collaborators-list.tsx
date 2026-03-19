"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { PermissionBadge } from "./permission-badge"
import { InviteDialog } from "./invite-dialog"

interface Collaborator {
  id: string
  userId: string
  name: string | null
  email: string
  permission: "READ" | "WRITE" | "ADMIN"
}

interface CollaboratorsListProps {
  documentId: string
  canManage: boolean
}

export function CollaboratorsList({ documentId, canManage }: CollaboratorsListProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // 加载协作者列表
  useEffect(() => {
    fetch(`/api/documents/${documentId}/collaborators`)
      .then((res) => res.json())
      .then((data) => {
        setCollaborators(data.collaborators || [])
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [documentId, refreshKey])

  // 修改权限
  async function updatePermission(collaboratorId: string, newPermission: "READ" | "WRITE" | "ADMIN") {
    try {
      const res = await fetch(`/api/documents/${documentId}/collaborators/${collaboratorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission: newPermission }),
      })

      if (res.ok) {
        setRefreshKey((k) => k + 1)
      }
    } catch (error) {
      console.error("修改权限失败:", error)
    }
  }

  // 移除协作者
  async function removeCollaborator(collaboratorId: string) {
    if (!confirm("确定要移除该协作者吗？")) return

    try {
      const res = await fetch(`/api/documents/${documentId}/collaborators/${collaboratorId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setRefreshKey((k) => k + 1)
      }
    } catch (error) {
      console.error("移除协作者失败:", error)
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">加载中...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">协作者</h3>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
            邀请
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {collaborators.map((collab) => (
          <div
            key={collab.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {(collab.name || collab.email).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {collab.name || "匿名用户"}
                </p>
                <p className="text-xs text-muted-foreground">{collab.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <PermissionBadge permission={collab.permission} />
              
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      ⋮
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => updatePermission(collab.id, "READ")}>
                      设为只读
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updatePermission(collab.id, "WRITE")}>
                      设为编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updatePermission(collab.id, "ADMIN")}>
                      设为管理员
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => removeCollaborator(collab.id)}
                      className="text-destructive"
                    >
                      移除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))}
      </div>

      <InviteDialog
        documentId={documentId}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
