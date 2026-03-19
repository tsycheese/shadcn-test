import Link from "next/link"
import { auth } from "@/lib/auth"
import { UserNav } from "@/components/navigation/user-nav"
import { Button } from "@workspace/ui/components/button"
import { FileText, Home } from "lucide-react"

export async function DashboardHeader() {
  const session = await auth()
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span className="font-bold">Collab Editor</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>首页</span>
            </Link>
            <Link
              href="/documents"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>文档</span>
            </Link>
          </nav>
        </div>

        {session?.user && (
          <UserNav user={session.user} />
        )}
      </div>
    </header>
  )
}
