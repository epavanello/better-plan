import { db } from "@/database/db"
import { type InsertPost, type PostMedia, postMedia, posts } from "@/database/schema"
import { PLATFORM_VALUES, type Platform } from "@/database/schema/integrations"
import { getSessionOrThrow } from "@/lib/auth"
import { getEffectiveCredentials, getIntegrationWithValidToken } from "@/lib/server/integrations"
import { postToSocialMedia } from "@/lib/server/post-service"
import { PostDestinationService } from "@/lib/server/posts/destination-service"
import { DestinationSchema } from "@/lib/server/social-platforms/base-platform"
import { PlatformFactory } from "@/lib/server/social-platforms/platform-factory"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq, sql } from "drizzle-orm"
import { ulid } from "ulid"
import { z } from "zod"

const createPostSchema = z.object({
  integrationId: z.string(),
  content: z.string(),
  scheduledAt: z.date().optional(),
  destination: DestinationSchema.optional(),
  additionalFields: z.record(z.string()).optional(),
  media: z
    .array(
      z.object({
        content: z.string(),
        mimeType: z.string()
      })
    )
    .optional()
})

export const createPost = createServerFn({ method: "POST" })
  .validator(createPostSchema)
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const destinationService = new PostDestinationService()

    // Use utility to get integration with valid token
    const integration = await getIntegrationWithValidToken(data.integrationId, session.user.id)

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
      id: ulid(),
      content: data.content,
      integrationId: data.integrationId,
      userId: session.user.id,
      status: data.scheduledAt ? "scheduled" : "draft",
      scheduledAt: data.scheduledAt,
      source: "native",
      // Add destination fields
      destinationType: data.destination?.type,
      destinationId: data.destination?.id,
      destinationName: data.destination?.name,
      destinationMetadata: data.destination?.metadata ? JSON.stringify(data.destination.metadata) : undefined,
      additionalFields: data.additionalFields ? JSON.stringify(data.additionalFields) : undefined
    }

    const result = await db.insert(posts).values(postData).returning()
    const post = result[0]

    let insertedMedia: PostMedia[] = []

    // Save media if provided
    if (data.media && data.media.length > 0) {
      const mediaToInsert = data.media.map((m) => ({
        postId: post.id,
        content: m.content,
        mimeType: m.mimeType
      }))
      insertedMedia = await db.insert(postMedia).values(mediaToInsert).returning()
    }

    // Save destination to recent destinations if provided
    if (data.destination) {
      await destinationService.saveRecentDestination(session.user.id, integration.platform, data.destination)
    }

    // If it's a draft, try to post immediately
    if (post.status === "draft") {
      try {
        await postToSocialMedia({
          id: post.id,
          content: post.content,
          userId: post.userId,
          destination: data.destination,
          additionalFields: data.additionalFields,
          media: insertedMedia.map((m) => ({
            content: m.content,
            mimeType: m.mimeType,
            id: m.id
          })),
          integration
        })
      } catch (error) {
        console.error("Failed to post immediately", error)
        await db
          .update(posts)
          .set({
            status: "failed",
            failReason: error instanceof Error ? error.message : "Unknown error"
          })
          .where(eq(posts.id, post.id))
        throw new Error("Failed to post to social media")
      }
    }

    return post
  })

export const getRecentDestinations = createServerFn({ method: "POST" })
  .validator((payload: { platform: Platform; limit?: number }) =>
    z.object({ platform: z.enum(PLATFORM_VALUES), limit: z.number().optional() }).parse(payload)
  )
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()
    const destinationService = new PostDestinationService()

    return await destinationService.getRecentDestinations(session.user.id, data.platform, data.limit || 10)
  })

export const createDestinationFromInput = createServerFn({ method: "POST" })
  .validator((payload: unknown) =>
    z
      .object({
        platform: z.enum(PLATFORM_VALUES),
        input: z.string().min(1),
        integrationId: z.string()
      })
      .parse(payload)
  )
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    // Use utility to get integration with valid token
    const integration = await getIntegrationWithValidToken(data.integrationId, session.user.id)

    // Verify platform matches
    if (integration.platform !== data.platform) {
      throw new Error("Platform mismatch")
    }

    // Get the platform implementation
    const platform = PlatformFactory.getPlatform(data.platform)

    // Create destination using platform-specific logic with enrichment
    const destination = await platform.createDestinationFromInput(data.input, integration.accessToken, integration.userId)

    return destination
  })

