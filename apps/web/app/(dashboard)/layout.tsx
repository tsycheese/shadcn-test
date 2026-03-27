import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { DashboardHeader } from "@/components/navigation/dashboard-header"

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
    <div className="flex h-dvh flex-col bg-background">
      <DashboardHeader />
      <main className="min-h-0 flex-1 overflow-auto">{children}</main>
    </div>
  )
}
