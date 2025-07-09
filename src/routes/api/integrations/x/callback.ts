import { db } from "@/database/db"
import { integrations } from "@/database/schema"
import { getSessionOrThrow } from "@/lib/auth"
import { envConfig } from "@/lib/env"
import { getEffectiveCredentials } from "@/lib/server/integrations"
import { createServerFileRoute } from "@tanstack/react-start/server"
import { getCookie, setCookie } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { TwitterApi } from "twitter-api-v2"
import { ulid } from "ulid"

export const ServerRoute = createServerFileRoute("/api/integrations/x/callback").methods({
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
    const session = await getSessionOrThrow()

    const credentials = await getEffectiveCredentials("x", session.user.id)

    if (!credentials || !credentials.clientId || !credentials.clientSecret) {
      return new Response("X credentials not configured", { status: 500 })
    }

    const client = new TwitterApi({
      appKey: credentials.clientId,
      appSecret: credentials.clientSecret,
      accessToken: oauth_token,
      accessSecret: oauth_token_secret
    })

    const { client: loggedClient, accessToken, accessSecret } = await client.login(oauthVerifier)

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
    return Response.redirect(`${envConfig.APP_URL}/app`, 302)
  }
})
