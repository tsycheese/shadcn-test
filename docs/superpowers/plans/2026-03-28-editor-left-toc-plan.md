# Editor Left TOC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a left-side table of contents (TOC) for the editor with tree expand/collapse, heading jump, and responsive mobile drawer behavior without introducing typing lag.

**Architecture:** Keep TOC as a pure UI/derived-data feature. Build a pure TOC domain utility layer first (`toc.ts`), then a thin hook (`use-toc.ts`) for editor event wiring and performance scheduling, then render with focused UI components (`toc-panel`, `toc-tree`). Integrate into editor page layout as a left panel on desktop and Sheet drawer on mobile.

**Tech Stack:** Next.js App Router, React 19, Tiptap, TypeScript, Vitest + Testing Library, shadcn/ui Sheet/Button.

---

## File Structure (Planned)

- Create: `apps/web/lib/editor/toc.ts`
- Create: `apps/web/lib/editor/use-toc.ts`
- Create: `apps/web/components/editor/toc-panel.tsx`
- Create: `apps/web/components/editor/toc-tree.tsx`
- Modify: `apps/web/app/(dashboard)/editor/[docId]/page.tsx`
- Modify: `apps/web/app/(dashboard)/editor/[docId]/editor-skeleton.tsx`
- Create: `apps/web/__tests__/unit/editor/toc.test.ts`
- Create: `apps/web/__tests__/unit/editor/toc-panel.test.tsx`

Responsibilities:
1. `toc.ts`: pure extraction/build/filter functions (no React).
2. `use-toc.ts`: event subscription, scheduling, collapse state, jump API.
3. `toc-panel.tsx`: panel shell, empty state, global expand/collapse, mobile drawer wrapper.
4. `toc-tree.tsx`: recursive tree renderer + node interactions.
5. `page.tsx`: left panel integration + responsive layout wiring.
6. `editor-skeleton.tsx`: keep loading layout consistent with TOC-enabled editor.

---

### Task 1: Build TOC Domain Utilities (TDD)

**Files:**
- Create: `apps/web/lib/editor/toc.ts`
- Test: `apps/web/__tests__/unit/editor/toc.test.ts`

- [ ] **Step 1: Write failing tests for extraction, tree building, and heading-range filtering**

```ts
// apps/web/__tests__/unit/editor/toc.test.ts
import { describe, expect, it } from "vitest"
import {
  buildTocTree,
  extractHeadingEntries,
  getChangedRanges,
  rangesTouchHeading,
  type HeadingEntry,
} from "@/lib/editor/toc"

describe("editor TOC utilities", () => {
  it("extracts heading entries and normalizes empty text", () => {
    const doc = {
      descendants: (cb: (node: any, pos: number) => void) => {
        cb({ type: { name: "paragraph" }, attrs: {}, textContent: "p" }, 1)
        cb({ type: { name: "heading" }, attrs: { level: 1 }, textContent: "Intro" }, 5)
        cb({ type: { name: "heading" }, attrs: { level: 2 }, textContent: "" }, 12)
      },
    }

    const entries = extractHeadingEntries(doc as any)

    expect(entries).toEqual([
      { id: "h-5", pos: 5, level: 1, text: "Intro" },
      { id: "h-12", pos: 12, level: 2, text: "未命名标题" },
    ])
  })

  it("builds nested toc tree from flat entries", () => {
    const flat: HeadingEntry[] = [
      { id: "h-1", pos: 1, level: 1, text: "A" },
      { id: "h-2", pos: 2, level: 2, text: "B" },
      { id: "h-3", pos: 3, level: 2, text: "C" },
      { id: "h-4", pos: 4, level: 3, text: "D" },
      { id: "h-5", pos: 5, level: 1, text: "E" },
    ]

    const tree = buildTocTree(flat)

    expect(tree).toHaveLength(2)
    expect(tree[0]?.children).toHaveLength(2)
    expect(tree[0]?.children[1]?.children[0]?.text).toBe("D")
  })

  it("returns changed ranges and detects heading touch", () => {
    const transaction = {
      mapping: {
        maps: [
          {
            forEach: (cb: (oldStart: number, oldEnd: number, newStart: number, newEnd: number) => void) => {
              cb(10, 15, 10, 18)
            },
          },
        ],
      },
    }

    const ranges = getChangedRanges(transaction as any)
    expect(ranges).toEqual([{ oldFrom: 10, oldTo: 15, newFrom: 10, newTo: 18 }])

    const oldDoc = {
      nodesBetween: (from: number, to: number, cb: (node: any) => void) => {
        if (from <= 12 && to >= 12) cb({ type: { name: "heading" } })
      },
    }
    const newDoc = { nodesBetween: () => undefined }

    expect(rangesTouchHeading(oldDoc as any, newDoc as any, ranges)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter web test:run -- __tests__/unit/editor/toc.test.ts
```

