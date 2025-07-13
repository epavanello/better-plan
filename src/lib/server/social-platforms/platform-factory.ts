import type { Platform } from "@/database/schema/integrations"
import { BaseSocialPlatform, type PlatformInfo } from "./base-platform"
import { LinkedInPlatform } from "./linkedin-platform"
import { XPlatform } from "./x-platform"

type PlatformConstructor = new () => BaseSocialPlatform

// Classe placeholder per piattaforme non ancora implementate
class NotImplementedPlatform extends BaseSocialPlatform {
  async validateCredentials(): Promise<boolean> {
    throw new Error(`${this.name} platform not yet implemented`)
  }

  async postContent(): Promise<import("./base-platform").PostResult> {
    throw new Error(`${this.name} platform not yet implemented`)
  }

  isImplemented(): boolean {
    return false
  }

  getDisplayName(): string {
    // Capitalizza la prima lettera di ogni parola
    return this.name
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }
}

// Registry delle piattaforme supportate
const PLATFORM_REGISTRY: Record<Platform, PlatformConstructor | { new (name: Platform): BaseSocialPlatform }> = {
  x: XPlatform,
  reddit: class extends NotImplementedPlatform {
    constructor() {
      super("reddit")
    }
  },
  instagram: class extends NotImplementedPlatform {
    constructor() {
      super("instagram")
    }
  },
  tiktok: class extends NotImplementedPlatform {
    constructor() {
      super("tiktok")
    }
    getDisplayName(): string {
      return "TikTok"
    }
  },
  youtube: class extends NotImplementedPlatform {
    constructor() {
      super("youtube")
    }
    getDisplayName(): string {
      return "YouTube"
    }
  },
  facebook: class extends NotImplementedPlatform {
    constructor() {
      super("facebook")
    }
  },
  linkedin: LinkedInPlatform
}

export class PlatformFactory {
  private static platforms: Map<Platform, BaseSocialPlatform> = new Map()

  static getPlatform(platform: Platform): BaseSocialPlatform {
    if (!PlatformFactory.isPlatformSupported(platform)) {
      throw new Error(`Platform ${platform} is not defined in the system`)
    }

    if (!PlatformFactory.platforms.has(platform)) {
      const PlatformClass = PLATFORM_REGISTRY[platform]
      try {
        PlatformFactory.platforms.set(platform, new PlatformClass(platform))
      } catch (error) {
        throw new Error(`Platform ${platform} is not yet implemented`)
      }
    }

    return PlatformFactory.platforms.get(platform)!
  }

  static isPlatformSupported(platform: string): platform is Platform {
    return Object.keys(PLATFORM_REGISTRY).includes(platform)
  }

  static getImplementedPlatforms(): Platform[] {
    return Object.keys(PLATFORM_REGISTRY).filter((platform: Platform) => {
      try {
        const platformInstance = PlatformFactory.getPlatform(platform)
        return platformInstance.isImplemented()
      } catch {
        return false
      }
    }) as Platform[]
  }

  static getAllPlatforms(): Platform[] {
    return Object.keys(PLATFORM_REGISTRY) as Platform[]
  }

  static getAllPlatformInfo(): PlatformInfo[] {
    return PlatformFactory.getAllPlatforms().map((platform) => {
      try {
        const platformInstance = PlatformFactory.getPlatform(platform)
        return {
          name: platform,
          displayName: platformInstance.getDisplayName(),
          requiresSetup: platformInstance.requiresSetup(),
          isImplemented: platformInstance.isImplemented()
        }
      } catch {
        return {
          name: platform,
          displayName: platform.charAt(0).toUpperCase() + platform.slice(1),
          requiresSetup: false,
          isImplemented: false
        }
      }
    })
  }

  // Metodo per ottenere informazioni di una singola piattaforma
  static getPlatformInfo(platform: Platform): PlatformInfo {
    try {
      const platformInstance = PlatformFactory.getPlatform(platform)
      return {
        destinationRequired: platformInstance.requiresDestination(),
        supportsDestinations: platformInstance.supportsDestinations(),
        destinationHelpText: platformInstance.getDestinationHelpText(),
        destinationPlaceholder: platformInstance.getDestinationPlaceholder(),
        name: platform,
        displayName: platformInstance.getDisplayName(),
        requiresSetup: platformInstance.requiresSetup(),
        isImplemented: platformInstance.isImplemented()
      }
    } catch {
      return {
        destinationRequired: false,
        supportsDestinations: false,
        destinationHelpText: undefined,
        destinationPlaceholder: undefined,
        name: platform,
        displayName: platform.charAt(0).toUpperCase() + platform.slice(1),
        requiresSetup: false,
        isImplemented: false
      }
    }
  }
}
