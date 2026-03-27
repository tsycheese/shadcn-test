import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@workspace/database"
import crypto from "crypto"

export const runtime = "nodejs"

const MAX_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

function getCloudinaryEnv() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return null
  }

  return { cloudName, apiKey, apiSecret }
}

function signCloudinaryParams(
  params: Record<string, string | number>,
  apiSecret: string
) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&")

  return crypto
    .createHash("sha1")
    .update(`${toSign}${apiSecret}`)
    .digest("hex")
}

async function uploadAvatarToCloudinary(file: File, userId: string) {
  const env = getCloudinaryEnv()
  if (!env) {
    throw new Error("Cloudinary 环境变量未配置")
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const publicId = `user-${userId}-${Date.now()}`
  const paramsToSign = {
    folder: "avatars",
    public_id: publicId,
    timestamp,
  }
  const signature = signCloudinaryParams(paramsToSign, env.apiSecret)

  const formData = new FormData()
  formData.append("file", file)
  formData.append("folder", paramsToSign.folder)
  formData.append("public_id", paramsToSign.public_id)
  formData.append("timestamp", String(paramsToSign.timestamp))
  formData.append("api_key", env.apiKey)
  formData.append("signature", signature)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${env.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  )

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || "Cloudinary 上传失败")
  }

  return {
    secureUrl: data.secure_url as string,
    publicId: data.public_id as string,
  }
}

function extractPublicIdFromCloudinaryUrl(
  imageUrl: string,
  cloudName: string
): string | null {
  try {
    const parsed = new URL(imageUrl)
    if (!parsed.hostname.endsWith("res.cloudinary.com")) {
      return null
    }

    const prefix = `/${cloudName}/image/upload/`
    if (!parsed.pathname.startsWith(prefix)) {
      return null
    }

    let value = parsed.pathname.slice(prefix.length)
    value = value.replace(/^v\d+\//, "")
    value = value.replace(/\.[^/.]+$/, "")

    if (!value) {
      return null
    }

    return decodeURIComponent(value)
  } catch {
    return null
  }
}

async function destroyCloudinaryImageByPublicId(publicId: string) {
  const env = getCloudinaryEnv()
  if (!env) return

  const timestamp = Math.floor(Date.now() / 1000)
  const paramsToSign = {
    public_id: publicId,
    timestamp,
  }
  const signature = signCloudinaryParams(paramsToSign, env.apiSecret)

  const formData = new FormData()
  formData.append("public_id", publicId)
  formData.append("timestamp", String(timestamp))
  formData.append("api_key", env.apiKey)
  formData.append("signature", signature)

  await fetch(
    `https://api.cloudinary.com/v1_1/${env.cloudName}/image/destroy`,
    {
      method: "POST",
      body: formData,
    }
  )
}

async function destroyCloudinaryImageByUrl(image: string | null | undefined) {
  if (!image) return
  const env = getCloudinaryEnv()
  if (!env) return

  const publicId = extractPublicIdFromCloudinaryUrl(image, env.cloudName)
  if (!publicId) return

  await destroyCloudinaryImageByPublicId(publicId)
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("avatar")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传头像文件" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "仅支持 JPG/PNG/WEBP/GIF" },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "头像大小不能超过 2MB" },
        { status: 400 }
      )
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    })

    const { secureUrl } = await uploadAvatarToCloudinary(file, session.user.id)

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: secureUrl },
    })

    await destroyCloudinaryImageByUrl(currentUser?.image)

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        image: secureUrl,
      },
    })
  } catch (error) {
    console.error("上传头像失败:", error)
    const message = error instanceof Error ? error.message : "上传头像失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    })

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: null },
    })

    await destroyCloudinaryImageByUrl(currentUser?.image)

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        image: null,
      },
    })
  } catch (error) {
    console.error("删除头像失败:", error)
    return NextResponse.json({ error: "删除头像失败" }, { status: 500 })
  }
}
