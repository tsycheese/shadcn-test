import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { RegisterForm } from "@/components/auth/register-form"
import Link from "next/link"

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">注册账户</CardTitle>
        <CardDescription>
          填写以下信息创建你的账户
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
        
        <div className="mt-4 text-center text-sm">
          已有账户？{" "}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            立即登录
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
