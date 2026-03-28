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

interface ProseMirrorLikeNode {
  type?: { name?: string }
  attrs?: { level?: number }
  textContent?: string
}

export interface HeadingDocLike {
  descendants: (
    callback: (node: ProseMirrorLikeNode, pos: number) => void
  ) => void
}

export interface RangeDocLike {
  nodesBetween: (
    from: number,
    to: number,
    callback: (node: ProseMirrorLikeNode) => void
  ) => void
}

interface StepMapLike {
  forEach: (
    callback: (
      oldStart: number,
      oldEnd: number,
      newStart: number,
      newEnd: number
    ) => void
  ) => void
}

export interface TransactionLike {
  mapping: {
    maps: readonly StepMapLike[]
  }
}

export const EMPTY_HEADING_TEXT = "\u672a\u547d\u540d\u6807\u9898"

function normalizeHeadingLevel(value: unknown): number {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return 1

  if (numeric < 1) return 1
  if (numeric > 6) return 6

  return numeric
}

export function extractHeadingEntries(doc: HeadingDocLike): HeadingEntry[] {
  const entries: HeadingEntry[] = []

  doc.descendants((node, pos) => {
    if (node.type?.name !== "heading") return

    const text = node.textContent?.trim() || EMPTY_HEADING_TEXT

    entries.push({
      id: `h-${pos}`,
      pos,
      level: normalizeHeadingLevel(node.attrs?.level),
      text,
    })
  })

  return entries
}

export function buildTocTree(entries: HeadingEntry[]): TocItem[] {
  const roots: TocItem[] = []
  const stack: TocItem[] = []

  for (const entry of entries) {
    const item: TocItem = { ...entry, children: [] }

    while (stack.length > 0) {
      const top = stack[stack.length - 1]
      if (!top || top.level < item.level) break
      stack.pop()
    }

    const parent = stack[stack.length - 1]
    if (parent) {
      parent.children.push(item)
    } else {
      roots.push(item)
    }

    stack.push(item)
  }

  return roots
}

export function getChangedRanges(transaction: TransactionLike): ChangedRange[] {
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

function docHasHeadingInRange(doc: RangeDocLike, from: number, to: number): boolean {
  let hasHeading = false
  const safeFrom = Math.max(0, from)
  const safeTo = Math.max(safeFrom, to)

  try {
    doc.nodesBetween(safeFrom, safeTo, (node) => {
      if (node.type?.name === "heading") {
        hasHeading = true
      }
    })
  } catch {
    return false
  }

  return hasHeading
}

export function rangesTouchHeading(
  oldDoc: RangeDocLike,
  newDoc: RangeDocLike,
  ranges: ChangedRange[]
): boolean {
  for (const range of ranges) {
    if (docHasHeadingInRange(oldDoc, range.oldFrom, range.oldTo)) return true
    if (docHasHeadingInRange(newDoc, range.newFrom, range.newTo)) return true
  }

  return false
}
