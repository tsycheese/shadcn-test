import { DeleteAccountForm } from "@/components/settings/delete-account-form"

export default function DangerSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-destructive">危险区域</h2>
        <p className="text-muted-foreground">
          这些操作不可逆，请谨慎操作
        </p>
      </div>
      
      <DeleteAccountForm />
    </div>
  )
}
