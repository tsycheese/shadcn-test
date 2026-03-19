"use client"

import { useState } from "react"
import { CollaboratorsList } from "./collaborators-list"
import { Button } from "@workspace/ui/components/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@workspace/ui/components/sheet"
import { Users } from "lucide-react"

interface CollaboratorsPanelProps {
  documentId: string
  canManage: boolean
}

export function CollaboratorsPanel({ documentId, canManage }: CollaboratorsPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          协作者
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto p-6">
        <SheetHeader className="mb-6">
          <SheetTitle>协作者管理</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4">
          {!canManage && (
            <div className="p-4 bg-muted rounded-lg text-sm">
              <p>您没有管理权限，只能查看协作者列表。</p>
            </div>
          )}
          <CollaboratorsList 
            documentId={documentId} 
            canManage={canManage} 
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
