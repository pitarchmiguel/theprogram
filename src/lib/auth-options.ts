import CredentialsProvider from "next-auth/providers/credentials"
import type { Session, User as NextAuthUser } from "next-auth"
import type { JWT } from "next-auth/jwt"
import { verifyCredentials } from "@/lib/auth"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authOptions: any = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Usuario", type: "text", placeholder: "usuario" },
        password: { label: "Contraseña", type: "password", placeholder: "contraseña" }
      },
      async authorize(credentials: Partial<Record<string, unknown>> | undefined) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!username || !password) {
          return null
        }
        try {
          const user = await verifyCredentials(username, password)
          if (user) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              username: user.username,
              role: user.role,
            } as NextAuthUser
          }
          return null
        } catch (error) {
          console.error('Error in authorize:', error)
          return null
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: { token: JWT, user?: any }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.role = user.role
      }
      return token
    },
    async session({ session, token }: { session: Session, token: JWT }) {
      if (token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).id = token.id as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).username = token.username as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = token.role as string
      }
      return session
    }
  },
  events: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ user }: { user: any }) {
      console.log('User signed in:', user.username)
    },
    async signOut() {
      console.log('User signed out')
    }
  }
} 