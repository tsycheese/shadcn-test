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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@workspace/ui/components/dialog"

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
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false)

  // 裁剪相关状态
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false)
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState<'tl'|'tr'|'bl'|'br'|null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

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

  function handleAvatarSelect(e: ChangeEvent<HTMLInputElement>) {
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

    const reader = new FileReader()
    reader.onload = (ev) => {
      setCropSrc(ev.target?.result as string)
      setIsCropDialogOpen(true)
    }
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleImageLoad() {
    const img = imgRef.current
    if (!img) return
    const size = Math.min(img.clientWidth, img.clientHeight)
    setCropArea({
      x: (img.clientWidth - size) / 2,
      y: (img.clientHeight - size) / 2,
      size,
    })
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - cropArea.x, y: e.clientY - cropArea.y })
  }

  function handleResizeMouseDown(handle: 'tl'|'tr'|'bl'|'br', e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setResizeHandle(handle)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!imgRef.current) return
    const img = imgRef.current

    if (resizeHandle) {
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y
      setDragStart({ x: e.clientX, y: e.clientY })
      setCropArea((prev) => {
        let { x, y, size } = prev
        const MIN_SIZE = 40
        if (resizeHandle === 'br') {
          const delta = (Math.abs(dx) > Math.abs(dy) ? dx : dy)
          const newSize = Math.max(MIN_SIZE, Math.min(size + delta, img.clientWidth - x, img.clientHeight - y))
          return { x, y, size: newSize }
        }
        if (resizeHandle === 'bl') {
          const delta = (Math.abs(dx) > Math.abs(dy) ? -dx : dy)
          const newSize = Math.max(MIN_SIZE, Math.min(size + delta, x + size, img.clientHeight - y))
          return { x: Math.min(x + size - newSize, x + size - MIN_SIZE), y, size: newSize }
        }
        if (resizeHandle === 'tr') {
          const delta = (Math.abs(dx) > Math.abs(dy) ? dx : -dy)
          const newSize = Math.max(MIN_SIZE, Math.min(size + delta, img.clientWidth - x, y + size))
          return { x, y: Math.min(y + size - newSize, y + size - MIN_SIZE), size: newSize }
        }
        if (resizeHandle === 'tl') {
          const delta = (Math.abs(dx) > Math.abs(dy) ? -dx : -dy)
          const newSize = Math.max(MIN_SIZE, Math.min(size + delta, x + size, y + size))
          return {
            x: Math.min(x + size - newSize, x + size - MIN_SIZE),
            y: Math.min(y + size - newSize, y + size - MIN_SIZE),
            size: newSize,
          }
        }
        return prev
      })
      return
    }

    if (!isDragging) return
    const newX = Math.max(0, Math.min(e.clientX - dragStart.x, img.clientWidth - cropArea.size))
    const newY = Math.max(0, Math.min(e.clientY - dragStart.y, img.clientHeight - cropArea.size))
    setCropArea((prev) => ({ ...prev, x: newX, y: newY }))
  }

  function handleMouseUp() {
    setIsDragging(false)
    setResizeHandle(null)
  }

  async function handleCropConfirm() {
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas || !cropSrc) return

    const scaleX = img.naturalWidth / img.clientWidth
    const scaleY = img.naturalHeight / img.clientHeight

    canvas.width = 200
    canvas.height = 200
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(
      img,
      cropArea.x * scaleX,
      cropArea.y * scaleY,
      cropArea.size * scaleX,
      cropArea.size * scaleY,
      0,
      0,
      200,
      200,
    )

    canvas.toBlob(async (blob) => {
      if (!blob) return
      setIsAvatarPending(true)
      setIsCropDialogOpen(false)
      try {
        const formData = new FormData()
        formData.append("avatar", blob, "avatar.png")
        const res = await fetch("/api/user/avatar", { method: "POST", body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "头像上传失败")
        setAvatarPreview(data.user?.image || null)
        await update()
        setSuccess("头像已更新")
      } catch (err: unknown) {
        setAvatarError(err instanceof Error ? err.message : "头像上传失败")
      } finally {
        setIsAvatarPending(false)
        setCropSrc(null)
      }
    }, "image/png")
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
    <>
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
                <Avatar
                  className="h-14 w-14 cursor-pointer transition-opacity hover:opacity-80"
                  onClick={() => (avatarPreview || session?.user?.image) && setIsAvatarDialogOpen(true)}
                >
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

    {/* 裁剪 Dialog */}
    <Dialog open={isCropDialogOpen} onOpenChange={(open) => { if (!open) setCropSrc(null); setIsCropDialogOpen(open) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>裁剪头像</DialogTitle>
        {cropSrc && (
          <div
            ref={containerRef}
            className="relative select-none overflow-hidden rounded-md"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={cropSrc}
              alt="裁剪预览"
              className="block max-h-[60vh] max-w-full"
              onLoad={handleImageLoad}
              draggable={false}
            />
            {/* 遮罩：上 */}
            <div
              className="pointer-events-none absolute left-0 top-0 w-full bg-black/50"
              style={{ height: cropArea.y }}
            />
            {/* 遮罩：下 */}
            <div
              className="pointer-events-none absolute left-0 w-full bg-black/50"
              style={{ top: cropArea.y + cropArea.size, bottom: 0 }}
            />
            {/* 遮罩：左 */}
            <div
              className="pointer-events-none absolute left-0 bg-black/50"
              style={{ top: cropArea.y, width: cropArea.x, height: cropArea.size }}
            />
            {/* 遮罩：右 */}
            <div
              className="pointer-events-none absolute bg-black/50"
              style={{ top: cropArea.y, left: cropArea.x + cropArea.size, right: 0, height: cropArea.size }}
            />
            {/* 裁剪框 */}
            <div
              className="absolute cursor-move border-2 border-white"
              style={{ left: cropArea.x, top: cropArea.y, width: cropArea.size, height: cropArea.size }}
              onMouseDown={handleMouseDown}
            >
              {/* 四角控制点 */}
              <div className="absolute -left-1.5 -top-1.5 h-3 w-3 cursor-nwse-resize bg-white" onMouseDown={(e) => handleResizeMouseDown('tl', e)} />
              <div className="absolute -right-1.5 -top-1.5 h-3 w-3 cursor-nesw-resize bg-white" onMouseDown={(e) => handleResizeMouseDown('tr', e)} />
              <div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 cursor-nesw-resize bg-white" onMouseDown={(e) => handleResizeMouseDown('bl', e)} />
              <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize bg-white" onMouseDown={(e) => handleResizeMouseDown('br', e)} />
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
        <DialogFooter>
          <Button variant="outline" onClick={() => { setIsCropDialogOpen(false); setCropSrc(null) }}>
            取消
          </Button>
          <Button onClick={handleCropConfirm} disabled={isAvatarPending}>
            {isAvatarPending ? "上传中..." : "确认裁剪"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* 头像大图预览 Dialog */}
    <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
      <DialogContent className="flex flex-col items-center gap-4 sm:max-w-lg">
        <DialogTitle>头像预览</DialogTitle>
        <img
          src={avatarPreview || session?.user?.image || undefined}
          alt={session?.user?.name || session?.user?.email || "avatar"}
          className="max-h-[70vh] max-w-full rounded-lg object-contain"
        />
      </DialogContent>
    </Dialog>
    </>
  )
}
