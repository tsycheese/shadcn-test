import { Button } from "@workspace/ui/components/button"
import Link from "next/link"

export default function Page() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-center">
        <div>
          <h1 className="text-2xl font-bold">Collab Editor</h1>
          <p className="text-muted-foreground mt-2">
            实时协同编辑系统
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button asChild>
            <Link href="/login">登录</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/register">注册</Link>
          </Button>
        </div>
        <div className="text-muted-foreground font-mono text-xs">
          <p>按 <kbd className="px-1 py-0.5 bg-muted rounded">d</kbd> 切换深色模式</p>
        </div>
      </div>
    </div>
  )
}
