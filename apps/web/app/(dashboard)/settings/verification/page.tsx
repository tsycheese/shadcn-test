import { EmailVerificationForm } from "@/components/settings/email-verification-form"

export default function VerificationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">邮箱验证</h2>
        <p className="text-muted-foreground">
          验证你的邮箱地址以确保账户安全
        </p>
      </div>

      <EmailVerificationForm />
    </div>
  )
}
