import { db } from "@/database/db"
import { postDestinations } from "@/database/schema"
import { PLATFORM_VALUES, type Platform, integrations } from "@/database/schema/integrations"
import { getSessionOrThrow } from "@/lib/auth"
import { PlatformFactory } from "@/lib/server/social-platforms/platform-factory"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

const getRecentDestinationsSchema = z.object({
  platform: z.enum(PLATFORM_VALUES),
  limit: z.number().min(1).max(50).default(10)
})

export const getRecentDestinations = createServerFn({ method: "POST" })
  .validator(getRecentDestinationsSchema)
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    const recentDestinations = await db.query.postDestinations.findMany({
      where: (postDestinations, { eq, and }) =>
        and(eq(postDestinations.userId, session.user.id), eq(postDestinations.platform, data.platform)),
      orderBy: (postDestinations, { desc }) => desc(postDestinations.lastUsedAt),
      limit: data.limit || 10
    })

    return recentDestinations.map((dest) => {
      let metadata: Record<string, unknown> | undefined
      try {
        metadata = dest.destinationMetadata ? JSON.parse(dest.destinationMetadata) : undefined
      } catch {
        metadata = undefined
      }

      return {
        type: dest.destinationType,
        id: dest.destinationId,
        name: dest.destinationName,
        description: metadata?.description as string | undefined
      }
    })
  })

const createDestinationFromInputSchema = z.object({
  platform: z.enum(PLATFORM_VALUES),
  input: z.string().min(1),
  integrationId: z.string()
})

export const createDestinationFromInput = createServerFn({ method: "POST" })
  .validator(createDestinationFromInputSchema)
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    // Get the integration with access token
    const integration = await db.query.integrations.findFirst({
      where: (integrations, { eq, and }) =>
        and(eq(integrations.id, data.integrationId), eq(integrations.userId, session.user.id), eq(integrations.platform, data.platform))
    })

    if (!integration) {
      throw new Error("Integration not found")
    }

    // Get the platform implementation
    const platform = PlatformFactory.getPlatform(data.platform)

    // Create destination using platform-specific logic with enrichment
    const destination = await platform.createDestinationFromInput(data.input, integration.accessToken, integration.userId)

    return destination
  })