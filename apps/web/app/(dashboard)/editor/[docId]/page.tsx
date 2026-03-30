"use client"

import { use, useEffect, useId, useMemo, useState } from "react"
import { EditorContent } from "@tiptap/react"
import { ListTree, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useSession } from "next-auth/react"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { cn } from "@workspace/ui/lib/utils"
import { TocPanel } from "@/components/editor/toc-panel"
import { CollaboratorsPanel } from "@/components/editor/collaborators-panel"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import { RemoteCursors } from "@/components/editor/remote-cursors"
import { SyncStatus } from "@/components/editor/sync-status"
import { UserList } from "@/components/editor/user-list"
import { EditorSkeleton } from "./editor-skeleton"
import { EDITOR_VIEWPORT_CLASS } from "@/lib/editor/layout"
import type { TocItem } from "@/lib/editor/toc"
import { useCollaborationCursor, useEditor } from "@/lib/editor/use-editor"
import { useToc } from "@/lib/editor/use-toc"
import "@/styles/editor.css"

const roleLabels: Record<string, string> = {
  ADMIN: "\u7ba1\u7406\u5458",
  WRITE: "\u7f16\u8f91\u8005",
  READ: "\u8bbf\u5ba2",
}
const DESKTOP_TOC_COLLAPSED_KEY = "editor.desktop_toc_collapsed"

function getColorFromSeed(seedText: string): string {
  let hash = 0

  for (let i = 0; i < seedText.length; i += 1) {
    hash = (hash << 5) - hash + seedText.charCodeAt(i)
    hash |= 0
  }

  const safeColor = Math.abs(hash) % 0xffffff
  return `#${safeColor.toString(16).padStart(6, "0")}`
}

export default function EditorPage({
  params,
}: {
  params: Promise<{ docId: string }>
}) {
  const { docId } = use(params)
  const { data: session } = useSession()
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false)
  const [isDesktopTocCollapsed, setIsDesktopTocCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(DESKTOP_TOC_COLLAPSED_KEY) === "1"
  })
  const fallbackUserId = useId().replaceAll(":", "")

  const [permissions, setPermissions] = useState<{
    canEdit: boolean
    canInvite: boolean
    canDelete: boolean
    isOwner: boolean
    permission: "ADMIN" | "WRITE" | "READ"
  } | null>(null)
  const [loadingPerms, setLoadingPerms] = useState(true)

  const userId = session?.user?.id || `guest-${fallbackUserId}`
  const userColor = useMemo(() => getColorFromSeed(userId), [userId])

  const userName = useMemo(() => {
    if (!permissions?.permission) return "\u8bbf\u5ba2"

    const role = roleLabels[permissions.permission] || "\u8bbf\u5ba2"
    const baseName =
      session?.user?.name ||
      session?.user?.email?.split("@")[0] ||
      "\u533f\u540d\u7528\u6237"

    return `[${role}] ${baseName}`
  }, [permissions, session?.user?.email, session?.user?.name])

  const { editor, provider, isSynced, isOffline, ydoc, isSaving, lastSavedAt } =
    useEditor({
      docId,
      userId,
      userName,
      userColor,
      userImage: session?.user?.image ?? null,
    })

  const { remoteCursors } = useCollaborationCursor(
    provider?.awareness,
    userId,
    userName,
    userColor,
    editor
  )

  const {
    toc,
    collapsedIds,
    activeTocId,
    toggleCollapsed,
    expandAll,
    collapseAll,
    jumpToHeading,
  } = useToc(editor)

  useEffect(() => {
    fetch(`/api/documents/${docId}/permissions`)
      .then((res) => {
        if (!res.ok) throw new Error("\u65e0\u6743\u8bbf\u95ee")
        return res.json()
      })
      .then((data) => {
        setPermissions({
          canEdit: data.canEdit,
          canInvite: data.canInvite,
          canDelete: data.canDelete,
          isOwner: data.isOwner,
          permission: data.permission,
        })
        setLoadingPerms(false)
      })
      .catch(() => {
        setLoadingPerms(false)
      })
  }, [docId])

  useEffect(() => {
    window.localStorage.setItem(
      DESKTOP_TOC_COLLAPSED_KEY,
      isDesktopTocCollapsed ? "1" : "0"
    )
  }, [isDesktopTocCollapsed])

  const handleJumpHeading = (item: TocItem) => {
    jumpToHeading(item)
    setIsMobileTocOpen(false)
  }

  if (loadingPerms || !ydoc || !editor) {
    return <EditorSkeleton />
  }

  return (
    <div className={`flex min-h-0 flex-col ${EDITOR_VIEWPORT_CLASS}`}>
      <EditorToolbar editor={editor} />

      <div className="min-h-0 flex-1 bg-muted/20">
        <div className="flex h-full w-full">
          <aside
            className={cn(
              "hidden h-full shrink-0 border-r bg-background transition-[width] duration-200 md:block",
              isDesktopTocCollapsed ? "w-11" : "w-[260px]"
            )}
          >
            {isDesktopTocCollapsed ? (
              <div className="flex h-full items-start justify-center pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={"\u5c55\u5f00\u76ee\u5f55\u4fa7\u680f"}
                  onClick={() => setIsDesktopTocCollapsed(false)}
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <TocPanel
                className="h-full"
                toc={toc}
                collapsedIds={collapsedIds}
                activeId={activeTocId}
                onToggle={toggleCollapsed}
                onJump={handleJumpHeading}
                onExpandAll={expandAll}
                onCollapseAll={collapseAll}
                headerAction={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={"\u6298\u53e0\u76ee\u5f55\u4fa7\u680f"}
                    onClick={() => setIsDesktopTocCollapsed(true)}
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                }
              />
            )}
          </aside>

          <div className="min-h-0 flex-1 overflow-auto">
            <div className="px-4 pt-4 md:hidden">
              <Sheet open={isMobileTocOpen} onOpenChange={setIsMobileTocOpen}>
                <SheetTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <ListTree className="mr-1 h-4 w-4" />
                    {"\u76ee\u5f55"}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0 pt-12">
                  <SheetHeader className="sr-only">
                    <SheetTitle>{"\u76ee\u5f55"}</SheetTitle>
                  </SheetHeader>
                  <TocPanel
                    className="h-full"
                    toc={toc}
                    collapsedIds={collapsedIds}
                    activeId={activeTocId}
                    onToggle={toggleCollapsed}
                    onJump={handleJumpHeading}
                    onExpandAll={expandAll}
                    onCollapseAll={collapseAll}
                  />
                </SheetContent>
              </Sheet>
            </div>

            <div className="mx-auto w-full max-w-4xl px-4 py-8">
              <div className="relative min-h-[600px] rounded-lg border bg-background shadow-sm">
                <EditorContent
                  editor={editor}
                  className="tiptap max-w-none p-6 focus:outline-none"
                />
                <RemoteCursors editor={editor} remoteCursors={remoteCursors} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t bg-background p-2 text-xs">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <SyncStatus
              synced={isSynced}
              offline={isOffline}
              isSaving={isSaving}
              lastSavedAt={lastSavedAt}
            />
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
