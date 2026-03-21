"use client"

import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { RemoteCursor } from '@/lib/editor/use-editor'

interface RemoteCursorsProps {
  editor: Editor | null
  remoteCursors: RemoteCursor[]
}

/**
 * 远程光标渲染组件
 * 在编辑器上方渲染其他用户的光标位置和标签
 */
export function RemoteCursors({ editor, remoteCursors }: RemoteCursorsProps) {
  const [cursorPositions, setCursorPositions] = useState<
    Array<{
      cursor: RemoteCursor
      top: number
      left: number
    }>
  >([])

  const containerRef = useRef<HTMLDivElement>(null)

  // 根据编辑器内容计算光标位置
  useEffect(() => {
    if (!editor || remoteCursors.length === 0) {
      setCursorPositions([])
      return
    }

    const updatePositions = () => {
      const positions = remoteCursors
        .map((cursor) => {
          if (cursor.position === null) return null

          // 使用 editor.view.coordsAtPos 获取位置坐标
          try {
            const coords = editor.view.coordsAtPos(cursor.position)
            const editorRect = editor.view.dom.getBoundingClientRect()
            const containerRect = containerRef.current?.getBoundingClientRect()

            if (!containerRect) return null

            // 计算相对于容器的位置
            // coords 是相对于视口的坐标
            // 需要减去容器相对于视口的偏移
            const top = coords.top - containerRect.top + editor.view.dom.scrollTop
            const left = coords.left - containerRect.left

            return {
              cursor,
              top,
              left,
            }
          } catch {
            // 如果位置无效，跳过
            return null
          }
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)

      setCursorPositions(positions)
    }

    // 初始计算
    updatePositions()

    // 监听编辑器滚动和更新
    const handleScroll = () => updatePositions()
    const handleUpdate = () => updatePositions()

    editor.view.dom.addEventListener('scroll', handleScroll)
    editor.on('update', handleUpdate)
    editor.on('selectionUpdate', handleUpdate)

    // 使用 requestAnimationFrame 定期更新位置以应对布局变化
    let rafId: number
    const scheduleUpdate = () => {
      rafId = requestAnimationFrame(() => {
        updatePositions()
        scheduleUpdate()
      })
    }
    scheduleUpdate()

    return () => {
      cancelAnimationFrame(rafId)
      editor.view.dom.removeEventListener('scroll', handleScroll)
      editor.off('update', handleUpdate)
      editor.off('selectionUpdate', handleUpdate)
    }
  }, [editor, remoteCursors])

  if (!editor || cursorPositions.length === 0) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 50 }}
    >
      {cursorPositions.map(({ cursor, top, left }, index) => (
        <div
          key={`${cursor.userId}-${index}`}
          className="absolute"
          style={{
            top: `${top}px`,
            left: `${left}px`,
          }}
        >
          {/* 光标竖线 */}
          <div
            className="absolute h-5 w-0.5"
            style={{
              backgroundColor: cursor.color,
              top: '-2px',
            }}
          />
          {/* 用户名标签 */}
          <div
            className="absolute -top-6 left-0 px-1.5 py-0.5 text-xs font-medium text-white whitespace-nowrap rounded"
            style={{
              backgroundColor: cursor.color,
              fontSize: '11px',
              lineHeight: '1.2',
            }}
          >
            {cursor.userName}
          </div>
        </div>
      ))}
    </div>
  )
}
