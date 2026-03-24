import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Button } from "@workspace/ui/components/button"

export function InviteSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {/* 图标骨架 */}
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          
          {/* 标题骨架 */}
          <Skeleton className="h-7 w-40 mx-auto" />
          
          {/* 描述骨架 */}
          <Skeleton className="h-4 w-56 mx-auto" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 文档信息卡片骨架 */}
          <div className="p-4 bg-muted rounded-lg">
            <Skeleton className="h-6 w-3/4" />
          </div>

          {/* 权限信息骨架 */}
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>

          {/* 有效期骨架 */}
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>

          {/* 按钮骨架 */}
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
