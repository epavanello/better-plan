import { getSessionOrThrow } from "@/lib/auth"
import { envConfig } from "@/lib/env"
import { getEffectiveCredentials } from "@/lib/server/integrations"
import { createServerFn } from "@tanstack/react-start"
import { setCookie } from "@tanstack/react-start/server"
import { TwitterApi } from "twitter-api-v2"

export const startXAuthorization = createServerFn({ method: "POST" }).handler(async () => {
    const session = await getSessionOrThrow()

    const credentials = await getEffectiveCredentials("x", session.user.id)

    if (!credentials || !credentials.clientId || !credentials.clientSecret) {
        throw new Error("X credentials not configured. Please set up your X app credentials first.")
    }

    const client = new TwitterApi({
        appKey: credentials.clientId,
        appSecret: credentials.clientSecret
    })

    const callbackUrl = `${envConfig.APP_URL}/api/auth/x/callback`

    const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink(callbackUrl, {
        authAccessType: "write",
        linkMode: "authenticate"
    })

    setCookie("x_oauth_token", JSON.stringify({ oauth_token, oauth_token_secret }), {
        httpOnly: true,
        secure: envConfig.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 15 // 15 minutes
    })

    return {
        url
    }
})
