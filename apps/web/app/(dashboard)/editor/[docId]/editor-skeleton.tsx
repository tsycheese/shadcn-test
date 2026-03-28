import { Skeleton } from "@workspace/ui/components/skeleton"
import { EDITOR_VIEWPORT_CLASS } from "@/lib/editor/layout"

export function EditorSkeleton() {
  return (
    <div className={`flex min-h-0 flex-col ${EDITOR_VIEWPORT_CLASS}`}>
      <div className="border-b bg-background p-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-muted/20">
        <div className="flex h-full w-full">
          <aside
            data-testid="editor-skeleton-toc"
            className="hidden h-full w-[260px] shrink-0 border-r bg-background md:block"
          >
            <div className="space-y-2 p-3">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-5/6" />
              <Skeleton className="h-6 w-4/6" />
            </div>
          </aside>

          <div className="min-h-0 flex-1 overflow-auto bg-muted/20">
            <div className="mx-auto w-full max-w-4xl px-4 py-8">
              <div className="min-h-[600px] rounded-lg border bg-background p-6 shadow-sm">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t bg-background p-2">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  )
}
