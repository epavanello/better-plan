import type { RedditPostType } from "../reddit-platform"
import type { RedditSubmission, RedditSubmissionResponse, RedditSubreddit, RedditTokenResponse, RedditUser } from "./reddit-utils"

export class RedditApiClient {
  private readonly baseUrl = "https://oauth.reddit.com"
  private readonly tokenUrl = "https://www.reddit.com/api/v1/access_token"

  async makeRequest(endpoint: string, accessToken: string, options: RequestInit = {}): Promise<Response> {
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
      const errorText = await response.text()
      console.error(`Reddit API Error: ${response.status} - ${errorText}`, { endpoint, options: { ...options, body: "REDACTED" } })
      throw new Error(`Reddit API error: ${response.status} - ${errorText}`)
    }

    return response
  }

  async refreshAccessToken(
    refreshToken: string,
    credentials: { clientId: string; clientSecret: string }
  ): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    const auth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")

    const formData = new URLSearchParams()
    formData.append("grant_type", "refresh_token")
    formData.append("refresh_token", refreshToken)

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
      throw new Error(`Token refresh failed: ${response.status} - ${error}`)
    }

    const tokenData: RedditTokenResponse = await response.json()
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in
    }
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    credentials: { clientId: string; clientSecret: string }
  ): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
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

    const tokenData: RedditTokenResponse = await response.json()
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in
    }
  }

  async getUserInfo(accessToken: string): Promise<{ id: string; name: string }> {
    const response = await this.makeRequest("/api/v1/me", accessToken)
    const userData: RedditUser = await response.json()

    return {
      id: userData.id,
      name: userData.name
    }
  }

  async searchSubreddits(
    query: string,
    accessToken: string,
    cursor?: string
  ): Promise<{
    subreddits: RedditSubreddit[]
    hasMore: boolean
    nextCursor?: string
  }> {
    const params = new URLSearchParams({
      q: query,
      type: "sr",
      limit: "25"
    })

    if (cursor) {
      params.set("after", cursor)
    }

    const response = await this.makeRequest(`/subreddits/search?${params}`, accessToken)
    const data = await response.json()

    const subreddits: RedditSubreddit[] = data.data.children.map((child: { data: RedditSubreddit }) => child.data)
    const hasMore = data.data.after !== null
    const nextCursor = data.data.after || undefined

    return {
      subreddits,
      hasMore,
      nextCursor
    }
  }

  async submitPost(
    subreddit: string,
    title: string,
    content: string,
    accessToken: string,
    postType: RedditPostType = "text",
    url?: string
  ): Promise<{ id: string; permalink: string }> {
    const formData = new URLSearchParams()
    formData.append("sr", subreddit)
    formData.append("title", title)
    formData.append("api_type", "json")
    formData.append("kind", postType)

    if (postType === "media" && url) {
      formData.append("url", url)
    } else {
      formData.append("text", content)
    }

    const response = await this.makeRequest("/api/submit", accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData
    })

    const result: RedditSubmissionResponse = await response.json()

    if (result.json.errors && result.json.errors.length > 0) {
      const errorMessage = result.json.errors[0].join(": ")
      throw new Error(`Reddit API error: ${errorMessage}`)
    }

    if (!result.json.data?.things?.[0]?.data?.id) {
      throw new Error("Failed to create Reddit post: No post ID returned")
    }

    const postData = result.json.data.things[0].data
    const postId = postData.id
    const postUrl = `https://www.reddit.com${postData.permalink}`

    return {
      id: postId,
      permalink: postUrl
    }
  }

  async getRecentPosts(accessToken: string, limit = 10): Promise<RedditSubmission[]> {
    const response = await this.makeRequest(`/user/me/submitted?limit=${limit}&sort=new`, accessToken)
    const data = await response.json()

    const posts: RedditSubmission[] = []

    if (data.data?.children) {
      for (const child of data.data.children) {
        posts.push(child.data)
      }
    }

    return posts
  }
}
