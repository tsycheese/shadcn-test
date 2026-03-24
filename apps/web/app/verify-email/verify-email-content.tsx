"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

export function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const hasCheckedRef = useRef(false)
  const [verifying, setVerifying] = useState(true)

  // 1. 初始验证逻辑
  useEffect(() => {
    if (hasCheckedRef.current) return
    hasCheckedRef.current = true

    const token = searchParams.get("token")
    if (token) {
      // 自动跳转到验证 API
      window.location.href = `/api/auth/verify-email?token=${token}`
    } else {
      setVerifying(false)
    }
  }, [searchParams])

  // 2. 成功验证后的自动跳转逻辑
  useEffect(() => {
    const success = searchParams.get("success")
    if (success) {
      const timer = setTimeout(() => {
        router.push("/dashboard")
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [router, searchParams])

  const error = searchParams.get("error")
  const success = searchParams.get("success")

  // 验证中状态
  if (verifying) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <CardTitle>验证中...</CardTitle>
            <CardDescription>正在验证你的邮箱地址</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // 验证失败状态
  if (error) {
    const errorMessages: Record<string, string> = {
      "invalid-token": "验证链接无效",
      "expired": "验证链接已过期，请重新申请",
      "unknown": "验证失败，请稍后重试",
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">验证失败</CardTitle>
            <CardDescription>{errorMessages[error] || "验证失败"}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => router.push("/login")}>
              返回登录
            </Button>
            <Button className="flex-1" onClick={() => router.push("/dashboard")}>
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 验证成功状态
  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-green-600">验证成功！</CardTitle>
            <CardDescription>你的邮箱已验证，可以开始使用了</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button className="w-full mb-4" onClick={() => router.push("/dashboard")}>
              进入仪表盘
            </Button>
            <p className="text-sm text-muted-foreground">
              将在 3 秒后自动跳转...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 默认状态
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>邮箱验证</CardTitle>
          <CardDescription>
            请从你的邮箱中点击验证链接来完成验证
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => router.push("/dashboard")}>
            返回首页
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
