import { db } from "@/database/db"
import { integrations } from "@/database/schema/integrations"
import { getSessionOrThrow } from "@/lib/auth"
import { PlatformFactory } from "@/lib/server/social-platforms/platform-factory"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const getIntegrations = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getSessionOrThrow()
  const userIntegrations = await db.select().from(integrations).where(eq(integrations.userId, session.user.id))

  return userIntegrations.map((i) => {
    const platform = PlatformFactory.getPlatform(i.platform)
    return {
      ...i,
      supportsFetchingRecentPosts: platform.supportsFetchingRecentPosts()
    }
  })
})

const deleteIntegrationSchema = z.string()

export const deleteIntegration = createServerFn({ method: "POST" })
  .validator(deleteIntegrationSchema)
  .handler(async ({ data: integrationId }) => {
    const session = await getSessionOrThrow()

    await db.delete(integrations).where(and(eq(integrations.id, integrationId), eq(integrations.userId, session.user.id)))

    return { success: true }
  })