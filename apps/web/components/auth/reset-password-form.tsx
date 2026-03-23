"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { resetPasswordSchema, type ResetPasswordSchema } from "@/lib/validations/auth"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  const form = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token || "",
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(values: ResetPasswordSchema) {
    if (!token) {
      setError("重置链接无效")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      const data = await res.json() as { success?: boolean; error?: string }

      if (!res.ok) {
        throw new Error(data.error || "重置失败")
      }

      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-400">
          <p className="font-medium">密码重置成功！</p>
          <p className="text-sm mt-2 text-muted-foreground">
            你可以使用新密码登录了
          </p>
        </div>
        <Button
          className="w-full"
          onClick={() => router.push("/login")}
        >
          返回登录
        </Button>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">重置链接无效</p>
          <p className="text-sm mt-2 text-muted-foreground">
            请从邮件中重新点击链接，或重新申请重置
          </p>
        </div>
        <Button
          className="w-full"
          onClick={() => router.push("/forgot-password")}
        >
          重新申请重置
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>新密码</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  disabled={isLoading}
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>确认密码</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  disabled={isLoading}
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "重置中..." : "重置密码"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => router.push("/login")}
          disabled={isLoading}
        >
          返回登录
        </Button>
      </form>
    </Form>
  )
}
