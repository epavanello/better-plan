import { createServerFn } from "@tanstack/react-start"
import { setCookie } from "@tanstack/react-start/server"
import { TwitterApi } from "twitter-api-v2"
import { envConfig } from "@/lib/env"

export const startXAuthorization = createServerFn({ method: "POST" }).handler(async () => {
    if (!envConfig.X_CLIENT_ID || !envConfig.X_CLIENT_SECRET) {
        throw new Error("X client ID or secret not set")
    }

    const client = new TwitterApi({
        appKey: envConfig.X_CLIENT_ID,
        appSecret: envConfig.X_CLIENT_SECRET
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
