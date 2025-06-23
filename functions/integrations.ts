import { db } from "@/database/db"
import { type Platform, integrations, userAppCredentials } from "@/database/schema/integrations"
import { getSessionOrThrow } from "@/lib/auth"
import { envConfig } from "@/lib/env"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"
import { ulid } from "ulid"
import { z } from "zod"

export const getIntegrations = createServerFn({ method: "GET" }).handler(async () => {
    const session = await getSessionOrThrow()
    return db.select().from(integrations).where(eq(integrations.userId, session.user.id))
})

export const deleteIntegration = createServerFn({ method: "POST" })
    .validator((payload: string) => z.string().parse(payload))
    .handler(async ({ data: integrationId }) => {
        const session = await getSessionOrThrow()

        await db
            .delete(integrations)
            .where(
                and(eq(integrations.id, integrationId), eq(integrations.userId, session.user.id))
            )

        return { success: true }
    })

// Funzione per verificare se una piattaforma necessita di credenziali utente
export const getPlatformRequiresUserCredentials = createServerFn({ method: "GET" })
    .validator((payload: Platform) =>
        z
            .enum(["x", "reddit", "instagram", "tiktok", "youtube", "facebook", "linkedin"])
            .parse(payload)
    )
    .handler(async ({ data: platform }) => {
        // Controlla se le credenziali di sistema sono disponibili per questa piattaforma
        switch (platform) {
            case "x":
                return {
                    requiresUserCredentials: !envConfig.X_CLIENT_ID || !envConfig.X_CLIENT_SECRET,
                    redirectUrl: `${envConfig.APP_URL}/api/auth/x/callback`
                }
            // Aggiungi altri casi per altre piattaforme qui
            default:
                return { requiresUserCredentials: false, redirectUrl: null }
        }
    })

// Funzione per ottenere le credenziali utente per una piattaforma
export const getUserAppCredentials = createServerFn({ method: "GET" })
    .validator((payload: Platform) =>
        z
            .enum(["x", "reddit", "instagram", "tiktok", "youtube", "facebook", "linkedin"])
            .parse(payload)
    )
    .handler(async ({ data: platform }) => {
        const session = await getSessionOrThrow()

        const credentials = await db
            .select()
            .from(userAppCredentials)
            .where(
                and(
                    eq(userAppCredentials.userId, session.user.id),
                    eq(userAppCredentials.platform, platform)
                )
            )
            .limit(1)

        return credentials[0] || null
    })

// Funzione per salvare le credenziali utente
export const saveUserAppCredentials = createServerFn({ method: "POST" })
    .validator(
        z.object({
            platform: z.enum([
                "x",
                "reddit",
                "instagram",
                "tiktok",
                "youtube",
                "facebook",
                "linkedin"
            ]),
            clientId: z.string().min(1),
            clientSecret: z.string().min(1)
        })
    )
    .handler(async ({ data: { platform, clientId, clientSecret } }) => {
        const session = await getSessionOrThrow()

        // Controlla se esistono già credenziali per questa piattaforma
        const existing = await db
            .select()
            .from(userAppCredentials)
            .where(
                and(
                    eq(userAppCredentials.userId, session.user.id),
                    eq(userAppCredentials.platform, platform)
                )
            )
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
    .validator((payload: Platform) =>
        z
            .enum(["x", "reddit", "instagram", "tiktok", "youtube", "facebook", "linkedin"])
            .parse(payload)
    )
    .handler(async ({ data: platform }) => {
        const session = await getSessionOrThrow()

        await db
            .delete(userAppCredentials)
            .where(
                and(
                    eq(userAppCredentials.userId, session.user.id),
                    eq(userAppCredentials.platform, platform)
                )
            )

        return { success: true }
    })
