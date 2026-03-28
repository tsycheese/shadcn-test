"use client"

import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import type { TocItem } from "@/lib/editor/toc"

interface TocTreeProps {
  items: TocItem[]
  collapsedIds: Set<string>
  activeId: string | null
  onToggle: (id: string) => void
  onJump: (item: TocItem) => void
}

interface TocNodeProps extends Omit<TocTreeProps, "items"> {
  item: TocItem
}

const TocNode = React.memo(function TocNode({
  item,
  collapsedIds,
  activeId,
  onToggle,
  onJump,
}: TocNodeProps) {
  const hasChildren = item.children.length > 0
  const collapsed = collapsedIds.has(item.id)
  const isActive = activeId === item.id

  return (
    <li>
      <div className="flex items-center gap-1">
        {hasChildren ? (
          <button
            type="button"
            aria-label={
              collapsed ? "\u5c55\u5f00" : "\u6298\u53e0"
            }
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm hover:bg-muted"
            onClick={() => onToggle(item.id)}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" aria-hidden="true" />
        )}

        <Button
          type="button"
          variant={isActive ? "secondary" : "ghost"}
          size="sm"
          className="h-7 flex-1 justify-start truncate px-2"
          style={{ paddingLeft: `${Math.max(0, item.level - 1) * 12 + 8}px` }}
          onClick={() => onJump(item)}
        >
          <span className="truncate">{item.text}</span>
        </Button>
      </div>

      {hasChildren && !collapsed ? (
        <div className="pl-2">
          <TocTree
            items={item.children}
            collapsedIds={collapsedIds}
            activeId={activeId}
            onToggle={onToggle}
            onJump={onJump}
          />
        </div>
      ) : null}
    </li>
  )
})

export const TocTree = React.memo(function TocTree({
  items,
  collapsedIds,
  activeId,
  onToggle,
  onJump,
}: TocTreeProps) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <TocNode
          key={item.id}
          item={item}
          collapsedIds={collapsedIds}
          activeId={activeId}
          onToggle={onToggle}
          onJump={onJump}
        />
      ))}
    </ul>
  )
})
