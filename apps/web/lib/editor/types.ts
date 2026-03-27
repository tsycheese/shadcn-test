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
  /** 用户头像（可选） */
  userImage?: string | null
  /** WebSocket 服务器地址 */
  wsUrl?: string
  /** 是否从数据库加载内容 */
  loadContentFromDb?: boolean
  /** 是否自动保存到数据库 */
  autoSaveToDb?: boolean
  /** 自动保存间隔（毫秒） */
  autoSaveInterval?: number
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
  /** 是否正在保存 */
  isSaving?: boolean
  /** 上次保存时间 */
  lastSavedAt?: Date | null
}

export type { CommandItem } from '@/components/editor/slash-command/slash-command-list'
