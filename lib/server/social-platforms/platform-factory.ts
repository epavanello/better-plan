import type { Platform } from "@/database/schema/integrations"
import { BaseSocialPlatform } from "./base-platform"
import { XPlatform } from "./x-platform"
import { LinkedInPlatform } from "./linkedin-platform"

type PlatformConstructor = new () => BaseSocialPlatform

// Classe placeholder per piattaforme non ancora implementate
class NotImplementedPlatform extends BaseSocialPlatform {
    async validateCredentials(): Promise<boolean> {
        throw new Error(`${this.name} platform not yet implemented`)
    }

    async postContent(): Promise<import("./base-platform").PostResult> {
        throw new Error(`${this.name} platform not yet implemented`)
    }
}

// Registry delle piattaforme supportate
const PLATFORM_REGISTRY: Record<
    Platform,
    PlatformConstructor | { new (name: Platform): BaseSocialPlatform }
> = {
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
    },
    youtube: class extends NotImplementedPlatform {
        constructor() {
            super("youtube")
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
                PlatformFactory.getPlatform(platform)
                return true
            } catch {
                return false
            }
        }) as Platform[]
    }

    static getAllPlatforms(): Platform[] {
        return Object.keys(PLATFORM_REGISTRY) as Platform[]
    }
}
