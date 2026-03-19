"use client"

import { useState, useTransition } from "react"
import { signOut } from "next-auth/react"
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

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "密码至少 6 位"),
  newPassword: z.string()
    .min(6, "密码至少 6 位")
    .max(100, "密码最多 100 位")
    .regex(/[A-Z]/, "必须包含大写字母")
    .regex(/[a-z]/, "必须包含小写字母")
    .regex(/[0-9]/, "必须包含数字"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
})

export function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  function onSubmit(values: z.infer<typeof passwordSchema>) {
    startTransition(async () => {
      setError("")
      setSuccess("")

      try {
        const res = await fetch("/api/user/password", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "修改密码失败")
        }

        setSuccess("密码已修改，请重新登录")
        form.reset()
        
        // 3 秒后自动登出
        setTimeout(() => {
          signOut({ callbackUrl: "/login" })
        }, 3000)
      } catch (err: any) {
        setError(err.message || "修改密码失败")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>修改密码</CardTitle>
        <CardDescription>
          为了账户安全，请定期更换密码
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>当前密码</FormLabel>
                  <FormControl>
                    <Input type="password" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>新密码</FormLabel>
                  <FormControl>
                    <Input type="password" disabled={isPending} {...field} />
                  </FormControl>
                  <FormDescription>
                    密码必须包含大小写字母和数字，至少 6 位
                  </FormDescription>
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
                    <Input type="password" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            
            {success && (
              <p className="text-sm text-green-600">{success}</p>
            )}

            <Button type="submit" disabled={isPending}>
              {isPending ? "修改中..." : "修改密码"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
