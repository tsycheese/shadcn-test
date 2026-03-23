import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import Link from "next/link"

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">忘记密码</CardTitle>
        <CardDescription>
          输入你的邮箱，我们将发送重置密码的链接
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />

        <div className="mt-4 text-center text-sm">
          记得密码了？{" "}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            返回登录
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
