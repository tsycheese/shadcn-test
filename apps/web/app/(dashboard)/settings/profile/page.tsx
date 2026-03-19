import { ProfileForm } from "@/components/settings/profile-form"

export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">个人资料</h2>
        <p className="text-muted-foreground">
          管理你的个人信息和显示设置
        </p>
      </div>
      
      <ProfileForm />
    </div>
  )
}
