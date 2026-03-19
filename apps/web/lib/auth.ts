import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@workspace/database"
import bcrypt from "bcryptjs"
import { loginSchema } from "@/lib/validations/auth"
import type { NextAuthConfig } from "next-auth"

const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma) as any,

  providers: [
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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
      }

      // 处理会话更新
      if (trigger === "update" && session) {
        return { ...token, ...session.user }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
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
const { handlers, auth, signIn, signOut } = NextAuth(config) as any

export { handlers, auth, signIn, signOut }
