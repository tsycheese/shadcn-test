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
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { TriangleAlert } from "lucide-react"

const deleteSchema = z.object({
  password: z.string().min(1, "请输入密码确认"),
})

export function DeleteAccountForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const form = useForm<z.infer<typeof deleteSchema>>({
    resolver: zodResolver(deleteSchema),
    defaultValues: {
      password: "",
    },
  })

  function onSubmit(values: z.infer<typeof deleteSchema>) {
    startTransition(async () => {
      setError("")

      try {
        const res = await fetch("/api/user", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: values.password }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "删除账户失败")
        }

        // 删除成功，登出
        signOut({ callbackUrl: "/" })
      } catch (err: any) {
        setError(err.message || "删除账户失败")
      }
    })
  }

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>输入密码确认</FormLabel>
                  <FormControl>
                    <Input type="password" disabled={isPending} {...field} />
                  </FormControl>
                  <FormDescription>
                    请输入你的登录密码确认删除
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "删除中..." : "永久删除账户"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
