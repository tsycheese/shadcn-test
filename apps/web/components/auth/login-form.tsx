"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginSchema } from "@/lib/validations/auth"
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
import { Github } from "lucide-react"
import { Separator } from "@workspace/ui/components/separator"

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [githubLoading, setGithubLoading] = useState(false)

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: LoginSchema) {
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      })

      if (result?.error) {
        setError("邮箱或密码错误")
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("登录失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGitHubSignIn() {
    setGithubLoading(true)
    setError("")

    try {
      await signIn("github", {
        redirectTo: "/dashboard",
      })
    } catch {
      setError("GitHub 登录失败，请稍后重试")
    } finally {
      setGithubLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* GitHub 登录按钮 */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isLoading || githubLoading}
          onClick={handleGitHubSignIn}
        >
          <Github className="mr-2 h-4 w-4" />
          {githubLoading ? "登录中..." : "使用 GitHub 登录"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              或者使用邮箱
            </span>
          </div>
        </div>

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
                  disabled={isLoading || githubLoading}
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  disabled={isLoading || githubLoading}
                  autoComplete="current-password"
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
          disabled={isLoading || githubLoading}
        >
          {isLoading ? "登录中..." : "登录"}
        </Button>
      </form>
    </Form>
  )
}
