import { db } from "@/database/db"
import { integrations } from "@/database/schema"
import { auth } from "@/lib/auth"
import { createAPIFileRoute } from "@tanstack/react-start/api"
import { redirect } from "@tanstack/react-router"
import { getCookie, setCookie, setHeader } from "@tanstack/react-start/server"
import { TwitterApi } from "twitter-api-v2"
import { ulid } from "ulid"

export const APIRoute = createAPIFileRoute("/api/auth/x/callback")({
    GET: async ({ request }) => {
        const url = new URL(request.url)
        const oauthToken = url.searchParams.get("oauth_token")
        const oauthVerifier = url.searchParams.get("oauth_verifier")
        const temporaryToken = getCookie("x_oauth_token")

        if (!oauthToken || !oauthVerifier || !temporaryToken) {
            return new Response("Invalid request", { status: 400 })
        }

        const { oauth_token, oauth_token_secret } = JSON.parse(temporaryToken)

        if (oauth_token !== oauthToken) {
            return new Response("Invalid oauth_token", { status: 400 })
        }

        // Get our app's user session
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session?.user) {
            // This should not happen if the user started the flow from the app
            return new Response("Unauthorized", { status: 401 })
        }

        const client = new TwitterApi({
            appKey: process.env.X_CLIENT_ID!,
            appSecret: process.env.X_CLIENT_SECRET!,
            accessToken: oauth_token,
            accessSecret: oauth_token_secret
        })

        const {
            client: loggedClient,
            accessToken,
            accessSecret
        } = await client.login(oauthVerifier)

        const {
            data: { id: platformAccountId, name, username: platformAccountName }
        } = await loggedClient.v2.me({ "user.fields": ["profile_image_url"] })

        await db.insert(integrations).values({
            id: ulid(),
            platform: "x",
            userId: session.user.id,
            platformAccountId,
            platformAccountName,
            accessToken: `${accessToken}:${accessSecret}`, // Store both tokens
            createdAt: new Date(),
            updatedAt: new Date()
        })

        setCookie("x_oauth_token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 0
        })
        return Response.redirect(`${process.env.APP_URL}/app/integrations`, 302)
    }
})
