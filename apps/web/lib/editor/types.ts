import type { Editor } from '@tiptap/react'
import type { WebsocketProvider } from 'y-websocket'
import type * as Y from 'yjs'

export interface UseEditorOptions {
  /** 文档 ID */
  docId: string
  /** 用户 ID */
  userId: string
  /** 用户名（可选） */
  userName?: string
  /** 用户光标颜色（可选） */
  userColor?: string
  /** WebSocket 服务器地址 */
  wsUrl?: string
  /** 是否从数据库加载内容 */
  loadContentFromDb?: boolean
}

export interface UseEditorReturn {
  /** Tiptap 编辑器实例 */
  editor: Editor | null
  /** WebSocket Provider */
  provider: WebsocketProvider | null
  /** Yjs 文档 */
  ydoc: Y.Doc | null
  /** 是否已同步 */
  isSynced: boolean
  /** 是否离线模式 */
  isOffline: boolean
}
