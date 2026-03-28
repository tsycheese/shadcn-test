import { describe, expect, it } from "vitest"
import {
  buildTocTree,
  extractHeadingEntries,
  getChangedRanges,
  rangesTouchHeading,
  type HeadingEntry,
} from "@/lib/editor/toc"
import { cleanupCollapsedIds, collectTocIds } from "@/lib/editor/use-toc"

describe("editor TOC utilities", () => {
  it("extracts heading entries and normalizes empty text", () => {
    const doc = {
      descendants: (
        cb: (
          node: { type: { name: string }; attrs?: { level?: number }; textContent?: string },
          pos: number
        ) => void
      ) => {
        cb({ type: { name: "paragraph" }, attrs: {}, textContent: "p" }, 1)
        cb(
          {
            type: { name: "heading" },
            attrs: { level: 1 },
            textContent: "Intro",
          },
          5
        )
        cb(
          { type: { name: "heading" }, attrs: { level: 2 }, textContent: "" },
          12
        )
      },
    }

    const entries = extractHeadingEntries(doc)

    expect(entries).toEqual([
      { id: "h-5", pos: 5, level: 1, text: "Intro" },
      { id: "h-12", pos: 12, level: 2, text: "\u672a\u547d\u540d\u6807\u9898" },
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
            forEach: (
              cb: (
                oldStart: number,
                oldEnd: number,
                newStart: number,
                newEnd: number
              ) => void
            ) => {
              cb(10, 15, 10, 18)
            },
          },
        ],
      },
    }

    const ranges = getChangedRanges(transaction)
    expect(ranges).toEqual([{ oldFrom: 10, oldTo: 15, newFrom: 10, newTo: 18 }])

    const oldDoc = {
      nodesBetween: (
        from: number,
        to: number,
        cb: (node: { type: { name: string } }) => void
      ) => {
        if (from <= 12 && to >= 12) {
          cb({ type: { name: "heading" } })
        }
      },
    }
    const newDoc = {
      nodesBetween: () => undefined,
    }

    expect(rangesTouchHeading(oldDoc, newDoc, ranges)).toBe(true)
  })

  it("collects all ids from toc tree", () => {
    const tree = [
      {
        id: "h-1",
        pos: 1,
        level: 1,
        text: "A",
        children: [{ id: "h-2", pos: 2, level: 2, text: "B", children: [] }],
      },
    ]

    expect(collectTocIds(tree)).toEqual(new Set(["h-1", "h-2"]))
  })

  it("removes stale collapsed ids", () => {
    const currentIds = new Set(["h-1", "h-2"])
    const collapsedIds = new Set(["h-1", "h-999"])

    const cleaned = cleanupCollapsedIds(collapsedIds, currentIds)

    expect(cleaned).toEqual(new Set(["h-1"]))
  })
})
