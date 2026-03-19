"use client"

import { Badge } from "@workspace/ui/components/badge"

type Permission = "READ" | "WRITE" | "ADMIN"

interface PermissionBadgeProps {
  permission: Permission
  className?: string
}

const permissionConfig: Record<Permission, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  READ: { label: "只读", variant: "secondary" },
  WRITE: { label: "编辑", variant: "default" },
  ADMIN: { label: "管理员", variant: "destructive" },
}

export function PermissionBadge({ permission, className }: PermissionBadgeProps) {
  const config = permissionConfig[permission]

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
