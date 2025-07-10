import type { InsertPost } from "@/database/schema"
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

export interface PlatformInfo {
  name: Platform
  displayName: string
  requiresSetup: boolean
  isImplemented: boolean
}

export abstract class BaseSocialPlatform {
  constructor(protected name: Platform) {}

  abstract validateCredentials(accessToken: string, effectiveCredentials: { clientId: string; clientSecret: string }): Promise<boolean>

  abstract postContent(
    postData: PostData,
    accessToken: string,
    effectiveCredentials: { clientId: string; clientSecret: string }
  ): Promise<PostResult>

  supportsFetchingRecentPosts(): boolean {
    return false
  }

  async fetchRecentPosts(
    accessToken: string,
    effectiveCredentials: { clientId: string; clientSecret: string }
  ): Promise<Omit<InsertPost, "userId" | "integrationId">[]> {
    throw new Error("This platform does not support fetching recent posts.")
  }

  getPlatformName(): Platform {
    return this.name
  }

  getDisplayName(): string {
    return this.name.charAt(0).toUpperCase() + this.name.slice(1)
  }

  requiresSetup(): boolean {
    return false
  }

  isImplemented(): boolean {
    return true
  }

  // Override per implementare l'autorizzazione specifica della piattaforma
  async startAuthorization(userId: string): Promise<{ url: string }> {
    throw new Error(`Authorization not implemented for ${this.name}`)
  }

  async post(postData: PostData, effectiveCredentials: { clientId: string; clientSecret: string } | null): Promise<PostResult> {
    try {
      // Valida che abbiamo le credenziali necessarie
      if (!effectiveCredentials) {
        throw new Error(`${this.name} credentials not found`)
      }

      if (!postData.integration.accessToken) {
        throw new Error("Access token not found")
      }

      const isValid = await this.validateCredentials(postData.integration.accessToken, effectiveCredentials)

      if (!isValid) {
        throw new Error(`Invalid ${this.name} credentials`)
      }

      return await this.postContent(postData, postData.integration.accessToken, effectiveCredentials)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }
}
