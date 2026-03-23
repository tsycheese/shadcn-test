import { type DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    emailVerified?: string | null
  }

  interface Session {
    user: {
      emailVerified?: string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    emailVerified?: string | null
  }
}
