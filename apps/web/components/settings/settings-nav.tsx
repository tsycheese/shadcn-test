"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Lock, Mail, Trash2 } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

const navItems = [
  { href: "/settings/profile", label: "个人资料", icon: User },
  { href: "/settings/account", label: "账户安全", icon: Lock },
  { href: "/settings/verification", label: "邮箱验证", icon: Mail },
  { href: "/settings/danger", label: "危险区域", icon: Trash2 },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname?.startsWith(item.href)
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
