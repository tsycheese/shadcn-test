"use client"

import { useState, useTransition } from "react"
import { useSession } from "next-auth/react"
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

const profileSchema = z.object({
  name: z.string().min(2, "姓名至少 2 个字符").optional(),
  email: z.string().email("请输入有效的邮箱地址"),
})

export function ProfileForm() {
  const { data: session, update } = useSession()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session?.user?.name || "",
      email: session?.user?.email || "",
    },
  })

  function onSubmit(values: z.infer<typeof profileSchema>) {
    startTransition(async () => {
      setError("")
      setSuccess("")

      try {
        const res = await fetch("/api/user", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "更新失败")
        }

        // 更新 session
        await update()
        setSuccess("个人资料已更新")
      } catch (err: any) {
        setError(err.message || "更新失败")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>个人资料</CardTitle>
        <CardDescription>
          更新你的个人信息和头像
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>姓名</FormLabel>
                  <FormControl>
                    <Input placeholder="你的姓名" disabled={isPending} {...field} />
                  </FormControl>
                  <FormDescription>
                    这是你的显示名称
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>邮箱</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="your@email.com" 
                      disabled={true} // 邮箱暂时不允许修改
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    邮箱地址暂时不允许修改
                  </FormDescription>
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
              {isPending ? "保存中..." : "保存更改"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
