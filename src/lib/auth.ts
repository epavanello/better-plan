import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"

import { db } from "@/database/db"
import * as schema from "@/database/schema"
import { getWebRequest } from "@tanstack/react-start/server"
import { reactStartCookies } from "better-auth/react-start"
import { envConfig } from "./env"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: envConfig.DISABLE_SIGNUP
  },
  socialProviders: {
    ...(envConfig.GOOGLE_CLIENT_ID && envConfig.GOOGLE_CLIENT_SECRET ? {
      google: {
        clientId: envConfig.GOOGLE_CLIENT_ID,
        clientSecret: envConfig.GOOGLE_CLIENT_SECRET
      }
    }
      : {}),
  },
  plugins: [organization(), reactStartCookies()]
})

export const getSession = async () => {
  const headers = getWebRequest()?.headers
  if (!headers) {
    throw new Error("No headers")
  }
  const session = await auth.api.getSession({ headers })
  return session
}

export const getSessionOrThrow = async () => {
  const session = await getSession()
  if (!session) {
    throw new Error("No session")
  }
  return session
}
