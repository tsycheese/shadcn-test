"use client"

import { useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { useEditor as useTiptap } from '@tiptap/react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'

import type { UseEditorOptions, UseEditorReturn } from './types'
import type { Awareness } from 'y-protocols/awareness'

/** 远程用户光标位置 */
export interface RemoteCursor {
  userId: string
  userName: string
  color: string
  position: number | null
  selection: {
    anchor: number
    head: number
  } | null
}

/**
 * 富文本协同编辑器 Hook
 *
 * 功能：
 * 1. 创建 Yjs 文档
 * 2. 连接 WebSocket 协同服务
 * 3. 启用 IndexedDB 离线持久化
 * 4. 创建 Tiptap 编辑器实例
 */
export function useEditor({
  docId,
  userId,
  userName = '匿名用户',
  userColor = '#958DF1',
  wsUrl = process.env.NEXT_PUBLIC_WS_URL,
}: UseEditorOptions): UseEditorReturn {
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null)
  const [isSynced, setIsSynced] = useState(false)

  // 初始化 Yjs 和 Provider
  // 使用 useLayoutEffect 避免 React 18+ 的 setState 警告
  useLayoutEffect(() => {
    const doc = new Y.Doc()
    let wsProvider: WebsocketProvider | null = null

    // 1. 离线持久化 (IndexedDB)
    // 即使用户断网，编辑内容也会保存在浏览器
    const indexeddbProvider = new IndexeddbPersistence(docId, doc)
    indexeddbProvider.on('synced', () => {
      setIsSynced(true)
    })
    indexeddbProvider.on('error', (err: unknown) => {
      console.error('IndexedDB 错误:', err)
    })

    // 2. WebSocket 协同服务
    if (wsUrl) {
      wsProvider = new WebsocketProvider(wsUrl, docId, doc, {
        connect: true,
      })

      wsProvider.on('status', (event: { status: string }) => {
        console.log('WebSocket 状态:', event.status)
      })

      setProvider(wsProvider)

      // 设置 Awareness 用户信息
      wsProvider.awareness.setLocalStateField('user', {
        id: userId,
        name: userName,
        color: userColor,
      })
    } else {
      setProvider(null)
    }

    // 设置 ydoc
    setYdoc(doc)

    // 清理函数
    return () => {
      wsProvider?.destroy()
      indexeddbProvider.destroy()
      doc.destroy()
    }
  }, [docId, userId, userName, userColor, wsUrl])

  // 创建 Tiptap 编辑器实例
  const editor = useTiptap({
    extensions: ydoc
      ? [
          // 基础套件：段落、标题、列表、代码块等
          StarterKit.configure({
            // 禁用历史记录，因为 Yjs 有自己的历史管理
            undoRedo: false,
          }),
          // Yjs 协同扩展：同步文档内容
          Collaboration.configure({
            document: ydoc,
          }),
        ]
      : [
          StarterKit.configure({
            undoRedo: false,
          }),
        ],
    // 编辑器可编辑
    editable: true,
    // 避免 SSR 不匹配
    immediatelyRender: false,
    // 编辑器样式
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none min-h-[500px]',
      },
    },
  }, [ydoc])

  return {
    editor,
    provider,
    ydoc,
    isSynced,
    isOffline: !provider?.wsconnected,
  }
}

/**
 * 协同光标管理 Hook
 * 用于广播本地光标位置和订阅远程用户光标
 */
export function useCollaborationCursor(
  awareness: Awareness | null | undefined,
  userId: string,
  userName: string,
  userColor: string,
  editor: UseEditorReturn['editor']
) {
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([])

  // 广播本地光标位置
  const updateCursorPosition = useCallback(
    (position: number | null, anchor: number | null, head: number | null) => {
      if (!awareness) return

      awareness.setLocalStateField('cursor', {
        userId,
        userName,
        color: userColor,
        position,
        selection: anchor !== null && head !== null ? { anchor, head } : null,
      })
    },
    [awareness, userId, userName, userColor]
  )

  // 订阅远程光标变化
  useEffect(() => {
    if (!awareness) return

    const updateCursors = () => {
      const states = awareness.getStates()
      const cursors: RemoteCursor[] = []

      states.forEach((state, clientId) => {
        // 跳过自己
        if (state.user?.id === userId) return

        const cursor = state.cursor as RemoteCursor | undefined
        if (cursor && cursor.userId) {
          cursors.push({
            userId: cursor.userId,
            userName: cursor.userName || '匿名用户',
            color: cursor.color || '#958DF1',
            position: cursor.position ?? null,
            selection: cursor.selection ?? null,
          })
        }
      })

      setRemoteCursors(cursors)
    }

    // 初始获取
    updateCursors()

    // 订阅变化
    awareness.on('change', updateCursors)

    return () => {
      awareness.off('change', updateCursors)
    }
  }, [awareness, userId])

  // 监听编辑器选区变化
  useEffect(() => {
    if (!editor || !awareness) return

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection
      updateCursorPosition(from, from, to)
    }

    editor.on('selectionUpdate', handleSelectionUpdate)

    // 清理时清除光标
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
      awareness.setLocalStateField('cursor', null)
    }
  }, [editor, awareness, updateCursorPosition])

  return {
    remoteCursors,
    updateCursorPosition,
  }
}
