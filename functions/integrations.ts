import { db } from "@/database/db"
import { integrations } from "@/integrations-schema"
import { auth } from "@/lib/auth"
import { createServerFn } from "@tanstack/react-start"
import { getWebRequest } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"

import { z } from "zod"

const Person = z.object({
    name: z.string()
})

export const getIntegrations = createServerFn({ method: "GET" }).handler(async () => {
    const headers = getWebRequest()?.headers
    if (!headers) {
        throw new Error("No headers")
    }
    const session = await auth.api.getSession({
        query: {
            disableCookieCache: true
        },
        headers
    })

    return db.select().from(integrations).where(eq(integrations.userId, session!.user.id))
})
