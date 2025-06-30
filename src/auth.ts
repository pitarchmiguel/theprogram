import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { verifyCredentials, getUserById, type User } from "@/lib/auth"

export const { auth, handlers } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        try {
          const user = await verifyCredentials(credentials.username, credentials.password)
          
          if (user) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              username: user.username,
              role: user.role,
            }
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  events: {
    async signIn({ user }) {
      console.log('User signed in:', user.username)
    },
    async signOut() {
      console.log('User signed out')
    }
  }
}) 