import { db } from "@/database/db"
import { type InsertPost, insertPostSchema, posts } from "@/database/schema"
import { integrations } from "@/database/schema/integrations"
import { getSessionOrThrow } from "@/lib/auth"
import { getEffectiveCredentials } from "@/lib/server/integrations"
import { postToSocialMedia } from "@/lib/server/post-service"
import { PlatformFactory } from "@/lib/server/social-platforms/platform-factory"
import { createServerFn } from "@tanstack/react-start"
import { and, desc, eq, sql } from "drizzle-orm"
import { z } from "zod"

export const createPost = createServerFn({ method: "POST" })
  .validator((payload: Omit<InsertPost, "userId">) => insertPostSchema.omit({ userId: true }).parse(payload))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    const [post] = await db
      .insert(posts)
      .values({
        ...data,
        userId: session.user.id,
        status: data.scheduledAt ? "scheduled" : "draft"
      })
      .returning()

    if (post.status === "draft") {
      const [integration] = await db.select().from(integrations).where(eq(integrations.id, post.integrationId))

      if (!integration) {
        throw new Error("Integration not found")
      }

      try {
        await postToSocialMedia({
          id: post.id,
          content: post.content,
          userId: post.userId,
          integration: {
            id: integration.id,
            platform: integration.platform,
            platformAccountId: integration.platformAccountId,
            platformAccountName: integration.platformAccountName,
            accessToken: integration.accessToken
          }
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

export const getPosts = createServerFn({ method: "GET" })
  .validator((payload: unknown) => z.object({ integrationId: z.string() }).parse(payload))
  .handler(async ({ data }) => {
    const session = await getSessionOrThrow()

    const userPosts = await db.query.posts.findMany({
      where: and(eq(posts.userId, session.user.id), eq(posts.integrationId, data.integrationId)),
      with: {
        integration: true
      },
      orderBy: [desc(posts.createdAt)]
    })
    return userPosts
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

    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.id, data.integrationId), eq(integrations.userId, session.user.id)))

    if (!integration) {
      throw new Error("Integration not found")
    }

    const platform = PlatformFactory.getPlatform(integration.platform)

    if (!platform.supportsFetchingRecentPosts()) {
      throw new Error("This platform does not support fetching recent posts.")
    }

    if (!integration.accessToken) {
      throw new Error("Integration is not properly configured.")
    }

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
      .where(and(
        eq(posts.integrationId, integration.id),
        eq(posts.userId, session.user.id),
        eq(posts.status, "posted")
      ))

    // Create a set of existing content and URLs for fast lookup
    const existingContentSet = new Set(existingPosts.map(p => p.content))
    const existingUrlSet = new Set(existingPosts.map(p => p.postUrl).filter(Boolean))

    // Filter out posts that already exist (by content or URL)
    const newPosts = recentPosts.filter(post => {
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

    return { message: `${newPosts.length} new posts imported successfully. ${recentPosts.length - newPosts.length} duplicates were skipped.` }
  })
