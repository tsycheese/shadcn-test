import { auth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import Link from "next/link"
import { DashboardBanners } from "@/components/dashboard-banners"

interface DashboardPageProps {
  searchParams: { verified?: string }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth()
  const { verified } = await searchParams
  const showVerifiedReminder = verified === "reminder"
  const isEmailVerified = !!session?.user?.emailVerified

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 横幅区域 */}
      <DashboardBanners
        showVerifiedReminder={showVerifiedReminder}
        isEmailVerified={isEmailVerified}
      />

      {/* 页面标题 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">欢迎回来，{session?.user?.name || "用户"}</h1>
          <p className="text-muted-foreground">管理你的文档和协作项目</p>
        </div>
        <Button asChild>
          <Link href="/editor/new">创建新文档</Link>
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>我的文档</CardTitle>
            <CardDescription>查看和编辑你的文档</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/documents">查看文档</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>协作邀请</CardTitle>
            <CardDescription>查看他人共享的文档</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" disabled>
              敬请期待
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>账户设置</CardTitle>
            <CardDescription>管理你的账户信息</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/settings/profile">进入设置</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
