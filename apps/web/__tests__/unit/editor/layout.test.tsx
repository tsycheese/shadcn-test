import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EditorSkeleton } from "@/app/(dashboard)/editor/[docId]/editor-skeleton"
import { EDITOR_VIEWPORT_CLASS } from "@/lib/editor/layout"

describe("Editor viewport layout", () => {
  it("uses full main area height so only editor content scrolls", () => {
    expect(EDITOR_VIEWPORT_CLASS).toBe("h-full")
  })

  it("applies compensated viewport height on editor skeleton", () => {
    const { container } = render(<EditorSkeleton />)

    expect(container.firstElementChild).toHaveClass(EDITOR_VIEWPORT_CLASS)
  })

  it("renders desktop toc placeholder on skeleton", () => {
    render(<EditorSkeleton />)

    expect(screen.getByTestId("editor-skeleton-toc")).toBeInTheDocument()
  })
})
