import { Suspense } from "react"
import { VerifyEmailContent } from "./verify-email-content"

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-muted/50">
        <div className="text-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