export const getPosts = createServerFn({ method: "GET" })
  .validator((payload: unknown) => z.object({ integrationId: z.string() }).parse(payload))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    // Use utility to get integration with valid token
    const integration = await getIntegrationWithValidToken(data.integrationId, session.user.id)

    const userPosts = await db.query.posts.findMany({
      where: and(eq(posts.userId, session.user.id), eq(posts.integrationId, data.integrationId)),
      with: {
        media: true
      },
      orderBy: [desc(posts.scheduledAt), desc(posts.postedAt)]
    })

    return userPosts.map((post) => ({
      ...post,
      integration: {
        id: integration.id,
        platform: integration.platform,
        platformAccountName: integration.platformAccountName,
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        expiresAt: integration.expiresAt
      }
    }))
  })

export const deletePost = createServerFn({ method: "POST" })
  .validator((payload: unknown) => {
    return z.object({ id: z.string() }).parse(payload)
  })
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    const [deletedPost] = await db
      .delete(posts)
      .where(and(eq(posts.id, data.id), eq(posts.userId, session.user.id)))
      .returning()

    if (!deletedPost) {
      throw new Error("Post not found or not authorized to delete")
    }

    return deletedPost
  })

export const fetchRecentSocialPosts = createServerFn({ method: "POST" })
  .validator((payload: { integrationId: string }) => z.object({ integrationId: z.string() }).parse(payload))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    // Use utility to get integration with valid token
    const integration = await getIntegrationWithValidToken(data.integrationId, session.user.id)

    const platform = PlatformFactory.getPlatform(integration.platform)

    if (!platform.supportsFetchingRecentPosts()) {
      throw new Error("This platform does not support fetching recent posts.")
    }

    if (!integration.accessToken) {
      throw new Error("Integration is not properly configured.")
    }

    // Get credentials for platform operations
    const credentials = await getEffectiveCredentials(integration.platform, session.user.id)

    if (!credentials) {
      throw new Error("Integration is not properly configured.")
    }

    const recentPosts = await platform.fetchRecentPosts(integration.accessToken, credentials)

    if (recentPosts.length === 0) {
      return { message: "No new posts to import." }
    }

    // Get existing posts for this integration to check for duplicates
    const existingPosts = await db
      .select({
        content: posts.content,
        postUrl: posts.postUrl
      })
      .from(posts)
      .where(and(eq(posts.integrationId, integration.id), eq(posts.userId, session.user.id), eq(posts.status, "posted")))

    // Create a set of existing content and URLs for fast lookup
    const existingContentSet = new Set(existingPosts.map((p) => p.content))
    const existingUrlSet = new Set(existingPosts.map((p) => p.postUrl).filter(Boolean))

    // Filter out posts that already exist (by content or URL)
    const newPosts = recentPosts.filter((post) => {
      const isDuplicateContent = existingContentSet.has(post.content)
      const isDuplicateUrl = post.postUrl && existingUrlSet.has(post.postUrl)
      return !isDuplicateContent && !isDuplicateUrl
    })

    if (newPosts.length === 0) {
      return { message: "No new posts to import. All recent posts already exist in the system." }
    }

    const postToUpsert = newPosts.map((p) => ({
      ...p,
      integrationId: integration.id,
      userId: session.user.id
    }))

    await db
      .insert(posts)
      .values(postToUpsert)
      .onConflictDoUpdate({
        target: [posts.id],
        set: {
          content: sql.raw(`excluded.${posts.content.name}`),
          source: sql.raw(`excluded.${posts.source.name}`),
          postUrl: sql.raw(`excluded.${posts.postUrl.name}`),
          status: sql.raw(`excluded.${posts.status.name}`),
          createdAt: sql.raw(`excluded.${posts.createdAt.name}`),
          postedAt: sql.raw(`excluded.${posts.postedAt.name}`),
          updatedAt: new Date(),
          scheduledAt: null,
          failCount: 0,
          failReason: null
        }
      })

    return {
      message: `${newPosts.length} new posts imported successfully. ${recentPosts.length - newPosts.length} duplicates were skipped.`
    }
  })
