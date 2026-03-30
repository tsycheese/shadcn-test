"use client"

import type { ReactNode } from "react"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import { TocTree } from "@/components/editor/toc-tree"
import type { TocItem } from "@/lib/editor/toc"

interface TocPanelProps {
  toc: TocItem[]
  collapsedIds: Set<string>
  activeId: string | null
  onToggle: (id: string) => void
  onJump: (item: TocItem) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  headerAction?: ReactNode
  className?: string
}

export function TocPanel({
  toc,
  collapsedIds,
  activeId,
  onToggle,
  onJump,
  onExpandAll,
  onCollapseAll,
  headerAction,
  className,
}: TocPanelProps) {
  return (
    <aside className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <h2 className="text-sm font-semibold">{"\u76ee\u5f55"}</h2>

        <div className="flex items-center gap-1">
          {headerAction}
          <Button type="button" size="sm" variant="ghost" onClick={onExpandAll}>
            {"\u5168\u5c55"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onCollapseAll}
          >
            {"\u5168\u6536"}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {toc.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            {"\u6682\u65e0\u6807\u9898"}
          </p>
        ) : (
          <TocTree
            items={toc}
            collapsedIds={collapsedIds}
            activeId={activeId}
            onToggle={onToggle}
            onJump={onJump}
          />
        )}
      </div>
    </aside>
  )
}
