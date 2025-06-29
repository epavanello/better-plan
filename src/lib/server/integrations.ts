import { db } from "@/database/db"
import { type Platform, userAppCredentials } from "@/database/schema"
import { and, eq } from "drizzle-orm"
import { envConfig } from "../env"

export const getSystemCredentials = async (platform: Platform) => {
    switch (platform) {
        case "x":
            return {
                clientId: envConfig.X_CLIENT_ID,
                clientSecret: envConfig.X_CLIENT_SECRET
            }
        default:
            return null
    }
}

export const getEffectiveCredentials = async (platform: Platform, userId: string) => {
    const systemCredentials = await getSystemCredentials(platform)
    if (systemCredentials?.clientId && systemCredentials?.clientSecret) {
        return {
            clientId: systemCredentials.clientId,
            clientSecret: systemCredentials.clientSecret,
            source: "system" as const
        }
    }

    const userCredentials = await db
        .select()
        .from(userAppCredentials)
        .where(
            and(eq(userAppCredentials.userId, userId), eq(userAppCredentials.platform, platform))
        )
        .limit(1)

    if (userCredentials[0]) {
        return {
            clientId: userCredentials[0].clientId,
            clientSecret: userCredentials[0].clientSecret,
            source: "user" as const
        }
    }

    return null
}

export const validatePlatformCredentials = async (
    platform: Platform,
    clientId: string,
    clientSecret: string
): Promise<{ valid: boolean; error?: string }> => {
    try {
        switch (platform) {
            case "x": {
                const { TwitterApi } = await import("twitter-api-v2")

                const client = new TwitterApi({
                    appKey: clientId,
                    appSecret: clientSecret
                })

                const callbackUrl = `${envConfig.APP_URL}/api/integrations/x/callback`
                await client.generateAuthLink(callbackUrl, {
                    authAccessType: "write",
                    linkMode: "authenticate"
                })

                return { valid: true }
            }
            default:
                return { valid: false, error: "Platform not supported for validation" }
        }
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : "Invalid credentials"
        }
    }
}

// Determina se una piattaforma richiede credenziali utente
export const getPlatformCredentialsInfo = async (platform: Platform) => {
    const systemCredentials = await getSystemCredentials(platform)
    const hasSystemCredentials = !!(systemCredentials?.clientId && systemCredentials?.clientSecret)

    switch (platform) {
        case "x":
            return {
                requiresUserCredentials: !hasSystemCredentials,
                hasSystemCredentials,
                redirectUrl: `${envConfig.APP_URL}/api/integrations/x/callback`
            }
        default:
            return {
                requiresUserCredentials: false,
                hasSystemCredentials: false,
                redirectUrl: null
            }
    }
}

// Verifica se un utente ha credenziali configurate per una piattaforma
export const getUserCredentialsInfo = async (platform: Platform, userId: string) => {
    const platformInfo = await getPlatformCredentialsInfo(platform)

    // Se ci sono credenziali di sistema, non servono quelle utente
    if (platformInfo.hasSystemCredentials) {
        return {
            hasCredentials: true,
            requiresSetup: false,
            canConnect: true,
            source: "system" as const
        }
    }

    // Se richiede credenziali utente, controlla se le ha
    if (platformInfo.requiresUserCredentials) {
        const userCredentials = await db
            .select()
            .from(userAppCredentials)
            .where(
                and(
                    eq(userAppCredentials.userId, userId),
                    eq(userAppCredentials.platform, platform)
                )
            )
            .limit(1)

        const hasUserCredentials = !!userCredentials[0]

        return {
            hasCredentials: hasUserCredentials,
            requiresSetup: true,
            canConnect: hasUserCredentials,
            source: hasUserCredentials ? ("user" as const) : null
        }
    }

    // Piattaforma non supportata o non configurata
    return {
        hasCredentials: false,
        requiresSetup: false,
        canConnect: false,
        source: null
    }
}
