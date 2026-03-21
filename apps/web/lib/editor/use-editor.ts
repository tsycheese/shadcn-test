"use client"

import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useEditor as useTiptap } from '@tiptap/react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'

import type { UseEditorOptions, UseEditorReturn } from './types'

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

  // 缓存协同光标配置，避免每次渲染创建新对象
  // const cursorExtension = useMemo(() => {
  //   if (!provider) return []
    
  //   return [CollaborationCursor.configure({
  //     provider,
  //     user: {
  //       name: userName,
  //       color: userColor
  //     },
  //   })]
  // }, [provider, userName, userColor])

  // 初始化 Yjs 和 Provider
  // 使用 useLayoutEffect 避免 React 18+ 的 setState 警告
  useLayoutEffect(() => {
    const doc = new Y.Doc()

    // 1. 离线持久化 (IndexedDB)
    // 即使用户断网，编辑内容也会保存在浏览器
    const indexeddbProvider = new IndexeddbPersistence(docId, doc)
    indexeddbProvider.on('synced', () => {
      setIsSynced(true)
    })
    indexeddbProvider.on('error', (err: unknown) => {
      console.error('IndexedDB 错误:', err)
    })
    
    // 设置 ydoc
    setYdoc(doc)

    // 清理函数
    return () => {
      // wsProvider?.destroy()
      indexeddbProvider.destroy()
      doc.destroy()
    }
  }, [docId, userId, wsUrl])

  // 创建 Tiptap 编辑器实例
  const editor = useTiptap({
    extensions: ydoc ? [
      // 基础套件：段落、标题、列表、代码块等
      StarterKit.configure({
        // 禁用历史记录，因为 Yjs 有自己的历史管理
        undoRedo: false,
      }),
      // Yjs 协同扩展：同步文档内容
      Collaboration.configure({
        document: ydoc,
      }),
    ] : [
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
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[500px] p-4',
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
