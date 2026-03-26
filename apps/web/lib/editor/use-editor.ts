"use client"

import { useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { useEditor as useTiptap } from '@tiptap/react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import SlashCommand from './extensions/slash-command'
import { createSlashCommandRender } from './extensions/slash-command-render'
import { filterCommands, type CommandItem } from '@/components/editor/slash-command/slash-command-list'

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
 * 4. 从数据库加载初始内容
 * 5. 创建 Tiptap 编辑器实例
 */
export function useEditor({
  docId,
  userId,
  userName = '匿名用户',
  userColor = '#958DF1',
  wsUrl = process.env.NEXT_PUBLIC_WS_URL,
  loadContentFromDb = true, // 是否从数据库加载内容
  autoSaveToDb = true, // 是否自动保存到数据库
  autoSaveInterval = 5000, // 自动保存间隔（毫秒）
}: UseEditorOptions): UseEditorReturn {
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null)
  const [isSynced, setIsSynced] = useState(false)
  const [isDbLoaded, setIsDbLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  // 保存 Yjs 文档到数据库
  const saveToDatabase = useCallback(async (doc: Y.Doc) => {
    if (!autoSaveToDb) return

    setIsSaving(true)
    try {
      // 获取 Yjs 文档的二进制更新
      const update = Y.encodeStateAsUpdate(doc)
      const content = Buffer.from(update).toString('base64')

      const res = await fetch(`/api/documents/${docId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (res.ok) {
        setLastSavedAt(new Date())
        console.log('文档已保存到数据库')
      } else {
        console.error('保存失败:', await res.text())
      }
    } catch (error) {
      console.error('保存文档失败:', error)
    } finally {
      setIsSaving(false)
    }
  }, [docId, autoSaveToDb])

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

    // 3. 从数据库加载内容（如果有）
    async function loadContent() {
      if (!loadContentFromDb) {
        setYdoc(doc)
        setIsDbLoaded(true)
        return
      }

      try {
        const res = await fetch(`/api/documents/${docId}/content`)
        if (res.ok) {
          const data = await res.json()
          if (data.content) {
            // 将 base64 转换回 Buffer 并应用到 Yjs 文档
            const contentBuffer = Buffer.from(data.content, 'base64')
            const update = new Uint8Array(contentBuffer)
            Y.applyUpdate(doc, update)
            console.log('已从数据库加载文档内容')
          }
        }
      } catch (error) {
        console.error('加载数据库内容失败:', error)
      }

      setYdoc(doc)
      setIsDbLoaded(true)
    }

    loadContent()

    // 清理函数
    return () => {
      wsProvider?.destroy()
      indexeddbProvider.destroy()
      doc.destroy()
    }
  }, [docId, userId, userName, userColor, wsUrl, loadContentFromDb])

  // 4. 自动保存：监听 Yjs 文档变化，debounce 后保存
  useEffect(() => {
    if (!autoSaveToDb || !ydoc) return

    let saveTimeout: NodeJS.Timeout | null = null

    // 监听文档更新
    const updateHandler = () => {
      // 清除之前的定时器
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }

      // 设置新的定时器（debounce）
      saveTimeout = setTimeout(() => {
        saveToDatabase(ydoc)
      }, autoSaveInterval)
    }

    // 监听 Yjs 文档的 update 事件
    ydoc.on('update', updateHandler)

    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
      ydoc.off('update', updateHandler)
    }
  }, [ydoc, autoSaveToDb, autoSaveInterval, saveToDatabase])

  // 5. 页面关闭/离开时强制保存
  useEffect(() => {
    if (!autoSaveToDb || !ydoc) return

    const handleBeforeUnload = async () => {
      // 同步保存（使用 sendBeacon 或同步请求）
      try {
        const update = Y.encodeStateAsUpdate(ydoc)
        const content = Buffer.from(update).toString('base64')

        // 使用 sendBeacon 发送（浏览器会在页面卸载前发送）
        const blob = new Blob([JSON.stringify({ content })], {
          type: 'application/json',
        })
        navigator.sendBeacon(`/api/documents/${docId}/save`, blob)
        console.log('页面关闭前已保存文档')
      } catch (error) {
        console.error('页面关闭前保存失败:', error)
      }
    }

    // 监听页面关闭事件
    window.addEventListener('beforeunload', handleBeforeUnload)

    // 监听页面隐藏（切换到其他标签页）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleBeforeUnload()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [ydoc, docId, autoSaveToDb])

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
          // Slash Command 命令菜单
          SlashCommand.configure({
            suggestion: {
              char: '/',
              items: ({ query }) => {
                return filterCommands(query)
              },
              render: () => {
                const slashCommandRender = createSlashCommandRender()
                return {
                  onStart: (props) => {
                    if (!props.clientRect) return
                    slashCommandRender.onStart({
                      editor: props.editor,
                      clientRect: props.clientRect,
                      command: (item: CommandItem) => {
                        item.command({ editor: props.editor, range: props.range })
                      },
                      items: (props.items as CommandItem[]) || [],
                    })
                  },
                  onUpdate: (props) => {
                    if (!props.clientRect) return
                    slashCommandRender.onUpdate({
                      editor: props.editor,
                      clientRect: props.clientRect,
                      command: (item: CommandItem) => {
                        item.command({ editor: props.editor, range: props.range })
                      },
                      items: (props.items as CommandItem[]) || [],
                    })
                  },
                  onKeyDown: (props) => {
                    return slashCommandRender.onKeyDown(props)
                  },
                  onExit: () => {
                    slashCommandRender.onExit()
                  },
                }
              },
            },
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
    isSaving,
    lastSavedAt,
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
