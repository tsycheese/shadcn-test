"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Loader2 } from "lucide-react"

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [invitation, setInvitation] = useState<any>(null)

  useEffect(() => {
    // 获取邀请信息
    fetch(`/api/invitations/${params.token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setInvitation(data.invitation)
        }
        setLoading(false)
      })
      .catch(() => {
        setError("邀请不存在或已失效")
        setLoading(false)
      })
  }, [params.token])

  async function handleAccept() {
    if (!session) {
      // 未登录，跳转到登录页
      router.push(`/login?callbackUrl=/invite/${params.token}`)
      return
    }

    try {
      const res = await fetch(`/api/invitations/${params.token}/accept`, {
        method: "POST",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "接受邀请失败")
      }

      // 跳转到文档页面
      router.push(`/editor/${data.documentId}`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  function handleReject() {
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">邀请无效</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard")}>
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const permissionLabels: Record<string, string> = {
    READ: "只读权限",
    WRITE: "编辑权限",
    ADMIN: "管理员权限",
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">📧</div>
          <CardTitle className="text-2xl">文档协作邀请</CardTitle>
          <CardDescription>
            {invitation?.inviter?.name || "用户"} 邀请你协作文档
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold text-lg">{invitation?.document?.title}</p>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">权限</span>
              <span className="font-medium">{permissionLabels[invitation?.permission]}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">有效期至</span>
              <span className="font-medium">
                {new Date(invitation?.expires).toLocaleString("zh-CN")}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <div className="flex gap-3">
            {!session ? (
              <Button onClick={handleAccept} className="flex-1">
                登录后接受
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleReject} className="flex-1">
                  拒绝
                </Button>
                <Button onClick={handleAccept} className="flex-1">
                  接受邀请
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
