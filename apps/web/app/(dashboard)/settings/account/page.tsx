import { ChangePasswordForm } from "@/components/settings/change-password-form"

export default function AccountSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">账户安全</h2>
        <p className="text-muted-foreground">
          管理你的密码和登录安全
        </p>
      </div>
      
      <ChangePasswordForm />
    </div>
  )
}
