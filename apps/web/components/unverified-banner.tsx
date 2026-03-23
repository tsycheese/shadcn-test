"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { AlertCircle, X } from "lucide-react"

const DISMISSED_KEY = "unverifiedBannerDismissed"
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 天

export function UnverifiedBanner() {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY)
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0
    const now = Date.now()

    if (!dismissed || now - dismissedTime > DISMISS_DURATION) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-300">
        你的邮箱尚未验证
      </AlertTitle>
      <AlertDescription className="flex items-center gap-2 mt-2">
        <span className="text-amber-700 dark:text-amber-400">
          验证邮箱后可以接受文档协作邀请、重置密码等。
        </span>
        <Button
          variant="link"
          className="h-auto p-0 text-amber-700 dark:text-amber-400 hover:text-amber-900"
          onClick={() => router.push("/settings/verification")}
        >
          立即验证
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 ml-auto text-amber-600 hover:text-amber-800"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  )
}
