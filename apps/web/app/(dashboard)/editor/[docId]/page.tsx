"use client"

import { EditorContent } from '@tiptap/react'
import { useEditor } from '@/lib/editor'
import { EditorToolbar } from '@/components/editor/editor-toolbar'
import { SyncStatus } from '@/components/editor/sync-status'
import { UserList } from '@/components/editor/user-list'
import { CollaboratorsPanel } from '@/components/editor/collaborators-panel'
import { useEffect, useState, use, useMemo } from 'react'
import { Loader2 } from 'lucide-react'

export default function EditorPage({ params }: { params: Promise<{ docId: string }> }) {
  // 使用 React.use() 解包 params Promise (Next.js 16)
  const { docId } = use(params)

  const [mounted, setMounted] = useState(false)
  const [permissions, setPermissions] = useState<{
    canEdit: boolean
    canInvite: boolean
    canDelete: boolean
    isOwner: boolean
  } | null>(null)
  const [loadingPerms, setLoadingPerms] = useState(true)

  // 固定 userId 和 userColor，避免每次渲染都变化
  const userId = useMemo(() => 'user-' + Math.random().toString(36).slice(2, 9), [])
  const userColor = useMemo(() => '#' + Math.floor(Math.random()*16777215).toString(16), [])

  const { editor, provider, isSynced, isOffline } = useEditor({
    docId: docId,
    userId,
    userName: '匿名用户',
    userColor,
  })

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

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loadingPerms) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>加载编辑器...</p>
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
          <div className="bg-background rounded-lg shadow-sm border min-h-[600px]">
            <EditorContent
              editor={editor}
              className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-6 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="border-t p-2 bg-background text-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SyncStatus synced={isSynced} offline={isOffline} />
            {permissions?.canInvite && (
              <CollaboratorsPanel 
                documentId={docId} 
                canManage={permissions.canInvite} 
              />
            )}
          </div>
          <UserList provider={provider} />
        </div>
      </div>
    </div>
  )
}
