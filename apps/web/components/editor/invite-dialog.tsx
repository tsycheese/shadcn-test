"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button } from "@workspace/ui/components/button"

interface InviteDialogProps {
  documentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function InviteDialog({
  documentId,
  open,
  onOpenChange,
  onSuccess,
}: InviteDialogProps) {
  const [email, setEmail] = useState("")
  const [permission, setPermission] = useState<"READ" | "WRITE" | "ADMIN">("READ")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleInvite() {
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/documents/${documentId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, permission }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "发送邀请失败")
      }

      onSuccess()
      onOpenChange(false)
      setEmail("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>邀请协作者</DialogTitle>
          <DialogDescription>
            输入邮箱地址邀请他人协作文档
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>权限</Label>
            <Select value={permission} onValueChange={(v: any) => setPermission(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="READ">只读 - 只能查看</SelectItem>
                <SelectItem value="WRITE">编辑 - 可以编辑</SelectItem>
                <SelectItem value="ADMIN">管理员 - 可邀请他人</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleInvite} disabled={loading || !email}>
            {loading ? "发送中..." : "发送邀请"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
