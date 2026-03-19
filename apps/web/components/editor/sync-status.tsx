"use client"

import { Cloud, CloudOff, CloudCog } from "lucide-react"

interface SyncStatusProps {
  synced: boolean
  offline: boolean
}

export function SyncStatus({ synced, offline }: SyncStatusProps) {
  if (offline) {
    return (
      <div className="flex items-center gap-2 text-sm text-orange-600">
        <CloudOff className="h-4 w-4" />
        <span>离线模式</span>
      </div>
    )
  }

  if (!synced) {
    return (
      <div className="flex items-center gap-2 text-sm text-yellow-600">
        <CloudCog className="h-4 w-4 animate-spin" />
        <span>同步中...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <Cloud className="h-4 w-4" />
      <span>已同步</span>
    </div>
  )
}
