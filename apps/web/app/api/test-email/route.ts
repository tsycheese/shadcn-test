import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/mail"

/**
 * POST /api/test-email
 * 测试邮件发送功能
 */
export async function POST(req: NextRequest) {

  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "请提供测试邮箱" },
        { status: 400 }
      )
    }

    // 发送测试邮件
    const result = await sendEmail({
      to: email,
      subject: "🧪 Collab Editor 邮件测试",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">邮件测试成功！🎉</h2>
          <p style="color: #666;">
            如果你收到这封邮件，说明邮件服务配置正确。
          </p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0066cc; margin-top: 0;">测试信息</h3>
            <p><strong>收件人：</strong> ${email}</p>
            <p><strong>发送时间：</strong> ${new Date().toLocaleString("zh-CN")}</p>
            <p><strong>邮件服务：</strong> Resend</p>
          </div>
          
          <p style="color: #999; font-size: 14px;">
            这是一封测试邮件，可以安全忽略。
          </p>
        </div>
      `,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "邮件发送成功，请检查邮箱",
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: "邮件发送失败",
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error("测试邮件失败:", error)
    return NextResponse.json({
      error: error.message || "测试失败",
      message: "邮件发送失败",
    }, { status: 500 })
  }
}
