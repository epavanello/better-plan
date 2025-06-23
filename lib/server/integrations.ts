import { type Platform, userAppCredentials } from "@/database/schema"
import { envConfig } from "../env"
import { db } from "@/database/db"
import { and, eq } from "drizzle-orm"

// Funzione helper per ottenere le credenziali (sistema o utente) per una piattaforma
export const getEffectiveCredentials = async (platform: Platform, userId: string) => {
    // Prima controlla le credenziali di sistema
    switch (platform) {
        case "x":
            if (envConfig.X_CLIENT_ID && envConfig.X_CLIENT_SECRET) {
                return {
                    clientId: envConfig.X_CLIENT_ID,
                    clientSecret: envConfig.X_CLIENT_SECRET,
                    source: "system" as const
                }
            }
            break
        // Aggiungi altri casi qui per altre piattaforme
    }

    // Se non ci sono credenziali di sistema, cerca quelle dell'utente
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
