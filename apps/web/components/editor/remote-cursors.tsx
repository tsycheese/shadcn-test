"use client"

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react"
import type { Editor } from "@tiptap/react"
import type { RemoteCursor } from "@/lib/editor/use-editor"

interface RemoteCursorsProps {
  editor: Editor | null
  remoteCursors: RemoteCursor[]
}

export function RemoteCursors({ editor, remoteCursors }: RemoteCursorsProps) {
  const [cursorPositions, setCursorPositions] = useState<
    Array<{
      cursor: RemoteCursor
      top: number
      left: number
      height: number
    }>
  >([])

  const containerRef = useRef<HTMLDivElement>(null)
  const rafIdRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)
  const editorDomRef = useRef<HTMLElement | null>(null) // 保存 editor.dom 的引用
  const UPDATE_INTERVAL = 32 // 30fps，足够流畅

  const cancelRaf = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }

  // ✅ 核心修复：把 updatePositions 定义为一个 useCallback 函数
  const updatePositions = useCallback(() => {
    if (
      !editor ||
      !editor.view ||
      !containerRef.current ||
      remoteCursors.length === 0
    ) {
      setCursorPositions([])
      return
    }

    const positions = remoteCursors
      .map((cursor) => {
        if (cursor.position === null) return null

        try {
          // 获取光标位置的坐标信息
          // coordsAtPos 返回包含 top, bottom, left, right 的边界框
          const coords = editor.view.coordsAtPos(cursor.position)
          
          const containerRect = containerRef.current!.getBoundingClientRect()
          const editorDom = editor.view.dom

          // ✅ 正确计算：coords 是视口坐标，减去容器的视口偏移
          const left = coords.left - containerRect.left
          // 使用 top 和 bottom 的差值作为精确的行高
          const height = coords.bottom - coords.top
          const top = coords.top - containerRect.top + editorDom.scrollTop

          return {
            cursor,
            top,
            left,
            height,
          }
        } catch {
          return null
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    setCursorPositions(positions)
  }, [editor, remoteCursors]) // 依赖项：只有 editor 和 remoteCursors 变化时才重新创建

  // 1. 主逻辑：编辑器事件 + RAF 调度
  useEffect(() => {
    // 安全获取 editor.dom，避免访问未就绪的编辑器
    const getEditorDom = (): HTMLElement | null => {
      if (!editor) return null
      try {
        // Tiptap 的 editor.view 在未就绪时访问会抛错，用 try-catch 包裹
        return editor.view?.dom ?? null
      } catch {
        return null
      }
    }

    const editorDom = getEditorDom()

    if (
      !editorDom ||
      !containerRef.current ||
      remoteCursors.length === 0
    ) {
      setCursorPositions([])
      cancelRaf()
      return
    }

    // 保存 editor.dom 引用，用于清理函数（避免访问已销毁的 editor.view）
    editorDomRef.current = editorDom

    // 节流版 RAF
    const scheduleUpdate = (timestamp: number = 0) => {
      if (timestamp - lastUpdateTimeRef.current > UPDATE_INTERVAL) {
        updatePositions()
        lastUpdateTimeRef.current = timestamp
      }
      rafIdRef.current = requestAnimationFrame(scheduleUpdate)
    }

    // 初始更新
    updatePositions()
    rafIdRef.current = requestAnimationFrame(scheduleUpdate)

    // 编辑器事件监听
    const handleScroll = () => updatePositions()
    const handleUpdate = () => updatePositions()

    editorDom.addEventListener("scroll", handleScroll)
    editor.on("update", handleUpdate)
    editor.on("selectionUpdate", handleUpdate)

    return () => {
      cancelRaf()
      // 使用保存的 ref，避免访问已销毁的 editor.view
      if (editorDomRef.current) {
        editorDomRef.current.removeEventListener("scroll", handleScroll)
      }
      editor.off("update", handleUpdate)
      editor.off("selectionUpdate", handleUpdate)
    }
  }, [editor, remoteCursors, updatePositions])

  // 2. 监听 containerRef 挂载：ref 存在后立即更新一次
  useLayoutEffect(() => {
    if (containerRef.current && editor) {
      updatePositions()
    }
  }, [containerRef.current, editor])

  // ✅ 核心修复：始终渲染容器，即使没有远程光标
  // 这样容器会一直存在于 DOM 中，当有远程用户加入时能立即显示
  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 50 }}
    >
      {cursorPositions.map(({ cursor, top, left, height }) => (
        <div
          key={`remote-cursor-${cursor.userId}`}
          className="absolute"
          style={{ top: `${top}px`, left: `${left}px` }}
        >
          {/* 光标线条 - 高度等于文字行高 */}
          <div
            className="absolute w-0.5 animate-pulse"
            style={{ 
              backgroundColor: cursor.color, 
              height: `${height}px`,
            }}
          />
          {/* 用户名标签 */}
          <div
            className="absolute -top-6 left-0 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-white"
            style={{
              backgroundColor: cursor.color,
              fontSize: "11px",
              lineHeight: "1.2",
            }}
          >
            {cursor.userName}
          </div>
        </div>
      ))}
    </div>
  )
}
