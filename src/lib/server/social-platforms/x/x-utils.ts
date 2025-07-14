export function parseAccessToken(accessToken: string): { token: string; secret: string } {
  const [token, secret] = accessToken.split(":")
  if (!token || !secret) {
    throw new Error("Invalid X access token format. Expected format: 'token:secret'")
  }
  return { token, secret }
}

export function extractCommunityId(communityUrl: string): string | null {
  // Extract community ID from URL like https://x.com/i/communities/1493446837214187523
  const match = communityUrl.match(/\/communities\/(\d+)/)
  return match ? match[1] : null
}

export function validateCommunityUrl(url: string): boolean {
  return /^https:\/\/x\.com\/i\/communities\/\d+/.test(url)
}
