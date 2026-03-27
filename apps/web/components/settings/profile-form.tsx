"use client"

import { type ChangeEvent, useEffect, useRef, useState, useTransition } from "react"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024

const profileSchema = z.object({
  name: z.string().min(2, "姓名至少 2 个字符").optional(),
  email: z.string().email("请输入有效的邮箱"),
})

export function ProfileForm() {
  const { data: session, update } = useSession()
  const [isPending, startTransition] = useTransition()
  const [isAvatarPending, setIsAvatarPending] = useState(false)
  const [avatarError, setAvatarError] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session?.user?.name || "",
      email: session?.user?.email || "",
    },
  })

  useEffect(() => {
    form.reset({
      name: session?.user?.name || "",
      email: session?.user?.email || "",
    })
  }, [session?.user?.name, session?.user?.email, form])

  async function handleAvatarSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarError("")
    setSuccess("")

    if (!file.type.startsWith("image/")) {
      setAvatarError("请选择图片文件")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setAvatarError("头像大小不能超过 2MB")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setIsAvatarPending(true)

    try {
      const formData = new FormData()
      formData.append("avatar", file)

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "头像上传失败")
      }

      setAvatarPreview(data.user?.image || null)
      await update()
      setSuccess("头像已更新")
    } catch (err: unknown) {
      setAvatarError(err instanceof Error ? err.message : "头像上传失败")
    } finally {
      setIsAvatarPending(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  async function handleAvatarRemove() {
    setAvatarError("")
    setSuccess("")
    setIsAvatarPending(true)

    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "删除头像失败")
      }

      setAvatarPreview(null)
      await update()
      setSuccess("头像已删除")
    } catch (err: unknown) {
      setAvatarError(err instanceof Error ? err.message : "删除头像失败")
    } finally {
      setIsAvatarPending(false)
    }
  }

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
          更新你的个人信息和头像。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-3">
              <FormLabel>头像</FormLabel>
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage
                    src={avatarPreview || session?.user?.image || undefined}
                    alt={session?.user?.name || session?.user?.email || "avatar"}
                  />
                  <AvatarFallback>
                    {(session?.user?.name || session?.user?.email || "U")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    disabled={isAvatarPending}
                    onChange={handleAvatarSelect}
                    className="max-w-[260px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isAvatarPending || !(avatarPreview || session?.user?.image)}
                    onClick={handleAvatarRemove}
                  >
                    删除头像
                  </Button>
                </div>
              </div>
              <FormDescription>
                支持 JPG/PNG/WEBP/GIF，最大 2MB。
              </FormDescription>
              {avatarError && <p className="text-sm text-destructive">{avatarError}</p>}
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>姓名</FormLabel>
                  <FormControl>
                    <Input placeholder="你的显示名称" disabled={isPending} {...field} />
                  </FormControl>
                  <FormDescription>
                    这是你的显示名称。
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
                    <Input type="email" disabled {...field} />
                  </FormControl>
                  <FormDescription>邮箱暂不支持在此修改。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : "保存更改"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
