import { db } from "@/database/db"
import { integrations } from "@/database/schema"
import { auth } from "@/lib/auth"
import { envConfig } from "@/lib/env"
import { createAPIFileRoute } from "@tanstack/react-start/api"
import { getCookie, setCookie } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { TwitterApi } from "twitter-api-v2"
import { ulid } from "ulid"

export const APIRoute = createAPIFileRoute("/api/auth/x/callback")({
    GET: async ({ request }) => {
        if (!envConfig.X_CLIENT_ID || !envConfig.X_CLIENT_SECRET) {
            return new Response("X client ID or secret not set", { status: 500 })
        }

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
            appKey: envConfig.X_CLIENT_ID,
            appSecret: envConfig.X_CLIENT_SECRET,
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

        const existingIntegration = await db
            .select()
            .from(integrations)
            .where(
                eq(integrations.userId, session.user.id) &&
                    eq(integrations.platformAccountId, platformAccountId)
            )
            .limit(1)

        if (existingIntegration.length > 0) {
            return new Response("Account already connected", { status: 409 })
        }

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
            secure: envConfig.NODE_ENV === "production",
            path: "/",
            maxAge: 0
        })
        return Response.redirect(`${envConfig.APP_URL}/app/integrations`, 302)
    }
})
