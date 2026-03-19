import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

interface AuthLayoutProps {
  children: React.ReactNode
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const session = await auth()
  
  // 已登录用户重定向到仪表板
  if (session?.user) {
    redirect("/dashboard")
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-[400px]">
        {children}
      </div>
    </div>
  )
}
