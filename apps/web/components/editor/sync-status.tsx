"use client"

import { Cloud, CloudOff, CloudCog, Save, Check } from "lucide-react"

interface SyncStatusProps {
  synced: boolean
  offline: boolean
  isSaving?: boolean
  lastSavedAt?: Date | null
}

export function SyncStatus({ synced, offline, isSaving, lastSavedAt }: SyncStatusProps) {
  // 格式化保存时间
  const formatSavedTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)

    if (seconds < 60) return `${seconds}秒前`
    if (minutes < 60) return `${minutes}分钟前`
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
  }

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

  // 显示保存状态
  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-600">
        <Save className="h-4 w-4 animate-pulse" />
        <span>保存中...</span>
      </div>
    )
  }

  if (lastSavedAt) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Check className="h-4 w-4" />
        <span>已保存 {formatSavedTime(lastSavedAt)}</span>
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
