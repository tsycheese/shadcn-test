import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { SettingsNav } from "@/components/settings/settings-nav"

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default async function SettingsLayout({ children }: SettingsLayoutProps) {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">设置</h1>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* 侧边导航 */}
        <aside className="md:w-64">
          <SettingsNav />
        </aside>
        
        {/* 主要内容 */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
