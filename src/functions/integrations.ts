import { db } from "@/database/db"
import { type Platform, integrations, userAppCredentials } from "@/database/schema/integrations"
import { getSessionOrThrow } from "@/lib/auth"
import { getPlatformCredentialsInfo, getUserCredentialsInfo, validatePlatformCredentials } from "@/lib/server/integrations"
import { PlatformFactory } from "@/lib/server/social-platforms/platform-factory"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"
import { ulid } from "ulid"
import { z } from "zod"

export const getIntegrations = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getSessionOrThrow()
  const userIntegrations = await db.select().from(integrations).where(eq(integrations.userId, session.user.id))

  return userIntegrations.map((i) => {
    const platform = PlatformFactory.getPlatform(i.platform)
    return {
      id: i.id,
      platform: i.platform,
      platformAccountId: i.platformAccountId,
      platformAccountName: i.platformAccountName,
      expiresAt: i.expiresAt,
      userId: i.userId,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      supportsFetchingRecentPosts: platform.supportsFetchingRecentPosts()
    }
  })
})

export const deleteIntegration = createServerFn({ method: "POST" })
  .validator((payload: string) => z.string().parse(payload))
  .handler(async ({ data: integrationId }) => {
    const session = await getSessionOrThrow()

    await db.delete(integrations).where(and(eq(integrations.id, integrationId), eq(integrations.userId, session.user.id)))

    return { success: true }
  })

// Funzione per verificare se una piattaforma necessita di credenziali utente
export const getPlatformRequiresUserCredentials = createServerFn({ method: "GET" })
  .validator((payload: Platform) => z.enum(["x", "reddit", "instagram", "tiktok", "youtube", "facebook", "linkedin"]).parse(payload))
  .handler(async ({ data: platform }) => {
    return await getPlatformCredentialsInfo(platform)
  })

// Funzione per ottenere lo stato completo delle credenziali utente per una piattaforma
export const getUserPlatformStatus = createServerFn({ method: "GET" })
  .validator((payload: Platform) => z.enum(["x", "reddit", "instagram", "tiktok", "youtube", "facebook", "linkedin"]).parse(payload))
  .handler(async ({ data: platform }) => {
    const session = await getSessionOrThrow()
    const userInfo = await getUserCredentialsInfo(platform, session.user.id)
    const platformInfo = await getPlatformCredentialsInfo(platform)

    return {
      ...userInfo,
      redirectUrl: platformInfo.redirectUrl
    }
  })

// Funzione per ottenere le credenziali utente per una piattaforma (solo se necessarie)
export const getUserAppCredentials = createServerFn({ method: "GET" })
  .validator((payload: Platform) => z.enum(["x", "reddit", "instagram", "tiktok", "youtube", "facebook", "linkedin"]).parse(payload))
  .handler(async ({ data: platform }) => {
    const session = await getSessionOrThrow()
    const userInfo = await getUserCredentialsInfo(platform, session.user.id)

    // Se usa credenziali di sistema, non restituire le credenziali utente
    if (userInfo.source === "system") {
      return null
    }

    if (userInfo.hasCredentials && userInfo.source === "user") {
      const credentials = await db
        .select()
        .from(userAppCredentials)
        .where(and(eq(userAppCredentials.userId, session.user.id), eq(userAppCredentials.platform, platform)))
        .limit(1)

      if (credentials[0]) {
        // Return only non-sensitive data
        return {
          id: credentials[0].id,
          platform: credentials[0].platform,
          clientId: credentials[0].clientId,
          userId: credentials[0].userId,
          createdAt: credentials[0].createdAt,
          updatedAt: credentials[0].updatedAt
        }
      }
    }

    return null
  })

export const saveUserAppCredentials = createServerFn({ method: "POST" })
  .validator(
    z.object({
      platform: z.enum(["x", "reddit", "instagram", "tiktok", "youtube", "facebook", "linkedin"]),
      clientId: z.string().min(1),
      clientSecret: z.string().min(1)
    })
  )
  .handler(async ({ data: { platform, clientId, clientSecret } }) => {
    const session = await getSessionOrThrow()

    const validation = await validatePlatformCredentials(platform, clientId, clientSecret)

    if (!validation.valid) {
      throw new Error(`Invalid credentials: ${validation.error || "Unknown error"}`)
    }

    // Controlla se esistono già credenziali per questa piattaforma
    const existing = await db
      .select()
      .from(userAppCredentials)
      .where(and(eq(userAppCredentials.userId, session.user.id), eq(userAppCredentials.platform, platform)))
      .limit(1)

    if (existing[0]) {
      // Aggiorna le credenziali esistenti
      await db
        .update(userAppCredentials)
        .set({
          clientId,
          clientSecret,
          updatedAt: new Date()
        })
        .where(eq(userAppCredentials.id, existing[0].id))
    } else {
      // Crea nuove credenziali
      await db.insert(userAppCredentials).values({
        id: ulid(),
        platform,
        clientId,
        clientSecret,
        userId: session.user.id
      })
    }

    return { success: true }
  })

// Funzione per eliminare le credenziali utente
export const deleteUserAppCredentials = createServerFn({ method: "POST" })
  .validator((payload: Platform) => z.enum(["x", "reddit", "instagram", "tiktok", "youtube", "facebook", "linkedin"]).parse(payload))
  .handler(async ({ data: platform }) => {
    const session = await getSessionOrThrow()

    await db
      .delete(userAppCredentials)
      .where(and(eq(userAppCredentials.userId, session.user.id), eq(userAppCredentials.platform, platform)))

    return { success: true }
  })
