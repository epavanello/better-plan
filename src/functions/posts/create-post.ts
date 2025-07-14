import { db } from "@/database/db"
import { type InsertPost, posts, postDestinations } from "@/database/schema"
import { integrations } from "@/database/schema/integrations"
import { getSessionOrThrow } from "@/lib/auth"
import { postToSocialMedia } from "@/lib/server/post-service"
import type { PostDestination } from "@/lib/server/social-platforms/base-platform"
import { PlatformFactory } from "@/lib/server/social-platforms/platform-factory"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

const createPostSchema = z.object({
  integrationId: z.string(),
  content: z.string(),
  scheduledAt: z.date().optional(),
  destination: z
    .object({
      type: z.string(),
      id: z.string(),
      name: z.string(),
      metadata: z.record(z.any()).optional(),
      description: z.string().optional()
    })
    .optional(),
  additionalFields: z.record(z.string()).optional()
})

export const createPost = createServerFn({ method: "POST" })
  .validator(createPostSchema)
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    const integration = await db.query.integrations.findFirst({
      where: (integrations, { eq, and }) => and(eq(integrations.id, data.integrationId), eq(integrations.userId, session.user.id))
    })

    if (!integration) {
      throw new Error("Integration not found")
    }

    const platform = PlatformFactory.getPlatform(integration.platform)
    if (!platform) {
      throw new Error(`Platform ${integration.platform} not found`)
    }

    // Validate destination if provided
    if (data.destination && platform.supportsDestinations()) {
      // We might validate the destination here in the future
      // For now, we'll validate it at post time
    }

    const postData: InsertPost = {
      id: crypto.randomUUID(),
      userId: session.user.id,
      integrationId: data.integrationId,
      content: data.content,
      scheduledAt: data.scheduledAt,
      status: data.scheduledAt ? "scheduled" : "draft",
      source: "native",
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const [newPost] = await db.insert(posts).values(postData).returning()

    // Store destination if provided
    if (data.destination) {
      await db.insert(postDestinations).values({
        userId: session.user.id,
        platform: integration.platform,
        destinationType: data.destination.type,
        destinationId: data.destination.id,
        destinationName: data.destination.name,
        destinationMetadata: data.destination.metadata ? JSON.stringify(data.destination.metadata) : null,
        lastUsedAt: new Date()
      })
    }

    // If not scheduled, post immediately
    if (!data.scheduledAt) {
      await postToSocialMedia({
        id: newPost.id,
        content: data.content,
        userId: session.user.id,
        integrationId: data.integrationId,
        destination: data.destination,
        additionalFields: data.additionalFields,
        platform: integration.platform
      })
    }

    return newPost
  })