import type { InsertPost } from "@/database/schema"
import type { Platform } from "@/database/schema"

export interface PostResult {
  success: boolean
  postUrl?: string
  error?: string
}

export interface PostDestination {
  type: string // "public", "community", "subreddit", etc.
  id: string // URL, subreddit name, etc.
  name: string // Display name
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  metadata?: Record<string, any> // Additional platform-specific data
  description?: string // Optional description or help text
}

export interface PostDestinationSearchResult {
  destinations: PostDestination[]
  hasMore: boolean
  nextCursor?: string
}

export interface PostData {
  id: string
  content: string
  userId: string
  destination?: PostDestination
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
  supportsDestinations: boolean
  destinationRequired: boolean
  destinationHelpText?: string
  destinationPlaceholder?: string
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

  supportsDestinations(): boolean {
    return false
  }

  requiresDestination(): boolean {
    return false
  }

  getDestinationHelpText(): string | undefined {
    return undefined
  }

  getDestinationPlaceholder(): string | undefined {
    return undefined
  }

  // Get default destinations for this platform
  getDefaultDestinations(): PostDestination[] {
    return []
  }

  // Search for destinations (e.g., subreddits, communities)
  async searchDestinations(
    query: string,
    accessToken: string,
    effectiveCredentials: { clientId: string; clientSecret: string },
    cursor?: string
  ): Promise<PostDestinationSearchResult> {
    return {
      destinations: [],
      hasMore: false
    }
  }

  // Validate a destination before posting
  async validateDestination(
    destination: PostDestination,
    accessToken: string,
    effectiveCredentials: { clientId: string; clientSecret: string }
  ): Promise<boolean> {
    return true
  }

  // Create a destination from user input (override per platform)
  async createDestinationFromInput(input: string, _accessToken: string | null, _userId: string): Promise<PostDestination> {
    return {
      type: "custom",
      id: input,
      name: input,
      description: "Custom destination"
    }
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

  getPlatformInfo(): PlatformInfo {
    return {
      name: this.name,
      displayName: this.getDisplayName(),
      requiresSetup: this.requiresSetup(),
      isImplemented: this.isImplemented(),
      supportsDestinations: this.supportsDestinations(),
      destinationRequired: this.requiresDestination(),
      destinationHelpText: this.getDestinationHelpText(),
      destinationPlaceholder: this.getDestinationPlaceholder()
    }
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
