import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { LoginForm } from "@/components/auth/login-form"
import Link from "next/link"

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">登录</CardTitle>
        <CardDescription>
          输入你的邮箱和密码登录账户
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
        
        <div className="mt-4 text-center text-sm">
          还没有账户？{" "}
          <Link href="/register" className="text-primary underline-offset-4 hover:underline">
            立即注册
          </Link>
        </div>
        
        <div className="mt-2 text-center text-sm">
          <Link href="/forgot-password" className="text-muted-foreground underline-offset-4 hover:underline">
            忘记密码？
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
