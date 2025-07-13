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
    type RequiredField
} from "./base-platform"

interface RedditTokenResponse {
    access_token: string
    refresh_token?: string
    token_type: string
    expires_in: number
    scope: string
}

interface RedditUser {
    id: string
    name: string
    icon_img?: string
    total_karma: number
    link_karma: number
    comment_karma: number
}

interface RedditSubreddit {
    display_name: string
    display_name_prefixed: string
    title: string
    public_description?: string
    description?: string
    subscribers: number
    over18: boolean
    subreddit_type: "public" | "private" | "restricted"
    icon_img?: string
}

interface RedditSubmission {
    id: string
    title: string
    selftext?: string
    url?: string
    permalink: string
    created_utc: number
    is_self: boolean
    subreddit_name_prefixed: string
    score: number
    num_comments: number
}

interface RedditSubmissionResponse {
    json: {
        errors: string[][]
        data?: {
            things: Array<{
                data: {
                    id: string
                    url: string
                    name: string
                }
            }>
        }
    }
}

export class RedditPlatform extends BaseSocialPlatform {
    private readonly baseUrl = "https://oauth.reddit.com"
    private readonly authUrl = "https://www.reddit.com/api/v1/authorize"
    private readonly tokenUrl = "https://www.reddit.com/api/v1/access_token"

    constructor() {
        super("reddit")
    }

    getDisplayName(): string {
        return "Reddit"
    }

    supportsFetchingRecentPosts(): boolean {
        return true
    }

    supportsDestinations(): boolean {
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
                label: "Post Type",
                type: "select",
                required: true,
                helpText: "Choose whether to create a text post or link post",
                options: [
                    { value: "text", label: "Text Post" },
                    { value: "link", label: "Link Post" }
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

    private async makeRedditRequest(endpoint: string, accessToken: string, options: RequestInit = {}): Promise<Response> {
        const url = `${this.baseUrl}${endpoint}`

        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": "BetterPlan/1.0",
                ...options.headers
            }
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`Reddit API error: ${response.status} - ${error}`)
        }

        return response
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

        const authUrl = new URL(this.authUrl)
        authUrl.searchParams.set("client_id", credentials.clientId)
        authUrl.searchParams.set("response_type", "code")
        authUrl.searchParams.set("state", state)
        authUrl.searchParams.set("redirect_uri", redirectUri)
        authUrl.searchParams.set("duration", "permanent")
        authUrl.searchParams.set("scope", scope.join(" "))

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
            const response = await this.makeRedditRequest("/api/v1/me", accessToken)
            const user: RedditUser = await response.json()
            return !!user.name
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

            const subredditName = postData.destination.id.replace(/^r\//, "")

            // Prepare form data
            const formData = new FormData()
            formData.append("sr", subredditName)
            formData.append("title", title)
            formData.append("kind", postType === "link" ? "link" : "self")
            formData.append("api_type", "json")

            if (postType === "link") {
                // For link posts, extract URL from content or use entire content as URL
                const urlMatch = postData.content.match(/(https?:\/\/[^\s]+)/i)
                const url = urlMatch ? urlMatch[1] : postData.content.trim()

                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    throw new Error("Invalid URL for link post")
                }

                formData.append("url", url)
            } else {
                // For text posts, use the content as text body
                formData.append("text", postData.content)
            }

            const response = await this.makeRedditRequest("/api/submit", accessToken, {
                method: "POST",
                body: formData
            })

            const result: RedditSubmissionResponse = await response.json()

            if (result.json.errors.length > 0) {
                throw new Error(`Reddit API error: ${result.json.errors[0][1]}`)
            }

            if (!result.json.data?.things?.[0]?.data?.id) {
                throw new Error("Failed to create Reddit post: No post ID returned")
            }

            const postId = result.json.data.things[0].data.id
            const postUrl = `https://www.reddit.com/r/${subredditName}/comments/${postId}/`

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
            const response = await this.makeRedditRequest(`/subreddits/search?q=${encodeURIComponent(query)}&limit=25&type=sr`, accessToken)

            const data = await response.json()
            const destinations: PostDestination[] = []

            if (data.data?.children) {
                for (const child of data.data.children) {
                    const subreddit: RedditSubreddit = child.data
                    destinations.push({
                        type: "subreddit",
                        id: subreddit.display_name,
                        name: subreddit.display_name_prefixed,
                        description: `${subreddit.public_description || subreddit.title} • ${subreddit.subscribers?.toLocaleString() || "Unknown"} members`,
                        metadata: {
                            subscribers: subreddit.subscribers || 0,
                            over18: subreddit.over18 || false,
                            subredditType: subreddit.subreddit_type || "public"
                        }
                    })
                }
            }

            return {
                destinations,
                hasMore: false
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
            const subredditName = destination.id.replace(/^r\//, "")
            const response = await this.makeRedditRequest(`/r/${subredditName}/about`, accessToken)
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
                const response = await this.makeRedditRequest(`/r/${cleanInput}/about`, accessToken)
                const data = await response.json()
                const subreddit: RedditSubreddit = data.data

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
            const response = await this.makeRedditRequest("/user/me/submitted?limit=25&sort=new", accessToken)
            const data = await response.json()

            const postsToUpsert: Omit<InsertPost, "userId" | "integrationId">[] = []

            if (data.data?.children) {
                for (const child of data.data.children) {
                    const submission: RedditSubmission = child.data

                    // Create content from title and text
                    let content = submission.title
                    if (submission.is_self && submission.selftext) {
                        content += `\n${submission.selftext}`
                    } else if (!submission.is_self && submission.url) {
                        content += `\n${submission.url}`
                    }

                    postsToUpsert.push({
                        id: submission.id,
                        content,
                        status: "posted",
                        source: "imported",
                        postedAt: new Date(submission.created_utc * 1000),
                        createdAt: new Date(submission.created_utc * 1000),
                        postUrl: `https://www.reddit.com${submission.permalink}`
                    })
                }
            }

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
        try {
            const auth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")

            const formData = new URLSearchParams()
            formData.append("grant_type", "authorization_code")
            formData.append("code", code)
            formData.append("redirect_uri", redirectUri)

            const response = await fetch(this.tokenUrl, {
                method: "POST",
                headers: {
                    Authorization: `Basic ${auth}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "BetterPlan/1.0"
                },
                body: formData
            })

            if (!response.ok) {
                const error = await response.text()
                throw new Error(`Token exchange failed: ${response.status} - ${error}`)
            }

            const tokens: RedditTokenResponse = await response.json()

            return {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token
            }
        } catch (error) {
            console.error("Failed to exchange code for tokens:", error)
            throw new Error("Failed to exchange authorization code for tokens")
        }
    }

    // Get user info
    async getUserInfo(accessToken: string): Promise<{ id: string; name: string }> {
        try {
            const response = await this.makeRedditRequest("/api/v1/me", accessToken)
            const user: RedditUser = await response.json()

            return {
                id: user.id,
                name: user.name
            }
        } catch (error) {
            console.error("Failed to get user info:", error)
            throw new Error("Failed to get user information")
        }
    }
}
