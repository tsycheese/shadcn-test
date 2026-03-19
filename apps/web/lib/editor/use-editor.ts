"use client"

import { useEffect, useState } from 'react'
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

  // 初始化 Yjs 和 Provider
  useEffect(() => {
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

    // 2. WebSocket 协同
    let wsProvider: WebsocketProvider | null = null
    if (wsUrl) {
      wsProvider = new WebsocketProvider(wsUrl, docId, doc)
      
      // 设置用户感知信息（用于显示其他用户的光标）
      wsProvider.awareness.setLocalStateField('user', {
        id: userId,
        name: userName,
        color: userColor
      })

      // 监听连接状态
      wsProvider.on('status', (event) => {
        console.log('WebSocket 状态:', event.status)
      })

      setProvider(wsProvider)
    }

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
    extensions: [
      // 基础套件：段落、标题、列表、代码块等
      StarterKit.configure({
        // 禁用历史记录，因为 Yjs 有自己的历史管理
      }),
      // Yjs 协同扩展：同步文档内容
      Collaboration.configure({
        document: ydoc,
        field: 'content', // Yjs 字段名
      }),
      // 协同光标扩展：显示其他用户的光标
      CollaborationCursor.configure({
        provider,
        user: {
          name: userName,
          color: userColor
        },
        // 光标渲染配置
        render: (user) => {
          const cursor = document.createElement('span')
          cursor.classList.add('collaboration-cursor')
          cursor.style.borderColor = user.color
          
          const label = document.createElement('div')
          label.classList.add('collaboration-cursor-label')
          label.style.backgroundColor = user.color
          label.textContent = user.name
          
          cursor.appendChild(label)
          return cursor
        }
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
  })

  return {
    editor,
    provider,
    ydoc,
    isSynced,
    isOffline: !provider?.wsconnected,
  }
}
