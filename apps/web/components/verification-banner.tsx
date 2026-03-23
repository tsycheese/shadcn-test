"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { CheckCircle2, Loader2, X } from "lucide-react"

interface VerificationBannerProps {
  onResend?: () => void
}

export function VerificationBanner({ onResend }: VerificationBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isSending, setIsSending] = useState(false)

  const handleResend = async () => {
    if (!onResend) return

    setIsSending(true)
    await onResend()
    setIsSending(false)
  }

  if (!isVisible) return null

  return (
    <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      <AlertTitle className="text-green-800 dark:text-green-300">
        验证邮件已发送到你的邮箱
      </AlertTitle>
      <AlertDescription className="flex items-center gap-2 mt-2">
        <span className="text-green-700 dark:text-green-400">
          请检查邮箱并点击验证链接，以接受文档协作邀请。
        </span>
        <Button
          variant="link"
          className="h-auto p-0 text-green-700 dark:text-green-400 hover:text-green-900"
          onClick={handleResend}
          disabled={isSending}
        >
          {isSending ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              发送中...
            </>
          ) : (
            "重新发送"
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 ml-auto text-green-600 hover:text-green-800"
          onClick={() => setIsVisible(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  )
}
