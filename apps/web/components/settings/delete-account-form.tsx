"use client"

import { useState, useTransition, useEffect } from "react"
import { signOut, useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { TriangleAlert, Mail } from "lucide-react"

const deleteSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
})

type Step = "input" | "email-sent" | "confirming" | "success"

export function DeleteAccountForm() {
  const { data: session } = useSession()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [step, setStep] = useState<Step>("input")

  const form = useForm<z.infer<typeof deleteSchema>>({
    resolver: zodResolver(deleteSchema),
    defaultValues: {
      email: "",
    },
  })

  // 检查 URL 中是否有 token（从邮件链接跳转）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    
    if (token) {
      // 自动确认删除
      confirmDeletion(token)
    }
  }, [])

  function onRequestDelete(values: z.infer<typeof deleteSchema>) {
    startTransition(async () => {
      setError("")

      // 验证邮箱是否匹配
      if (values.email.toLowerCase() !== session?.user?.email?.toLowerCase()) {
        setError("输入的邮箱与账户邮箱不匹配")
        return
      }

      try {
        const res = await fetch("/api/user/delete-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "请求失败")
        }

        setStep("email-sent")
      } catch (err: any) {
        setError(err.message || "请求失败，请稍后重试")
      }
    })
  }

  function confirmDeletion(token: string) {
    startTransition(async () => {
      setError("")
      setStep("confirming")

      try {
        const res = await fetch("/api/user/delete-confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "确认失败")
        }

        setStep("success")
        
        // 2 秒后登出
        setTimeout(() => {
          signOut({ callbackUrl: "/" })
        }, 2000)
      } catch (err: any) {
        setError(err.message || "确认删除失败")
        setStep("input")
      }
    })
  }

  // 成功删除
  if (step === "success") {
    return (
      <Card className="border-green-500">
        <CardHeader>
          <CardTitle className="text-green-600">账户已删除</CardTitle>
          <CardDescription>
            你的账户和所有数据已被永久删除
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-50 border-green-200">
            <Mail className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              正在退出登录，请稍候...
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // 邮件已发送
  if (step === "email-sent") {
    return (
      <Card className="border-blue-500">
        <CardHeader>
          <CardTitle className="text-blue-600">检查你的邮箱</CardTitle>
          <CardDescription>
            我们已发送确认邮件到 {session?.user?.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <Mail className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              请点击邮件中的确认链接完成删除操作。邮件 24 小时后过期。
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground">
            <p>没收到邮件？</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>检查垃圾邮件箱</li>
              <li>确认邮箱地址是否正确</li>
              <li>稍后重试</li>
            </ul>
          </div>

          <Button
            variant="outline"
            onClick={() => setStep("input")}
            disabled={isPending}
          >
            返回重新输入
          </Button>
        </CardContent>
      </Card>
    )
  }

  // 确认中
  if (step === "confirming") {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">正在删除账户...</CardTitle>
          <CardDescription>
            请稍候，我们正在处理你的请求
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <TriangleAlert className="h-8 w-8 text-destructive animate-pulse" />
            <p className="text-muted-foreground">此操作不可逆，所有数据将被永久删除</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 输入邮箱
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">删除账户</CardTitle>
        <CardDescription>
          永久删除你的账户和所有数据
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>
            此操作不可逆！删除后所有文档和数据将永久丢失。
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onRequestDelete)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>输入邮箱确认</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={session?.user?.email || ""}
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    我们将发送确认邮件到此邮箱
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "发送中..." : "发送确认邮件"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
