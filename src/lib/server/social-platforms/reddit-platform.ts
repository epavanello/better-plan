import type { InsertPost } from "@/database/schema"
import { getSessionOrThrow } from "@/lib/auth"
import { envConfig } from "@/lib/env"
import { setCookie } from "@tanstack/react-start/server"
import { ulid } from "ulid"
import { getEffectiveCredentials } from "../integrations"
import {
  BaseSocialPlatform,
  type PostData,
  type PostDestination,
  type PostDestinationSearchResult,
  type PostResult,
  type RequiredField,
  type SetupCredentialLabels,
  type SetupGuideStep
} from "./base-platform"
import { RedditApiClient } from "./reddit/reddit-api-client"
import { buildRedditAuthUrl, normalizeSubredditName } from "./reddit/reddit-utils"

export class RedditPlatform extends BaseSocialPlatform {
  private readonly apiClient = new RedditApiClient()

  constructor() {
    super("reddit")
  }

  getDisplayName(): string {
    return "Reddit"
  }

  // Setup information methods
  getSetupDescription(): string {
    return "To connect your Reddit account, you need to first create a Reddit app and enter your credentials here. We'll validate them before saving."
  }

  getSetupGuideSteps(): SetupGuideStep[] {
    return [
      {
        text: "Go to Reddit Apps page",
        details: [this.getDeveloperUrl()!]
      },
      {
        text: "Create a new app",
        details: ["Click 'Create App' or 'Create Another App'", "Choose 'web app' as the app type", "Fill in app name and description"]
      },
      {
        text: "Copy the Client ID and Client Secret",
        details: ["Client ID is the string under your app name", "Client Secret is shown in the 'secret' field"]
      },
      {
        text: "Paste the credentials in the form below"
      }
    ]
  }

  getCredentialLabels(): SetupCredentialLabels {
    return {
      clientId: "Client ID",
      clientSecret: "Client Secret"
    }
  }

  getCallbackUrlDescription(): string {
    return "Use this URL as your app's redirect URI in the Reddit app settings"
  }

  getShowGuideByDefault(): boolean {
    return false
  }

  getValidationErrorHelp(): string[] {
    return [
      "The Client ID and Secret are correct",
      "Your app is configured as a 'web app'",
      "The redirect URI matches exactly (including protocol and port)"
    ]
  }

  supportsFetchingRecentPosts(): boolean {
    return true
  }

  supportsDestinations(): boolean {
    return true
  }

  supportsMedia(): boolean {
    return true
  }

  requiresDestination(): boolean {
    return true
  }

  getDestinationHelpText(): string {
    return "Choose a subreddit to post to. You can search for subreddits or enter a subreddit name directly (e.g., 'programming' or 'r/programming')"
  }

  getDestinationPlaceholder(): string {
    return "r/programming"
  }

