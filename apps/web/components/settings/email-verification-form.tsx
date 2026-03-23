"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

export function EmailVerificationForm() {
  const { data: session } = useSession()
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const isVerified = !!session?.user?.emailVerified

  async function handleResend() {
    setIsSending(true)
    setMessage(null)

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session?.user?.email }),
      })

      const data = await res.json() as { success?: boolean; error?: string }

      if (!res.ok) {
        throw new Error(data.error || "发送失败")
      }

      setMessage({ type: "success", text: "验证邮件已发送，请检查邮箱" })
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "发送失败" })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>邮箱验证</CardTitle>
        <CardDescription>
          验证你的邮箱地址以确保账户安全
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-4">
          {isVerified ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-green-600 font-medium">已验证</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="text-amber-600 font-medium">未验证</span>
            </>
          )}
        </div>

        {!isVerified && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              验证邮箱后可以：
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside mb-4 space-y-1">
              <li>接受文档协作邀请</li>
              <li>接收系统通知</li>
              <li>重置忘记密码</li>
            </ul>

            <Button
              onClick={handleResend}
              disabled={isSending}
              className="w-full"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  发送中...
                </>
              ) : (
                "重新发送验证邮件"
              )}
            </Button>

            {message && (
              <p className={`text-sm mt-3 ${
                message.type === "success" ? "text-green-600" : "text-destructive"
              }`}>
                {message.text}
              </p>
            )}
          </>
        )}

        {isVerified && (
          <p className="text-sm text-muted-foreground">
            你的邮箱 {session?.user?.email} 已通过验证
          </p>
        )}
      </CardContent>
    </Card>
  )
}
