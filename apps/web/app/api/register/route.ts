import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@workspace/database"
import bcrypt from "bcryptjs"
import { registerSchema } from "@/lib/validations/auth"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = registerSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors?.[0]?.message ?? "验证失败" },
        { status: 400 }
      )
    }

    const { email, password, name } = validated.data

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 400 }
      )
    }

    // 哈希密码
    const passwordHash = await bcrypt.hash(password, 12)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
      },
    })

    return NextResponse.json({ success: true, userId: user.id })
  } catch (error) {
    console.error("注册失败:", error)
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    )
  }
}
