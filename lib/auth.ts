import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"

import { db } from "@/database/db"
import * as schema from "@/database/schema"
import { getWebRequest } from "@tanstack/react-start/server"
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
    plugins: [organization()]
})

export const getSessionOrThrow = async () => {
    const headers = getWebRequest()?.headers
    if (!headers) {
        throw new Error("No headers")
    }
    const session = await auth.api.getSession({
        query: {
            disableCookieCache: true
        },
        headers
    })

    if (!session?.user.id) {
        throw new Error("User not authenticated")
    }

    return session
}