  getRequiredFields(): RequiredField[] {
    return [
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "Enter post title",
        maxLength: 300,
        required: true,
        helpText: "Post title is required for all Reddit posts"
      },
      {
        key: "postType",
        label: "Post type",
        type: "select",
        required: true,
        helpText: "Choose whether to create a text, link, or media post.",
        placeholder: "Select post type",
        options: [
          { value: "text", label: "Text post" },
          { value: "link", label: "Link post" },
          { value: "media", label: "Media post" }
        ]
      }
    ]
  }

  getDefaultDestinations(): PostDestination[] {
    return [
      {
        type: "subreddit",
        id: "r/programming",
        name: "r/programming",
        description: "Computer programming"
      },
      {
        type: "subreddit",
        id: "r/technology",
        name: "r/technology",
        description: "Technology news and discussion"
      },
      {
        type: "subreddit",
        id: "r/webdev",
        name: "r/webdev",
        description: "Web development"
      }
    ]
  }

  requiresSetup(): boolean {
    return true
  }

  async startAuthorization(userId: string): Promise<{ url: string }> {
    const session = await getSessionOrThrow()
    const credentials = await getEffectiveCredentials("reddit", session.user.id)

    if (!credentials || !credentials.clientId || !credentials.clientSecret) {
      throw new Error("Reddit credentials not configured. Please set up your Reddit app credentials first.")
    }

    const state = ulid()
    const redirectUri = `${envConfig.APP_URL}/api/integrations/reddit/callback`
    const scope = ["submit", "read", "identity", "mysubreddits"]

    const authUrl = buildRedditAuthUrl(credentials.clientId, state, redirectUri, scope)

    // Store state in cookie for CSRF protection
    setCookie("reddit_oauth_state", state, {
      httpOnly: true,
      secure: envConfig.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 15 // 15 minutes
    })

    return { url: authUrl.toString() }
  }

  async validateCredentials(accessToken: string, effectiveCredentials: { clientId: string; clientSecret: string }): Promise<boolean> {
    try {
      await this.apiClient.getUserInfo(accessToken)
      return true
    } catch (error) {
      console.error("Reddit credentials validation failed:", error)
      return false
    }
  }

  async postContent(
    postData: PostData,
    accessToken: string,
    effectiveCredentials: { clientId: string; clientSecret: string }
  ): Promise<PostResult> {
    try {
      if (!postData.destination) {
        throw new Error("Subreddit destination is required for Reddit posts")
      }

      // Get title and post type from additional fields
      const title = postData.additionalFields?.title as string
      const postType = (postData.additionalFields?.postType as string) || "text"

      if (!title) {
        throw new Error("Post title is required for Reddit posts")
      }

      const subredditName = normalizeSubredditName(postData.destination.id)

      let url: string | undefined
      if (postType === "link") {
        // For link posts, extract URL from content or use entire content as URL
        const urlMatch = postData.content.match(/(https?:\/\/[^\s]+)/i)
        url = urlMatch ? urlMatch[1] : postData.content.trim()

        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          throw new Error("Invalid URL for link post")
        }
      }

      // Handle media uploads
      const mediaUrls: string[] = []
      if (postData.media && postData.media.length > 0) {
        if (postType !== "media") {
          throw new Error("To upload media, please select the 'Media post' type.")
        }

        // We need the user's Reddit username to upload to their profile
        const userInfo = await this.apiClient.getUserInfo(accessToken)

        for (const media of postData.media) {
          const uploadResult = await this.apiClient.uploadMedia(media.content, media.mimeType, accessToken, userInfo.name)
          mediaUrls.push(uploadResult.imageUrl)
        }
      }

      // For media posts, we treat them as text posts with embedded media
      const isLinkPost = postType === "link"
      const result = await this.apiClient.submitPost(
        subredditName,
        title,
        postData.content,
        accessToken,
        isLinkPost,
        url,
        mediaUrls
      )

      const postUrl = `https://www.reddit.com/r/${subredditName}/comments/${result.id}/`

      return {
        success: true,
        postUrl
      }
    } catch (error) {
      console.error("Failed to post to Reddit:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to post to Reddit"
      }
    }
  }

  async searchDestinations(
    query: string,
    accessToken: string,
    effectiveCredentials: { clientId: string; clientSecret: string },
    cursor?: string
  ): Promise<PostDestinationSearchResult> {
    try {
      const result = await this.apiClient.searchSubreddits(query, accessToken, cursor)
      const destinations: PostDestination[] = result.subreddits.map((subreddit) => ({
        type: "subreddit",
        id: subreddit.display_name,
        name: subreddit.display_name_prefixed,
        description: `${subreddit.public_description || subreddit.title} • ${subreddit.subscribers?.toLocaleString() || "Unknown"} members`,
        metadata: {
          subscribers: subreddit.subscribers || 0,
          over18: subreddit.over18 || false,
          subredditType: subreddit.subreddit_type || "public"
        }
      }))

      return {
        destinations,
        hasMore: result.hasMore
      }
    } catch (error) {
      console.error("Failed to search Reddit destinations:", error)
      return {
        destinations: [],
        hasMore: false
      }
    }
  }

  async validateDestination(
    destination: PostDestination,
    accessToken: string,
    effectiveCredentials: { clientId: string; clientSecret: string }
  ): Promise<boolean> {
    try {
      const subredditName = normalizeSubredditName(destination.id)
      const response = await this.apiClient.makeRequest(`/r/${subredditName}/about`, accessToken)
      const data = await response.json()
      return !!data.data?.display_name
    } catch (error) {
      console.error("Failed to validate Reddit destination:", error)
      return false
    }
  }

  async createDestinationFromInput(input: string, accessToken: string | null, userId: string): Promise<PostDestination> {
    // Clean input - remove r/ prefix if present
    const cleanInput = input.replace(/^r\//, "").trim()

    if (!cleanInput) {
      throw new Error("Invalid subreddit name")
    }

    // If we have access token, try to get real subreddit info
    if (accessToken) {
      try {
        const response = await this.apiClient.makeRequest(`/r/${cleanInput}/about`, accessToken)
        const data = await response.json()
        const subreddit = data.data

        return {
          type: "subreddit",
          id: subreddit.display_name,
          name: subreddit.display_name_prefixed,
          description: `${subreddit.public_description || subreddit.title} • ${subreddit.subscribers?.toLocaleString() || "Unknown"} members`,
          metadata: {
            subscribers: subreddit.subscribers || 0,
            over18: subreddit.over18 || false,
            subredditType: subreddit.subreddit_type || "public"
          }
        }
      } catch (error) {
        console.error("Failed to fetch subreddit info:", error)
      }
    }

    // Fallback to basic destination
    return {
      type: "subreddit",
      id: cleanInput,
      name: `r/${cleanInput}`,
      description: "Subreddit"
    }
  }

  async fetchRecentPosts(
    accessToken: string,
    effectiveCredentials: { clientId: string; clientSecret: string }
  ): Promise<Omit<InsertPost, "userId" | "integrationId">[]> {
    try {
      const submissions = await this.apiClient.getRecentPosts(accessToken, 25)

      const postsToUpsert: Omit<InsertPost, "userId" | "integrationId">[] = submissions.map((submission) => {
        // Create content from title and text
        let content = submission.title
        if (submission.is_self && submission.selftext) {
          content += `\n${submission.selftext}`
        } else if (!submission.is_self && submission.url) {
          content += `\n${submission.url}`
        }

        return {
          id: submission.id,
          content,
          status: "posted",
          source: "imported",
          postedAt: new Date(submission.created_utc * 1000),
          createdAt: new Date(submission.created_utc * 1000),
          postUrl: `https://www.reddit.com${submission.permalink}`
        }
      })

      return postsToUpsert
    } catch (error) {
      console.error("Failed to fetch recent posts from Reddit:", error)
      throw new Error("Failed to fetch recent posts from Reddit.")
    }
  }

  // Exchange authorization code for access token
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    credentials: { clientId: string; clientSecret: string }
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    return this.apiClient.exchangeCodeForTokens(code, redirectUri, credentials)
  }

  // Get user info
  async getUserInfo(accessToken: string): Promise<{ id: string; name: string }> {
    return this.apiClient.getUserInfo(accessToken)
  }
}