Expected:
1. FAIL with module not found for `@/lib/editor/toc`.

- [ ] **Step 3: Write minimal TOC utilities implementation**

```ts
// apps/web/lib/editor/toc.ts
export interface HeadingEntry {
  id: string
  pos: number
  level: number
  text: string
}

export interface TocItem extends HeadingEntry {
  children: TocItem[]
}

export interface ChangedRange {
  oldFrom: number
  oldTo: number
  newFrom: number
  newTo: number
}

const EMPTY_HEADING_TEXT = "未命名标题"

export function extractHeadingEntries(doc: {
  descendants: (cb: (node: any, pos: number) => void) => void
}): HeadingEntry[] {
  const entries: HeadingEntry[] = []

  doc.descendants((node, pos) => {
    if (node?.type?.name !== "heading") return

    const level = Number(node?.attrs?.level ?? 1)
    const raw = String(node?.textContent ?? "").trim()

    entries.push({
      id: `h-${pos}`,
      pos,
      level,
      text: raw || EMPTY_HEADING_TEXT,
    })
  })

  return entries
}

export function buildTocTree(entries: HeadingEntry[]): TocItem[] {
  const roots: TocItem[] = []
  const stack: TocItem[] = []

  for (const entry of entries) {
    const node: TocItem = { ...entry, children: [] }

    while (stack.length > 0 && (stack[stack.length - 1]?.level ?? 0) >= node.level) {
      stack.pop()
    }

    const parent = stack[stack.length - 1]
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }

    stack.push(node)
  }

  return roots
}

export function getChangedRanges(transaction: {
  mapping: { maps: Array<{ forEach: (cb: (oldStart: number, oldEnd: number, newStart: number, newEnd: number) => void) => void }> }
}): ChangedRange[] {
  const ranges: ChangedRange[] = []

  for (const map of transaction.mapping.maps) {
    map.forEach((oldStart, oldEnd, newStart, newEnd) => {
      ranges.push({
        oldFrom: oldStart,
        oldTo: oldEnd,
        newFrom: newStart,
        newTo: newEnd,
      })
    })
  }

  return ranges
}

function docHasHeadingInRange(
  doc: { nodesBetween: (from: number, to: number, cb: (node: any) => void) => void },
  from: number,
  to: number
): boolean {
  let found = false
  const safeFrom = Math.max(0, from)
  const safeTo = Math.max(safeFrom, to)

  doc.nodesBetween(safeFrom, safeTo, (node) => {
    if (node?.type?.name === "heading") {
      found = true
    }
  })

  return found
}

export function rangesTouchHeading(
  oldDoc: { nodesBetween: (from: number, to: number, cb: (node: any) => void) => void },
  newDoc: { nodesBetween: (from: number, to: number, cb: (node: any) => void) => void },
  ranges: ChangedRange[]
): boolean {
  for (const range of ranges) {
    if (docHasHeadingInRange(oldDoc, range.oldFrom, range.oldTo)) return true
    if (docHasHeadingInRange(newDoc, range.newFrom, range.newTo)) return true
  }

  return false
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
pnpm --filter web test:run -- __tests__/unit/editor/toc.test.ts
```

