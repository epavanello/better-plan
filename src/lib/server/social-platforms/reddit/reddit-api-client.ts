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
      const error = await response.text()
      throw new Error(`Reddit API error: ${response.status} - ${error}`)
    }

    return response
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    credentials: { clientId: string; clientSecret: string }
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const basicAuth = btoa(`${credentials.clientId}:${credentials.clientSecret}`)

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "BetterPlan/1.0"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token exchange failed: ${response.status} - ${error}`)
    }

    const tokenData: RedditTokenResponse = await response.json()
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token
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
    isLinkPost = false,
    url?: string
  ): Promise<{ id: string; permalink: string }> {
    const formData = new URLSearchParams({
      sr: subreddit,
      title,
      api_type: "json"
    })

    if (isLinkPost && url) {
      formData.set("url", url)
    } else {
      formData.set("text", content)
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
      throw new Error(`Reddit submission failed: ${result.json.errors.join(", ")}`)
    }

    if (!result.json.data) {
      throw new Error("Reddit submission failed: No data returned")
    }

    const submission = result.json.data.things[0]
    return {
      id: submission.data.id,
      permalink: submission.data.url
    }
  }

  async getRecentPosts(accessToken: string, limit = 10): Promise<RedditSubmission[]> {
    const response = await this.makeRequest(`/user/me/submitted?limit=${limit}`, accessToken)
    const data = await response.json()

    return data.data.children.map((child: { data: RedditSubmission }) => child.data)
  }
}
