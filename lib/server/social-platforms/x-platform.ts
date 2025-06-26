import { TwitterApi } from "twitter-api-v2"
import { BaseSocialPlatform, type PostData, type PostResult } from "./base-platform"
import { envConfig } from "@/lib/env"
import { getEffectiveCredentials } from "../integrations"
import { getSessionOrThrow } from "@/lib/auth"
import { setCookie } from "@tanstack/react-start/server"

export class XPlatform extends BaseSocialPlatform {
    constructor() {
        super("x")
    }

    getDisplayName(): string {
        return "X (Twitter)"
    }

    requiresSetup(): boolean {
        return true
    }

    async startAuthorization(userId: string): Promise<{ url: string }> {
        const session = await getSessionOrThrow()

        const credentials = await getEffectiveCredentials("x", session.user.id)

        if (!credentials || !credentials.clientId || !credentials.clientSecret) {
            throw new Error(
                "X credentials not configured. Please set up your X app credentials first."
            )
        }

        const client = new TwitterApi({
            appKey: credentials.clientId,
            appSecret: credentials.clientSecret
        })

        const callbackUrl = `${envConfig.APP_URL}/api/auth/x/callback`

        const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink(
            callbackUrl,
            {
                authAccessType: "write",
                linkMode: "authenticate"
            }
        )

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
