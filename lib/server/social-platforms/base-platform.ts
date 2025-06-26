import type { Platform } from "@/database/schema"

export interface PostResult {
    success: boolean
    postUrl?: string
    error?: string
}

export interface PostData {
    id: string
    content: string
    userId: string
    integration: {
        id: string
        platform: Platform
        platformAccountId: string
        platformAccountName: string
        accessToken: string | null
    }
}

export abstract class BaseSocialPlatform {
    constructor(protected name: Platform) {}

    abstract validateCredentials(
        accessToken: string,
        effectiveCredentials: { clientId: string; clientSecret: string }
    ): Promise<boolean>

    abstract postContent(
        postData: PostData,
        accessToken: string,
        effectiveCredentials: { clientId: string; clientSecret: string }
    ): Promise<PostResult>

    async post(
        postData: PostData,
        effectiveCredentials: { clientId: string; clientSecret: string } | null
    ): Promise<PostResult> {
        try {
            // Valida che abbiamo le credenziali necessarie
            if (!effectiveCredentials) {
                throw new Error(`${this.name} credentials not found`)
            }

            if (!postData.integration.accessToken) {
                throw new Error("Access token not found")
            }

            const isValid = await this.validateCredentials(
                postData.integration.accessToken,
                effectiveCredentials
            )

            if (!isValid) {
                throw new Error(`Invalid ${this.name} credentials`)
            }

            return await this.postContent(
                postData,
                postData.integration.accessToken,
                effectiveCredentials
            )
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            }
        }
    }
}
