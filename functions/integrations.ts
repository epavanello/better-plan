import { db } from "@/database/db"
import { integrations } from "@/database/schema/integrations"
import { getSessionOrThrow } from "@/lib/auth"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"
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
