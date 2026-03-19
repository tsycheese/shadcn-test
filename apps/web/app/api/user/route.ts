import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@workspace/database"
import bcrypt from "bcryptjs"

// GET: 获取当前用户信息
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("获取用户信息失败:", error)
    return NextResponse.json(
      { error: "获取用户信息失败" },
      { status: 500 }
    )
  }
}

// PUT: 更新用户信息
export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await req.json()
    const { name, email } = body

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
    })

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      }
    })
  } catch (error) {
    console.error("更新用户信息失败:", error)
    return NextResponse.json(
      { error: "更新用户信息失败" },
      { status: 500 }
    )
  }
}

// DELETE: 删除账户
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await req.json()
    const { password } = body

    // 获取用户
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 400 }
      )
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return NextResponse.json(
        { error: "密码错误" },
        { status: 400 }
      )
    }

    // 删除用户（包括相关文档）
    await prisma.user.delete({
      where: { id: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("删除账户失败:", error)
    return NextResponse.json(
      { error: "删除账户失败" },
      { status: 500 }
    )
  }
}