Expected:
1. PASS `editor TOC utilities` suite.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/editor/toc.ts apps/web/__tests__/unit/editor/toc.test.ts
git commit -m "feat(editor): add toc extraction and tree utilities"
```

---

### Task 2: Add TOC Hook with Performance Scheduling (TDD)

**Files:**
- Create: `apps/web/lib/editor/use-toc.ts`
- Modify: `apps/web/__tests__/unit/editor/toc.test.ts`

- [ ] **Step 1: Extend tests for collapsed-id cleanup helper and flatten helper**

```ts
// append to apps/web/__tests__/unit/editor/toc.test.ts
import { collectTocIds, cleanupCollapsedIds } from "@/lib/editor/use-toc"

it("collects all ids from toc tree", () => {
  const tree = [
    {
      id: "h-1",
      pos: 1,
      level: 1,
      text: "A",
      children: [
        { id: "h-2", pos: 2, level: 2, text: "B", children: [] },
      ],
    },
  ]

  expect(collectTocIds(tree as any)).toEqual(new Set(["h-1", "h-2"]))
})

it("removes stale collapsed ids", () => {
  const current = new Set(["h-1", "h-2"])
  const collapsed = new Set(["h-1", "h-999"])

  const cleaned = cleanupCollapsedIds(collapsed, current)

  expect(cleaned).toEqual(new Set(["h-1"]))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter web test:run -- __tests__/unit/editor/toc.test.ts
```

Expected:
1. FAIL with module not found for `@/lib/editor/use-toc`.

- [ ] **Step 3: Implement hook and helper functions**

```ts
// apps/web/lib/editor/use-toc.ts
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Editor } from "@tiptap/react"
import { buildTocTree, extractHeadingEntries, getChangedRanges, rangesTouchHeading, type TocItem } from "@/lib/editor/toc"

const LARGE_TOC_THRESHOLD = 200
const LARGE_TOC_DEBOUNCE_MS = 160

export function collectTocIds(items: TocItem[]): Set<string> {
  const ids = new Set<string>()
  const walk = (nodes: TocItem[]) => {
    for (const node of nodes) {
      ids.add(node.id)
      if (node.children.length > 0) walk(node.children)
    }
  }
  walk(items)
  return ids
}

export function cleanupCollapsedIds(collapsed: Set<string>, validIds: Set<string>): Set<string> {
  const next = new Set<string>()
  for (const id of collapsed) {
    if (validIds.has(id)) next.add(id)
  }
  return next
}

function scheduleIdle(work: () => void) {
  const idle = (globalThis as any).requestIdleCallback as ((cb: () => void, opts?: { timeout: number }) => number) | undefined
  if (idle) {
    idle(work, { timeout: 200 })
    return
  }
  setTimeout(work, 0)
}

export function useToc(editor: Editor | null) {
  const [toc, setToc] = useState<TocItem[]>([])
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [activeTocId, setActiveTocId] = useState<string | null>(null)

  const rafRef = useRef<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rebuildToc = useCallback(() => {
    if (!editor) return
    const entries = extractHeadingEntries(editor.state.doc as any)
    const tree = buildTocTree(entries)
    setToc(tree)
    const validIds = collectTocIds(tree)
    setCollapsedIds((prev) => cleanupCollapsedIds(prev, validIds))
  }, [editor])

  useEffect(() => {
    if (!editor) return

    rebuildToc()

    const onTransaction = ({ transaction }: { transaction: any }) => {
      if (!transaction.docChanged) return

      const ranges = getChangedRanges(transaction)
      const touchHeading = rangesTouchHeading(transaction.before as any, transaction.doc as any, ranges)
      if (!touchHeading) return

      const schedule = () => {
        const headingCount = extractHeadingEntries(transaction.doc as any).length
        if (headingCount > LARGE_TOC_THRESHOLD) {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => scheduleIdle(rebuildToc), LARGE_TOC_DEBOUNCE_MS)
          return
        }
        rebuildToc()
      }

      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(schedule)
    }

    editor.on("transaction", onTransaction)

    return () => {
      editor.off("transaction", onTransaction)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [editor, rebuildToc])

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => setCollapsedIds(new Set()), [])

  const collapseAll = useCallback(() => {
    const ids = collectTocIds(toc)
    setCollapsedIds(ids)
  }, [toc])

  const jumpToHeading = useCallback(
    (item: TocItem) => {
      if (!editor) return
      editor.chain().focus().setTextSelection(item.pos + 1).scrollIntoView().run()
      setActiveTocId(item.id)
    },
    [editor]
  )

  return useMemo(
    () => ({
      toc,
      collapsedIds,
      activeTocId,
      setActiveTocId,
      toggleCollapsed,
      expandAll,
      collapseAll,
      jumpToHeading,
    }),
    [toc, collapsedIds, activeTocId, toggleCollapsed, expandAll, collapseAll, jumpToHeading]
  )
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
pnpm --filter web test:run -- __tests__/unit/editor/toc.test.ts
```

Expected:
1. PASS all TOC utility tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/editor/use-toc.ts apps/web/__tests__/unit/editor/toc.test.ts
git commit -m "feat(editor): add toc hook with scheduled rebuild"
```

---

### Task 3: Build TOC UI Components (TDD)

**Files:**
- Create: `apps/web/components/editor/toc-tree.tsx`
- Create: `apps/web/components/editor/toc-panel.tsx`
- Test: `apps/web/__tests__/unit/editor/toc-panel.test.tsx`

- [ ] **Step 1: Write failing component tests for rendering and interactions**

```tsx
// apps/web/__tests__/unit/editor/toc-panel.test.tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TocPanel } from "@/components/editor/toc-panel"

const tree = [
  {
    id: "h-1",
    pos: 1,
    level: 1,
    text: "Intro",
    children: [
      { id: "h-2", pos: 2, level: 2, text: "Scope", children: [] },
    ],
  },
]

describe("TocPanel", () => {
  it("renders toc tree items", () => {
    render(
      <TocPanel
        toc={tree as any}
        collapsedIds={new Set()}
        activeId={null}
        onToggle={vi.fn()}
        onJump={vi.fn()}
        onExpandAll={vi.fn()}
        onCollapseAll={vi.fn()}
      />
    )

    expect(screen.getByText("Intro")).toBeInTheDocument()
    expect(screen.getByText("Scope")).toBeInTheDocument()
  })

  it("calls jump handler when item clicked", () => {
    const onJump = vi.fn()

    render(
      <TocPanel
        toc={tree as any}
        collapsedIds={new Set()}
        activeId={null}
        onToggle={vi.fn()}
        onJump={onJump}
        onExpandAll={vi.fn()}
        onCollapseAll={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText("Scope"))
    expect(onJump).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter web test:run -- __tests__/unit/editor/toc-panel.test.tsx
```

Expected:
1. FAIL with module not found for `@/components/editor/toc-panel`.

- [ ] **Step 3: Implement TOC tree and panel components**

```tsx
// apps/web/components/editor/toc-tree.tsx
"use client"

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

export function TocTree({ items, collapsedIds, activeId, onToggle, onJump }: TocTreeProps) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const hasChildren = item.children.length > 0
        const collapsed = collapsedIds.has(item.id)
        const isActive = activeId === item.id

        return (
          <li key={item.id}>
            <div className="flex items-center gap-1">
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={collapsed ? "展开" : "折叠"}
                  className="h-5 w-5 shrink-0 rounded hover:bg-muted"
                  onClick={() => onToggle(item.id)}
                >
                  {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              ) : (
                <span className="h-5 w-5 shrink-0" />
              )}

              <Button
                type="button"
                variant={isActive ? "secondary" : "ghost"}
                className="h-7 justify-start px-2 text-left text-sm"
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
      })}
    </ul>
  )
}
```

```tsx
// apps/web/components/editor/toc-panel.tsx
"use client"

import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import type { TocItem } from "@/lib/editor/toc"
import { TocTree } from "@/components/editor/toc-tree"

interface TocPanelProps {
  toc: TocItem[]
  collapsedIds: Set<string>
  activeId: string | null
  onToggle: (id: string) => void
  onJump: (item: TocItem) => void
  onExpandAll: () => void
  onCollapseAll: () => void
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
  className,
}: TocPanelProps) {
  return (
    <aside className={className}>
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-sm font-semibold">目录</h3>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={onExpandAll}>
            全展
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCollapseAll}>
            全收
          </Button>
        </div>
      </div>

      <Separator />

      <div className="max-h-full overflow-auto px-2 py-2">
        {toc.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">暂无标题</p>
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
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
pnpm --filter web test:run -- __tests__/unit/editor/toc-panel.test.tsx
```

Expected:
1. PASS `TocPanel` suite.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/editor/toc-tree.tsx apps/web/components/editor/toc-panel.tsx apps/web/__tests__/unit/editor/toc-panel.test.tsx
git commit -m "feat(editor): add toc panel and tree components"
```

---

### Task 4: Integrate TOC into Editor Page + Responsive Drawer (TDD)

**Files:**
- Modify: `apps/web/app/(dashboard)/editor/[docId]/page.tsx`
- Modify: `apps/web/app/(dashboard)/editor/[docId]/editor-skeleton.tsx`
- Modify: `apps/web/__tests__/unit/editor/layout.test.tsx`

- [ ] **Step 1: Update layout test expectations for left TOC shell**

```tsx
// append in apps/web/__tests__/unit/editor/layout.test.tsx
import { render, screen } from "@testing-library/react"
import { EditorSkeleton } from "@/app/(dashboard)/editor/[docId]/editor-skeleton"

it("renders desktop toc placeholder on skeleton", () => {
  render(<EditorSkeleton />)
  expect(screen.getByTestId("editor-skeleton-toc")).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter web test:run -- __tests__/unit/editor/layout.test.tsx
```

Expected:
1. FAIL because TOC placeholder is not rendered yet.

- [ ] **Step 3: Integrate useToc and TOC panel in editor page**

```tsx
// key edits in apps/web/app/(dashboard)/editor/[docId]/page.tsx
import { TocPanel } from "@/components/editor/toc-panel"
import { useToc } from "@/lib/editor/use-toc"
import { ListTree } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"

const {
  toc,
  collapsedIds,
  activeTocId,
  toggleCollapsed,
  expandAll,
  collapseAll,
  jumpToHeading,
} = useToc(editor)

<div className="min-h-0 flex-1 bg-muted/20">
  <div className="mx-auto flex h-full w-full max-w-[1400px]">
    <aside className="hidden h-full w-[260px] shrink-0 border-r bg-background md:block">
      <TocPanel
        className="h-full"
        toc={toc}
        collapsedIds={collapsedIds}
        activeId={activeTocId}
        onToggle={toggleCollapsed}
        onJump={jumpToHeading}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />
    </aside>

    <div className="min-h-0 flex-1 overflow-auto">
      <div className="md:hidden px-4 pt-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <ListTree className="mr-2 h-4 w-4" />
              目录
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>目录</SheetTitle>
            </SheetHeader>
            <TocPanel
              className="h-full"
              toc={toc}
              collapsedIds={collapsedIds}
              activeId={activeTocId}
              onToggle={toggleCollapsed}
              onJump={jumpToHeading}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
            />
          </SheetContent>
        </Sheet>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-background rounded-lg shadow-sm border min-h-[600px] relative">
          <EditorContent editor={editor} className="tiptap max-w-none p-6 focus:outline-none" />
          <RemoteCursors editor={editor} remoteCursors={remoteCursors} />
        </div>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Update editor skeleton to match TOC layout**

```tsx
// key edits in apps/web/app/(dashboard)/editor/[docId]/editor-skeleton.tsx
<div className="min-h-0 flex-1 bg-muted/20">
  <div className="mx-auto flex h-full w-full max-w-[1400px]">
    <aside
      data-testid="editor-skeleton-toc"
      className="hidden h-full w-[260px] shrink-0 border-r bg-background md:block"
    >
      <div className="p-3 space-y-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-5/6" />
        <Skeleton className="h-6 w-4/6" />
      </div>
    </aside>

    <div className="min-h-0 flex-1 overflow-auto bg-muted/20">
      {/* existing content skeleton */}
    </div>
  </div>
</div>
```

- [ ] **Step 5: Run tests to verify pass**

Run:
```bash
pnpm --filter web test:run -- __tests__/unit/editor/layout.test.tsx
pnpm --filter web test:run -- __tests__/unit/editor/toc.test.ts __tests__/unit/editor/toc-panel.test.tsx
```

Expected:
1. PASS layout regression test.
2. PASS all TOC unit/component tests.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/(dashboard)/editor/[docId]/page.tsx" "apps/web/app/(dashboard)/editor/[docId]/editor-skeleton.tsx" apps/web/__tests__/unit/editor/layout.test.tsx
git commit -m "feat(editor): integrate left toc panel in editor layout"
```

---

### Task 5: End-to-End Verification and Final Cleanup

**Files:**
- Modify if needed: any files touched in Tasks 1-4

- [ ] **Step 1: Run full targeted editor test suite**

Run:
```bash
pnpm --filter web test:run -- __tests__/unit/editor/layout.test.tsx __tests__/unit/editor/toc.test.ts __tests__/unit/editor/toc-panel.test.tsx
```

Expected:
1. PASS all editor-related tests.

- [ ] **Step 2: Run lint on changed files scope (or workspace lint if preferred)**

Run:
```bash
pnpm --filter web lint
```

Expected:
1. PASS for touched editor TOC code.

- [ ] **Step 3: Manual verification checklist**

```text
1. Desktop > /editor/[docId]: 左侧目录常驻显示。
2. 点击目录项: 光标定位到对应标题。
3. 节点折叠/展开: 子节点显隐正确。
4. 全展/全收: 行为正确。
5. 手机尺寸: 目录通过抽屉打开，跳转正常。
6. 协同编辑: 远端新增标题后目录可刷新且无明显卡顿。
```

- [ ] **Step 4: Final commit**

```bash
git add apps/web/lib/editor/toc.ts apps/web/lib/editor/use-toc.ts apps/web/components/editor/toc-tree.tsx apps/web/components/editor/toc-panel.tsx apps/web/__tests__/unit/editor/toc.test.ts apps/web/__tests__/unit/editor/toc-panel.test.tsx "apps/web/app/(dashboard)/editor/[docId]/page.tsx" "apps/web/app/(dashboard)/editor/[docId]/editor-skeleton.tsx" apps/web/__tests__/unit/editor/layout.test.tsx
git commit -m "feat(editor): add left toc with expand and collapse"
```

---

## Spec Coverage Check

1. 左侧目录布局: Task 4 covers desktop + mobile drawer.
2. 树展开/折叠: Task 3 + Task 4 cover node/global controls.
3. 点击跳转: Task 2 jump API + Task 3 tests + Task 4 integration.
4. 性能防护: Task 2 includes docChanged filtering, heading-range detection, RAF coalescing, large-toc debounce + idle scheduling.
5. 测试策略: Task 1/3/4/5 include unit + component + regression + manual checks.

## Placeholder Scan

1. No TBD/TODO placeholders.
2. All tasks include concrete file paths, commands, and code blocks.
3. Commit commands/messages are explicit.

## Type/Signature Consistency Check

1. `TocItem`/`HeadingEntry` defined in `toc.ts` and consumed consistently.
2. `TocPanel` props match `useToc` return shape.
3. `jumpToHeading` consistently accepts `TocItem`.
