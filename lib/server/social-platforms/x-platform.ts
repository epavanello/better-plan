import { TwitterApi } from "twitter-api-v2"
import { BaseSocialPlatform, type PostData, type PostResult } from "./base-platform"

export class XPlatform extends BaseSocialPlatform {
    constructor() {
        super("x")
    }

    private parseAccessToken(accessToken: string): { token: string; secret: string } {
        const [token, secret] = accessToken.split(":")
        if (!token || !secret) {
            throw new Error("Invalid X access token format. Expected format: 'token:secret'")
        }
        return { token, secret }
    }

    async validateCredentials(
        accessToken: string,
        effectiveCredentials: { clientId: string; clientSecret: string }
    ): Promise<boolean> {
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

            const tweet = await twitterClient.v2.tweet(postData.content)
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
}
