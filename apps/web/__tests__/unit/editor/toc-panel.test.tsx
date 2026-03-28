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
      {
        id: "h-2",
        pos: 2,
        level: 2,
        text: "Scope",
        children: [],
      },
    ],
  },
]

describe("TocPanel", () => {
  it("renders toc tree items", () => {
    render(
      <TocPanel
        toc={tree}
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
        toc={tree}
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
