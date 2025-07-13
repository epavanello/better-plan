import type { InsertPost } from "@/database/schema"
import { getSessionOrThrow } from "@/lib/auth"
import { envConfig } from "@/lib/env"
import { setCookie } from "@tanstack/react-start/server"
import { type SendTweetV2Params, TwitterApi } from "twitter-api-v2"
import { getEffectiveCredentials } from "../integrations"
import { BaseSocialPlatform, type PostData, type PostDestination, type PostResult } from "./base-platform"

export class XPlatform extends BaseSocialPlatform {
  constructor() {
    super("x")
  }

  getDisplayName(): string {
    return "X (Twitter)"
  }

  supportsFetchingRecentPosts(): boolean {
    return true
  }

  supportsDestinations(): boolean {
    return true
  }

  requiresDestination(): boolean {
    return false
  }

  getDestinationHelpText(): string {
    return "For communities, use the community URL (e.g., https://x.com/i/communities/1493446837214187523)"
  }

  getDestinationPlaceholder(): string {
    return "https://x.com/i/communities/..."
  }

  getDefaultDestinations(): PostDestination[] {
    return [
      {
        type: "public",
        id: "public",
        name: "Public Timeline",
        description: "Post to your public timeline"
      }
    ]
  }

  requiresSetup(): boolean {
    return true
  }

  async startAuthorization(userId: string): Promise<{ url: string }> {
    const session = await getSessionOrThrow()

    const credentials = await getEffectiveCredentials("x", session.user.id)

    if (!credentials || !credentials.clientId || !credentials.clientSecret) {
      throw new Error("X credentials not configured. Please set up your X app credentials first.")
    }

    const client = new TwitterApi({
      appKey: credentials.clientId,
      appSecret: credentials.clientSecret
    })

    const callbackUrl = `${envConfig.APP_URL}/api/integrations/x/callback`

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
  }

  private parseAccessToken(accessToken: string): { token: string; secret: string } {
    const [token, secret] = accessToken.split(":")
    if (!token || !secret) {
      throw new Error("Invalid X access token format. Expected format: 'token:secret'")
    }
    return { token, secret }
  }

  async validateCredentials(accessToken: string, effectiveCredentials: { clientId: string; clientSecret: string }): Promise<boolean> {
    try {
      const { token, secret } = this.parseAccessToken(accessToken)

      const client = new TwitterApi({
        appKey: effectiveCredentials.clientId,
        appSecret: effectiveCredentials.clientSecret,
        accessToken: token,
        accessSecret: secret
      })

      // Testa le credenziali facendo una chiamata semplice
      await client.v2.me()
      return true
    } catch (error) {
      console.error("X credentials validation failed:", error)
      return false
    }
  }

  async postContent(
    postData: PostData,
    accessToken: string,
    effectiveCredentials: { clientId: string; clientSecret: string }
  ): Promise<PostResult> {
    try {
      const { token, secret } = this.parseAccessToken(accessToken)

      const twitterClient = new TwitterApi({
        appKey: effectiveCredentials.clientId,
        appSecret: effectiveCredentials.clientSecret,
        accessToken: token,
        accessSecret: secret
      })

      // Prepare tweet options
      const tweetOptions: SendTweetV2Params = {}

      // Add community_id if posting to a community
      if (postData.destination && postData.destination.type === "community") {
        const communityId = this.extractCommunityId(postData.destination.id)
        if (!communityId) {
          throw new Error("Invalid community URL format")
        }
        tweetOptions.community_id = communityId
        // Note: Twitter API v2 might use different parameter for community posting
        // This is a placeholder - actual implementation depends on Twitter API capabilities
      }

      const tweet = await twitterClient.v2.tweet(postData.content, tweetOptions)
      const postUrl = `https://x.com/${postData.integration.platformAccountName}/status/${tweet.data.id}`

      return {
        success: true,
        postUrl
      }
    } catch (error) {
      console.error("Failed to post to X:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to post to X"
      }
    }
  }

  private extractCommunityId(communityUrl: string): string | null {
    // Extract community ID from URL like https://x.com/i/communities/1493446837214187523
    const match = communityUrl.match(/\/communities\/(\d+)/)
    return match ? match[1] : null
  }

