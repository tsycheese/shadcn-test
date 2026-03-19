import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth()
  
  // 未登录用户重定向到登录页
  if (!session?.user) {
    redirect("/login")
  }
  
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
