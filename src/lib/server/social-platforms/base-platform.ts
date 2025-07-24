import type { InsertPost } from "@/database/schema"
import type { Platform } from "@/database/schema"
import { z } from "zod"

export interface PostResult {
  success: boolean
  postUrl?: string
  error?: string
}

export const DestinationSchema = z.object({
  type: z.string(), // "public", "community", "subreddit", etc.
  id: z.string(), // URL, subreddit name, etc.
  name: z.string(), // Display name
  metadata: z.record(z.any()).optional(), // Additional platform-specific data
  description: z.string().optional() // Optional description or help text
})

export type PostDestination = z.infer<typeof DestinationSchema>

export interface PostDestinationSearchResult {
  destinations: PostDestination[]
  hasMore: boolean
  nextCursor?: string
}

export interface RequiredField {
  key: string
  label: string
  type: "text" | "textarea" | "select" | "number"
  placeholder?: string
  maxLength?: number
  required: boolean
  options?: { value: string; label: string }[]
  helpText?: string
}

export interface PostData {
  id: string
  content: string
  userId: string
  destination?: PostDestination
  additionalFields?: Record<string, string> // For platform-specific fields like Reddit title
  integration: {
    id: string
    platform: Platform
    platformAccountId: string
    platformAccountName: string
    accessToken: string | null
  }
}

export interface SetupCredentialLabels {
  clientId: string
  clientSecret: string
}

export interface SetupGuideStep {
  text: string
  details?: string[]
  isCode?: boolean
}

export interface SetupInformation {
  description?: string
  guideSteps?: SetupGuideStep[]
  credentialLabels?: SetupCredentialLabels
  developerUrl?: string
  callbackUrlDescription?: string
  showGuideByDefault?: boolean
  validationErrorHelp?: string[]
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
  requiredFields?: RequiredField[] // Additional fields required by this platform
  setupInformation?: SetupInformation // Added setup information
  maxCharacterLimit?: number // Maximum characters allowed for posts
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

  getRequiredFields(): RequiredField[] {
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

  // Setup information methods - override in specific platforms
  getSetupInformation(): SetupInformation | undefined {
    const description = this.getSetupDescription()
    const guideSteps = this.getSetupGuideSteps()
    const credentialLabels = this.getCredentialLabels()
    const developerUrl = this.getDeveloperUrl()
    const callbackUrlDescription = this.getCallbackUrlDescription()
    const showGuideByDefault = this.getShowGuideByDefault()
    const validationErrorHelp = this.getValidationErrorHelp()

    // Return setup information only if at least one piece of information is available
    if (
      description ||
      guideSteps ||
      credentialLabels ||
      developerUrl ||
      callbackUrlDescription ||
      showGuideByDefault ||
      validationErrorHelp
    ) {
      return {
        description,
        guideSteps,
        credentialLabels,
        developerUrl,
        callbackUrlDescription,
        showGuideByDefault,
        validationErrorHelp
      }
    }
    return undefined
  }

  getSetupDescription(): string | undefined {
    return undefined
  }

  getSetupGuideSteps(): SetupGuideStep[] | undefined {
    return undefined
  }

  getCredentialLabels(): SetupCredentialLabels | undefined {
    return undefined
  }

  getDeveloperUrl(): string | undefined {
    const urls: Record<Platform, string> = {
      x: "https://developer.twitter.com/en/portal/dashboard",
      reddit: "https://www.reddit.com/prefs/apps",
      linkedin: "https://www.linkedin.com/developers/apps",
      facebook: "https://developers.facebook.com/apps",
      instagram: "https://developers.facebook.com/apps",
      youtube: "https://console.developers.google.com/",
      tiktok: "https://developers.tiktok.com/"
    }
    return urls[this.name] || undefined
  }

  getCallbackUrlDescription(): string | undefined {
    return undefined
  }

  getShowGuideByDefault(): boolean {
    return false
  }

  getValidationErrorHelp(): string[] | undefined {
    return undefined
  }

  getMaxCharacterLimit(): number | undefined {
    return undefined
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
      destinationPlaceholder: this.getDestinationPlaceholder(),
      requiredFields: this.getRequiredFields(),
      setupInformation: this.getSetupInformation(),
      maxCharacterLimit: this.getMaxCharacterLimit()
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
