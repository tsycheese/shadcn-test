"use client"

import { EditorContent } from '@tiptap/react'
import { useEditor, useCollaborationCursor } from '@/lib/editor/use-editor'
import { EditorToolbar } from '@/components/editor/editor-toolbar'
import { SyncStatus } from '@/components/editor/sync-status'
import { UserList } from '@/components/editor/user-list'
import { CollaboratorsPanel } from '@/components/editor/collaborators-panel'
import { RemoteCursors } from '@/components/editor/remote-cursors'
import { useEffect, useState, use, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import '@/styles/editor.css'

export default function EditorPage({ params }: { params: Promise<{ docId: string }> }) {
  // 使用 React.use() 解包 params Promise (Next.js 16)
  const { docId } = use(params)

  const [permissions, setPermissions] = useState<{
    canEdit: boolean
    canInvite: boolean
    canDelete: boolean
    isOwner: boolean
  } | null>(null)
  const [loadingPerms, setLoadingPerms] = useState(true)

  // 固定 userId 和 userColor，避免每次渲染都变化
  const userId = useMemo(() => 'user-' + Math.random().toString(36).slice(2, 9), [])
  const userName = useMemo(() => '用户-' + Math.random().toString(36).slice(2, 5), [])
  const userColor = useMemo(() => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'), [])

  const { editor, provider, isSynced, isOffline, ydoc } = useEditor({
    docId: docId,
    userId,
    userName,
    userColor,
  })

  // 使用协同光标 Hook
  const { remoteCursors } = useCollaborationCursor(
    provider?.awareness,
    userId,
    userName,
    userColor,
    editor
  )

  // 加载权限信息
  useEffect(() => {
    fetch(`/api/documents/${docId}/permissions`)
      .then((res) => {
        if (!res.ok) throw new Error('无权访问')
        return res.json()
      })
      .then((data) => {
        setPermissions({
          canEdit: data.canEdit,
          canInvite: data.canInvite,
          canDelete: data.canDelete,
          isOwner: data.isOwner,
        })
        setLoadingPerms(false)
      })
      .catch(() => {
        setLoadingPerms(false)
      })
  }, [docId])

  // 等待 ydoc 和编辑器都准备好后再渲染
  if (loadingPerms || !ydoc || !editor) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* 顶部工具栏 */}
      <EditorToolbar editor={editor} />

      {/* 编辑器内容区域 */}
      <div className="flex-1 overflow-auto bg-muted/20">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="bg-background rounded-lg shadow-sm border min-h-[600px] relative">
            <EditorContent
              editor={editor}
              className="tiptap max-w-none p-6 focus:outline-none"
            />
            {/* 远程光标渲染层 */}
            <RemoteCursors editor={editor} remoteCursors={remoteCursors} />
          </div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="border-t p-2 bg-background text-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SyncStatus synced={isSynced} offline={isOffline} />
            <CollaboratorsPanel
              documentId={docId}
              canManage={permissions?.canInvite ?? false}
            />
          </div>
          <UserList provider={provider} />
        </div>
      </div>
    </div>
  )
}
