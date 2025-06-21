import { createServerFn } from "@tanstack/react-start"
import { setCookie } from "@tanstack/react-start/server"
import { TwitterApi } from "twitter-api-v2"

export const startXAuthorization = createServerFn({ method: "POST" }).handler(async () => {
    const client = new TwitterApi({
        appKey: process.env.X_CLIENT_ID!,
        appSecret: process.env.X_CLIENT_SECRET!
    })

    const callbackUrl = `${process.env.APP_URL}/api/auth/x/callback`

    const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink(callbackUrl, {
        authAccessType: "write",
        linkMode: "authenticate"
    })

    setCookie("x_oauth_token", JSON.stringify({ oauth_token, oauth_token_secret }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 15 // 15 minutes
    })

    return {
        url
    }
})
