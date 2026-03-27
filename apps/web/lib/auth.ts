import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@workspace/database"
import bcrypt from "bcryptjs"
import { loginSchema } from "@/lib/validations/auth"
import type { NextAuthConfig } from "next-auth"

// 确保环境变量已加载
if (!process.env.NEXTAUTH_SECRET) {
  console.warn("⚠️ NEXTAUTH_SECRET is not set")
}

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL is not set")
}

if (!process.env.AUTH_GITHUB_ID) {
  console.warn("⚠️ AUTH_GITHUB_ID is not set - GitHub login will be disabled")
}

if (!process.env.AUTH_GITHUB_SECRET) {
  console.warn("⚠️ AUTH_GITHUB_SECRET is not set - GitHub login will be disabled")
}

const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma) as any,

  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",

  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" }
      },
      authorize: async (credentials) => {
        const validated = loginSchema.safeParse(credentials)

        if (!validated.success) {
          throw new Error("邮箱或密码格式错误")
        }

        const { email, password } = validated.data

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() }
        })

        if (!user || !user.passwordHash) {
          throw new Error("邮箱或密码错误")
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash)
        if (!isMatch) {
          throw new Error("邮箱或密码错误")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified?.toISOString() || null,
        }
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 天
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      // GitHub 登录时自动验证邮箱
      if (account?.provider === "github") {
        try {
          // 检查用户是否存在
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email?.toLowerCase() },
          })

          if (existingUser && !existingUser.emailVerified) {
            // 如果是 GitHub 登录，自动标记邮箱为已验证
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { emailVerified: new Date() },
            })
          }
        } catch (error) {
          console.error("GitHub 邮箱验证失败:", error)
        }
      }
      return true
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.emailVerified = user.emailVerified
        token.name = user.name
        token.email = user.email
        token.picture = user.image
      }

      // 处理会话更新 - 从数据库重新获取最新数据
      if (trigger === "update" || session?.user?.emailVerified !== token.emailVerified) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            email: true,
            name: true,
            image: true,
            emailVerified: true,
          },
        })
        if (dbUser) {
          token.emailVerified = dbUser.emailVerified?.toISOString() || null
          token.name = dbUser.name
          token.email = dbUser.email
          token.picture = dbUser.image
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.emailVerified = token.emailVerified as (Date & string) | null
        session.user.name = (token.name as string | null | undefined) ?? session.user.name
        session.user.email = (token.email as string | null | undefined) ?? session.user.email
        session.user.image = (token.picture as string | null | undefined) ?? session.user.image
      }
      return session
    },
  },

  // 安全配置
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { handlers, auth, signIn, signOut, unstable_update } = NextAuth(config) as any

export { handlers, auth, signIn, signOut, unstable_update }
