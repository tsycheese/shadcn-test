"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Editor } from "@tiptap/react"
import {
  buildTocTree,
  extractHeadingEntries,
  getChangedRanges,
  rangesTouchHeading,
  type HeadingDocLike,
  type RangeDocLike,
  type TocItem,
  type TransactionLike,
} from "@/lib/editor/toc"

interface TransactionEvent {
  transaction: {
    docChanged: boolean
    mapping: TransactionLike["mapping"]
    before: RangeDocLike
    doc: RangeDocLike
  }
}

const LARGE_TOC_THRESHOLD = 200
const LARGE_TOC_DEBOUNCE_MS = 160

export function collectTocIds(items: TocItem[]): Set<string> {
  const ids = new Set<string>()

  const walk = (nodes: TocItem[]) => {
    for (const node of nodes) {
      ids.add(node.id)
      if (node.children.length > 0) {
        walk(node.children)
      }
    }
  }

  walk(items)
  return ids
}

export function cleanupCollapsedIds(
  collapsedIds: Set<string>,
  validIds: Set<string>
): Set<string> {
  const next = new Set<string>()

  for (const id of collapsedIds) {
    if (validIds.has(id)) {
      next.add(id)
    }
  }

  return next
}

function requestIdle(task: () => void): () => void {
  const win = window as Window & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => number
    cancelIdleCallback?: (handle: number) => void
  }

  if (typeof win.requestIdleCallback === "function") {
    const idleId = win.requestIdleCallback(() => task(), { timeout: 200 })

    return () => {
      win.cancelIdleCallback?.(idleId)
    }
  }

  const timeoutId = window.setTimeout(() => task(), 0)
  return () => {
    window.clearTimeout(timeoutId)
  }
}

export function useToc(editor: Editor | null) {
  const [toc, setToc] = useState<TocItem[]>([])
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set())
  const [activeTocId, setActiveTocId] = useState<string | null>(null)

  const headingCountRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)
  const debounceIdRef = useRef<number | null>(null)
  const cancelIdleRef = useRef<(() => void) | null>(null)

  const clearPendingTasks = useCallback(() => {
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }

    if (debounceIdRef.current !== null) {
      window.clearTimeout(debounceIdRef.current)
      debounceIdRef.current = null
    }

    if (cancelIdleRef.current) {
      cancelIdleRef.current()
      cancelIdleRef.current = null
    }
  }, [])

  const rebuildToc = useCallback(() => {
    if (!editor) return

    const entries = extractHeadingEntries(editor.state.doc as unknown as HeadingDocLike)
    headingCountRef.current = entries.length

    const nextToc = buildTocTree(entries)
    setToc(nextToc)

    const validIds = collectTocIds(nextToc)
    setCollapsedIds((prev) => cleanupCollapsedIds(prev, validIds))
    setActiveTocId((prev) => (prev && validIds.has(prev) ? prev : null))
  }, [editor])

  const scheduleRebuild = useCallback(() => {
    if (!editor) return

    const scheduleWork = () => {
      const run = () => {
        cancelIdleRef.current = null
        rebuildToc()
      }

      if (headingCountRef.current > LARGE_TOC_THRESHOLD) {
        if (debounceIdRef.current !== null) {
          window.clearTimeout(debounceIdRef.current)
        }

        debounceIdRef.current = window.setTimeout(() => {
          debounceIdRef.current = null
          cancelIdleRef.current = requestIdle(run)
        }, LARGE_TOC_DEBOUNCE_MS)
        return
      }

      run()
    }

    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current)
    }

    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null
      scheduleWork()
    })
  }, [editor, rebuildToc])

  useEffect(() => {
    if (!editor) return

    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs local TOC state from external editor state once on mount.
    rebuildToc()

    const handleTransaction = (event: TransactionEvent) => {
      const transaction = event.transaction
      if (!transaction.docChanged) return

      const ranges = getChangedRanges({
        mapping: transaction.mapping,
      })

      if (ranges.length === 0) {
        scheduleRebuild()
        return
      }

      const touched = rangesTouchHeading(
        transaction.before,
        transaction.doc,
        ranges
      )

      if (!touched) return
      scheduleRebuild()
    }

    editor.on("transaction", handleTransaction)

    return () => {
      editor.off("transaction", handleTransaction)
      clearPendingTasks()
    }
  }, [clearPendingTasks, editor, rebuildToc, scheduleRebuild])

  useEffect(() => {
    return () => {
      clearPendingTasks()
    }
  }, [clearPendingTasks])

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setCollapsedIds(new Set())
  }, [])

  const collapseAll = useCallback(() => {
    setCollapsedIds(collectTocIds(toc))
  }, [toc])

  const jumpToHeading = useCallback(
    (item: TocItem) => {
      if (!editor) return

      const maxPos = editor.state.doc.content.size
      const selectionPos = Math.max(1, Math.min(item.pos + 1, maxPos))

      editor
        .chain()
        .focus()
        .setTextSelection(selectionPos)
        .scrollIntoView()
        .run()

      setActiveTocId(item.id)
    },
    [editor]
  )

  return useMemo(
    () => ({
      toc,
      collapsedIds,
      activeTocId,
      toggleCollapsed,
      expandAll,
      collapseAll,
      jumpToHeading,
      setActiveTocId,
    }),
    [
      toc,
      collapsedIds,
      activeTocId,
      toggleCollapsed,
      expandAll,
      collapseAll,
      jumpToHeading,
    ]
  )
}
