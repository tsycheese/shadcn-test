"use client"

import { VerificationBanner } from "./verification-banner"
import { UnverifiedBanner } from "./unverified-banner"

interface DashboardBannersProps {
  showVerifiedReminder: boolean
  isEmailVerified: boolean
}

export function DashboardBanners({
  showVerifiedReminder,
  isEmailVerified,
}: DashboardBannersProps) {
  return (
    <div className="mb-6 space-y-4">
      {/* 注册后显示验证提示 */}
      {showVerifiedReminder && <VerificationBanner />}

      {/* 未验证用户提示（只显示一次，7 天内不再显示） */}
      {!isEmailVerified && !showVerifiedReminder && <UnverifiedBanner />}
    </div>
  )
}