  async validateDestination(
    destination: PostDestination,
    accessToken: string,
    effectiveCredentials: { clientId: string; clientSecret: string }
  ): Promise<boolean> {
    if (destination.type === "public") {
      return true
    }

    if (destination.type === "community") {
      // Validate community URL format
      const communityId = this.extractCommunityId(destination.id)
      if (!communityId) {
        return false
      }

      // TODO: Optionally validate that the community exists and user has access
      // This would require additional Twitter API calls
      return true
    }

    return false
  }

  async lookupCommunityName(
    communityId: string,
    accessToken: string,
    effectiveCredentials: { clientId: string; clientSecret: string }
  ): Promise<string | null> {
    try {
      const { token, secret } = this.parseAccessToken(accessToken)

      const client = new TwitterApi({
        appKey: effectiveCredentials.clientId,
        appSecret: effectiveCredentials.clientSecret,
        accessToken: token,
        accessSecret: secret
      })

      // Try to get community information
      // Note: Community lookup might not be available in all twitter-api-v2 versions
      // This is a best-effort attempt
      try {
        // The twitter-api-v2 library might not have community lookup endpoints
        // So we'll use a fallback approach
        const response = await client.v2.get(`communities/${communityId}`, {
          "community.fields": "name,description"
        })

        if (response.data?.name) {
          return response.data.name
        }
      } catch (communityApiError) {
        // Community API might not be available or accessible
        console.log("Community lookup not available, using fallback")
      }

      return null
    } catch (error) {
      console.error("Failed to lookup community name:", error)
      return null
    }
  }

  // Create a destination from user input
  async createDestinationFromInput(input: string, accessToken: string | null, userId: string): Promise<PostDestination> {
    if (input.includes("communities")) {
      // Extract community ID from URL
      const communityMatch = input.match(/\/communities\/(\d+)/)
      const communityId = communityMatch?.[1]

      if (communityId && accessToken) {
        try {
          // Get credentials and try to lookup community name
          const credentials = await getEffectiveCredentials("x", userId)
          if (credentials) {
            const communityName = await this.lookupCommunityName(communityId, accessToken, credentials)

            if (communityName) {
              return {
                type: "community",
                id: input,
                name: communityName,
                description: "X Community"
              }
            }
          }
        } catch (error) {
          console.error("Failed to lookup community name:", error)
        }
      }

      // Fallback to generated name
      const shortId = communityId ? communityId.slice(-6) : "Unknown"
      return {
        type: "community",
        id: input,
        name: `Community ${shortId}`,
        description: "X Community"
      }
    }

    return {
      type: "custom",
      id: input,
      name: input,
      description: "Custom destination"
    }
  }

  async fetchRecentPosts(
    accessToken: string,
    effectiveCredentials: { clientId: string; clientSecret: string }
  ): Promise<Omit<InsertPost, "userId" | "integrationId">[]> {
    try {
      const { token, secret } = this.parseAccessToken(accessToken)

      const client = new TwitterApi({
        appKey: effectiveCredentials.clientId,
        appSecret: effectiveCredentials.clientSecret,
        accessToken: token,
        accessSecret: secret
      })

      const me = await client.v2.me()
      const timeline = await client.v2.userTimeline(me.data.id, {
        max_results: 20,
        "tweet.fields": ["created_at", "id", "text"],
        exclude: ["replies", "retweets"]
      })

      const postsToUpsert: Omit<InsertPost, "userId" | "integrationId">[] = []

      if (timeline.data.data) {
        for (const tweet of timeline.data.data) {
          postsToUpsert.push({
            id: tweet.id,
            content: tweet.text,
            status: "posted",
            source: "imported",
            postedAt: new Date(tweet.created_at!),
            createdAt: new Date(tweet.created_at!),
            postUrl: `https://x.com/${me.data.username}/status/${tweet.id}`
          })
        }
      }

      return postsToUpsert
    } catch (error) {
      console.error("Failed to fetch recent posts from X:", error)
      throw new Error("Failed to fetch recent posts from X.")
    }
  }
}
