import { db } from "@/database/db"
import { integrations } from "@/database/schema"
import { getSessionOrThrow } from "@/lib/auth"
import { envConfig } from "@/lib/env"
import { getEffectiveCredentials } from "@/lib/server/integrations"
import { RedditPlatform } from "@/lib/server/social-platforms/reddit-platform"
import { createServerFileRoute, getCookie } from "@tanstack/react-start/server"
import { and, eq } from "drizzle-orm"
import { ulid } from "ulid"

export const ServerRoute = createServerFileRoute("/api/integrations/reddit/callback").methods({
  GET: async ({ request }) => {
    try {
      const session = await getSessionOrThrow()
      const url = new URL(request.url)
      const code = url.searchParams.get("code")
      const state = url.searchParams.get("state")
      const error = url.searchParams.get("error")

      // Check for OAuth error
      if (error) {
        console.error("Reddit OAuth error:", error)
        return Response.redirect(`${envConfig.APP_URL}/app?error=reddit_oauth_error`)
      }

      // Validate required parameters
      if (!code || !state) {
        console.error("Missing code or state parameter")
        return Response.redirect(`${envConfig.APP_URL}/app?error=reddit_missing_params`)
      }

      // Verify state parameter (CSRF protection)
      const storedState = await getCookie("reddit_oauth_state")
      if (!storedState || storedState !== state) {
        console.error("State mismatch or missing state cookie")
        return Response.redirect(`${envConfig.APP_URL}/app?error=reddit_state_mismatch`)
      }

      // Get Reddit credentials
      const credentials = await getEffectiveCredentials("reddit", session.user.id)
      if (!credentials) {
        console.error("Reddit credentials not found")
        return Response.redirect(`${envConfig.APP_URL}/app?error=reddit_credentials_missing`)
      }

      // Initialize Reddit platform
      const redditPlatform = new RedditPlatform()
      const redirectUri = `${envConfig.APP_URL}/api/integrations/reddit/callback`

      // Exchange code for tokens
      const tokenResponse = await redditPlatform.exchangeCodeForTokens(code, redirectUri, credentials)

      // Get user info
      const userInfo = await redditPlatform.getUserInfo(tokenResponse.accessToken)

      // Check if integration already exists
      const existingIntegration = await db
        .select()
        .from(integrations)
        .where(
          and(
            eq(integrations.userId, session.user.id),
            eq(integrations.platform, "reddit"),
            eq(integrations.platformAccountId, userInfo.id)
          )
        )
        .limit(1)

      if (existingIntegration[0]) {
        // Update existing integration
        await db
          .update(integrations)
          .set({
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken,
            expiresAt: null, // Reddit tokens don't expire
            scopes: "submit,read,identity,mysubreddits",
            platformAccountName: userInfo.name,
            updatedAt: new Date()
          })
          .where(eq(integrations.id, existingIntegration[0].id))
      } else {
        // Create new integration
        await db.insert(integrations).values({
          id: ulid(),
          platform: "reddit",
          platformAccountId: userInfo.id,
          platformAccountName: userInfo.name,
          accessToken: tokenResponse.accessToken,
          refreshToken: tokenResponse.refreshToken,
          expiresAt: null, // Reddit tokens don't expire
          scopes: "submit,read,identity,mysubreddits",
          userId: session.user.id
        })
      }

      // Redirect to success page
      return Response.redirect(`${envConfig.APP_URL}/app?success=reddit_connected`)
    } catch (error) {
      console.error("Reddit OAuth callback error:", error)
      return Response.redirect(`${envConfig.APP_URL}/app?error=reddit_callback_error`)
    }
  }
})
