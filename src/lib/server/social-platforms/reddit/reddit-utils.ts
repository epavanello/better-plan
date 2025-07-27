export interface RedditTokenResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
  scope: string
}

export interface RedditUser {
  id: string
  name: string
  icon_img?: string
  total_karma: number
  link_karma: number
  comment_karma: number
}

export interface RedditSubreddit {
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

export interface RedditSubmission {
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

export interface RedditSubmissionResponse {
  json: {
    errors: string[][]
    data?: {
      id: string
      url: string
      name: string
      drafts_count: number
    }
  }
}

export function normalizeSubredditName(input: string): string {
  // Remove r/ prefix if present and normalize
  let subredditName = input.trim()
  if (subredditName.startsWith("r/")) {
    subredditName = subredditName.substring(2)
  }
  if (subredditName.startsWith("/r/")) {
    subredditName = subredditName.substring(3)
  }
  return subredditName.toLowerCase()
}

export function buildRedditAuthUrl(clientId: string, state: string, redirectUri: string, scope: string[]): string {
  const authUrl = new URL("https://www.reddit.com/api/v1/authorize")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("duration", "permanent")
  authUrl.searchParams.set("scope", scope.join(" "))
  return authUrl.toString()
}
